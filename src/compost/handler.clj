(ns compost.handler
  (:use compojure.core)
  (:require
   [cemerick.friend :as friend]
   [cemerick.friend.credentials :as creds]
   [compojure.handler :as handler]
   [compojure.route :as route]
   [compost.auth :as auth]
   [compost.resources :as r :refer [defresource]]
   [liberator.core :as lb]
   [monger.collection :as mc]
   [monger.operators :refer :all]
   [ring.middleware.json :refer [wrap-json-response wrap-json-body]]
   [ring.util.response :as resp]
   [schema.core :as s])
  (:import [org.bson.types ObjectId]))

(def Food {(s/optional-key :_id) (s/named ObjectId "The ID of this food")
           :name (s/named String "The name of this food")
           :created (s/named String "The ISO date that this food was created on")
           :expires (s/named String "The ISO date that this food expires on")
           :owner (s/named String "The owner of this food")
           :status (s/named String "The current status - active, eaten, trashed")
           (s/optional-key :frozen?) (s/named Boolean "Whether this food is frozen")
           (s/optional-key :thaw-ttl-days)
           (s/named Number "How long this food will last when thawed, in days")})

(def User {(s/optional-key :_id) (s/named String "The user's id")
           :email (s/named String "The user's email address")})

(defn sanitize-db-object [obj]
  "Sanitize a database object by replacing MongoDB IDs with strings."
  (let [id (str (:_id obj))]
    (assoc (dissoc obj :_id) :id id)))

(defn sanitize-input [input]
  (let [input-id (:id input)
        id (when input-id (ObjectId. input-id))]
    (if id
      (assoc (dissoc input :id) :_id id)
      (dissoc input :id))))

(defresource user-resource
  :base r/authenticated-base
  :available-media-types ["application/json"]
  :allowed-methods [:post :get]
  :exists? (fn [ctx]
             (let [auth (friend/current-authentication (:request ctx))]
               (when-let [user (first (mc/find-maps "users" {:email (:identity auth)}))]
                 {::data (sanitize-db-object user)
                  ::id (:identity auth)})))
  :handle-ok ::data
  :post! (fn [ctx]
           (let [user (s/validate
                       User
                       (sanitize-input (get-in ctx [:request :body])))
                 auth (friend/current-authentication (:request ctx))]
             ;; TODO Replace this with malformed? decision point
             (assert (= (:identity auth) (:email user)))
             {::data (sanitize-db-object
                      (mc/insert-and-return "users" user))}))
  :post-redirect? (fn [ctx]
                    {:location (format "/api/v1/people/me")}))

(defresource user-foods-resource
  :base r/authenticated-base
  :available-media-types ["application/json"]
  :allowed-methods [:post :get]
  :handle-ok (fn [ctx]
               (let [auth (friend/current-authentication (:request ctx))]
                 (map sanitize-db-object (mc/find-maps "foods" {:owner (:identity auth)}))))
  :post! (fn [ctx]
           (let [food (s/validate
                       Food
                       (sanitize-input (get-in ctx [:request :body])))]
             {::data (sanitize-db-object
                      (mc/insert-and-return "foods" food))}))
  :post-redirect? (fn [ctx]
                    {:location
                     (format "/api/v1/people/me/foods/%s" (:id (::data ctx)))}))

(defresource food-resource [food-id]
  :base r/authenticated-base
  :available-media-types ["application/json"]
  :allowed-methods [:get :delete :post]
  :exists? (fn [_]
             (println "Looking up food" food-id)
             (when-let [d (mc/find-map-by-id "foods" (ObjectId. food-id))]
               {::data (sanitize-db-object d)
                ::id food-id}))
  :post! (fn [ctx]
           (let [food (s/validate
                       Food
                       (sanitize-input (get-in ctx [:request :body])))]
             (mc/update-by-id "foods" (:_id food) food)
             {::data (sanitize-db-object food)}))
  :post-redirect? (fn [ctx]
                    {:location
                     (format "/api/v1/people/me/foods/%s" (:id (::data ctx)))})
  :delete! (fn [ctx] (mc/remove-by-id "foods" (ObjectId. food-id)))
  :handle-ok ::data)

(defresource food-search-resource
  :base r/authenticated-base
  :available-media-types ["application/json"]
  :allowed-methods [:get]
  :handle-ok (fn [ctx]
               (let [params (:query-params (:request ctx))
                     auth (friend/current-authentication (:request ctx))]
                 (if-let [query (get params "q")]
                   (map sanitize-db-object
                        (mc/find-maps "foods" {:name {$regex (str ".*" query ".*")}
                                               :owner (:identity auth)}))))))

(defroutes app-routes
  (ANY "/api/v1/people/me" [] user-resource)
  (ANY "/api/v1/people/me/foods" [] user-foods-resource)
  (ANY "/api/v1/people/me/foods/search" [] food-search-resource)
  (ANY "/api/v1/people/me/foods/:food-id" [food-id] (food-resource food-id))
  (GET "/" [] (resp/resource-response "index.html" {:root "public"}))
  (route/resources "/")
  (route/not-found (resp/resource-response "404.html" {:root "public"})))

(defn logging-middleware [handler]
  (let [requests (atom 0)]
    (fn [request]
      (let [request-id (swap! requests inc)
            start-time (System/currentTimeMillis)]
        (println "REQUEST" request-id (pr-str request))
        (let [response (handler request)]
          (println "RESPONSE" request-id
                   (str "[" (- (System/currentTimeMillis) start-time) "ms]")
                   (pr-str response))
          response)))))

(def app (-> app-routes
             (auth/friend-middleware users)
             (wrap-json-response)
             (wrap-json-body {:keywords? true})
             (handler/api)
             (logging-middleware)))
