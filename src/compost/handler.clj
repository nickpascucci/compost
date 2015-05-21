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
   [ring.middleware.json :refer [wrap-json-response wrap-json-body]]
   [ring.util.response :as resp]
   [schema.core :as s])
  (:import [org.bson.types ObjectId]))

(def Food {(s/optional-key :_id) (s/named String "The ID of this food")
           :name (s/named String "The name of this food")
           :created (s/named String "The ISO date that this food was created on")
           :expires (s/named String "The ISO date that this food expires on")})

(defn sanitize-db-object [obj]
  "Sanitize a database object by replacing MongoDB IDs with strings."
  (let [id (str (:_id obj))]
    (assoc (dissoc obj :_id) :id id)))

(defn sanitize-input [input]
  (dissoc input :id))

(def users
  "dummy in-memory user database."
  {"root" {:username "root"
           :password (creds/hash-bcrypt "admin_password")
           :roles #{:admin}}
   "jane" {:username "jane"
           :password (creds/hash-bcrypt "user_password")
           :roles #{:user}}})

(defresource user-foods-resource
  :base r/authenticated-base
  :available-media-types ["application/json"]
  :allowed-methods [:post :get]
  :handle-ok (fn [ctx] (map sanitize-db-object (mc/find-maps "foods")))
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
  :allowed-methods [:get :delete]
  :exists? (fn [_]
             (println "Looking up food" food-id)
             (when-let [d (mc/find-map-by-id "foods" (ObjectId. food-id))]
               {::data (sanitize-db-object d)
                ::id food-id}))
  :delete! (fn [ctx] (mc/remove-by-id "foods" (ObjectId. food-id)))
  :handle-ok ::data)

(defroutes app-routes
  (ANY "/api/v1/people/me/foods" [] user-foods-resource)
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
