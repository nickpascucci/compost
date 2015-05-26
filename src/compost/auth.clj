(ns compost.auth
  (:require [cemerick.friend :as friend]
            (cemerick.friend [workflows :as workflows]
                             [credentials :as creds]
                             [util :as util])
            [clj-http.client :as http]))

(defn oauth-credential-fn [& {:keys [token] :as oauth-creds}]
  ;; TODO: Check that the creds are valid with Google APIs
  (let [auth-response (http/get "https://www.googleapis.com/plus/v1/people/me"
                                {:headers {"Authorization" (str "Bearer " token)}
                                 :as :json
                                 :coerce :always
                                 :throw-exceptions false})]
    (if (= 200 (:status auth-response))
      (let [email (:value (first (filter
                                  (fn [addr] (= "account" (:type addr)))
                                  (:emails (:body auth-response)))))]
        {:identity email :roles [] :token token})
      (println "Failed to authorize user"))))

(defn google-oauth [& {:keys [credential-fn] :as oauth-config}]
  "Friend workflow for using Google OAuth."
  (fn [{{:strs [authorization]} :headers :as request}]
    (when (and authorization (re-matches #"\s*OAuth\s*(.+)" authorization))
      (if-let [[_ token]
               (try (re-matches #"\s*OAuth\s+(.+)" authorization)
                    (catch Exception e
                      (println "Invalid Authorization header for OAuth: " authorization)
                      (.printStackTrace e)))]
        (if-let [user-record ((util/gets :credential-fn oauth-config (::friend/auth-config request))
                              :token token)]
          (do
            (println "Authorization succeeded")
            (with-meta user-record
             {::friend/workflow :google-oauth
              ::friend/redirect-on-auth? false
              ::friend/ensure-session false
              :type ::friend/auth}))
          (do
            (println "Authorization failed: ")
            {:status 401 :body (str "Authorization failed: " authorization)}))
        (do
          (println "Authorization failed: ")
          {:status 400 :body "Malformed Authorization header for OAuth authentication."})))))

(defn constant-middleware
  "Returns a middleware which treats all requests as though they were authenticated as the provided
  user."
  [handler user]
  (fn [request]
    (println "Treating request as authenticated by user" (pr-str user))
    (handler (friend/merge-authentication request user))))

(defn friend-middleware
  "Returns a middleware that enables authentication via Friend."
  [handler]
  (-> handler
      (friend/authenticate {:credential-fn oauth-credential-fn
                            :workflows [(google-oauth)]})))
