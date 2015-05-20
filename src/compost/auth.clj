(ns compost.auth
  (:require [cemerick.friend :as friend]
            (cemerick.friend [workflows :as workflows]
                             [credentials :as creds]
                             [util :as util])))

(defn oauth-credential-fn [& {:keys [token] :as oauth-creds}]
  ;; TODO: Check that the creds are valid with Google APIs
  (println "Checking credential function")
  {:identity "user" :roles [] :token token})

(defn google-oauth [& {:keys [credential-fn] :as oauth-config}]
  "Friend workflow for using Google OAuth."
  (fn [{{:strs [authorization]} :headers :as request}]
    (println "Checking authorization: " authorization)
    (when (and authorization (re-matches #"\s*OAuth\s*(.+)" authorization))
      (if-let [[_ token]
               (try (re-matches #"\s*OAuth\s+(.+)" authorization)
                    (catch Exception e
                      (println "Invalid Authorization header for OAuth: " authorization)
                      (.printStackTrace e)))]
        (if-let [user-record ((util/gets :credential-fn oauth-config (::friend/auth-config request))
                              :token token)]
          (do
            (println "Authorization succeeded: " user-record)
            (with-meta user-record
             {::friend/workflow :google-oauth
              ::friend/redirect-on-auth? false
              ::friend/ensure-session false
              :type ::friend/auth}))
          (do
            (println "Authorization failed: " authorization)
            {:status 401 :body (str "Authorization failed: " authorization)}))
        (do
          (println "Authorization failed: " authorization)
          {:status 400 :body "Malformed Authorization header for OAuth authentication."})))))

(defn friend-middleware
  "Returns a middleware that enables authentication via Friend."
  [handler users]
  (-> handler
      (friend/authenticate {:credential-fn oauth-credential-fn
                            :workflows [(google-oauth)]})))
