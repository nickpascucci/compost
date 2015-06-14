(ns compost.auth
  (:require [cemerick.friend :as friend]
            (cemerick.friend [workflows :as workflows]
                             [credentials :as creds]
                             [util :as util])
            [compost.google-token :as tkn])
  (:import [java.security KeyFactory]
           [java.security.spec RSAPublicKeySpec]
           [java.util Base64]))

(defn oauth-credential-fn [& {:keys [token] :as oauth-creds}]
  (if-let [decoded-token (tkn/validate token)]
    (do
      (println "Decoded token:" (pr-str decoded-token))
      {:identity (:email decoded-token) :roles [] :token decoded-token})
    (do
      (println "Token failed to verify!")
      nil)))

(defn google-oauth [& {:keys [credential-fn] :as oauth-config}]
  "Friend workflow for using Google OAuth."
  (fn [{{:strs [authorization]} :headers :as request}]
    (when (and authorization (re-matches #"\s*Bearer\s*(.+)" authorization))
      (if-let [[_ token]
               (try (re-matches #"\s*Bearer\s+(.+)" authorization)
                    (catch Exception e
                      (println "Invalid Authorization header for OAuth: " authorization)
                      (.printStackTrace e)))]
        (let [user-record ((util/gets :credential-fn oauth-config (::friend/auth-config request))
                           :token token)]
            (if-let [identity (:identity user-record)]
             (do
               (println "Authorization succeeded, user:" identity)
               (with-meta user-record
                 {::friend/workflow :google-oauth
                  ::friend/redirect-on-auth? false
                  ::friend/ensure-session false
                  :type ::friend/auth}))
           (do
             (println "Authorization failed!")
             {:status 401 :body (str "Authorization failed: " authorization)})))
        (do
          (println "Authorization failed!")
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

(defn https-url [request]
  "Get the HTTPS version of a request URL."
  (str "https://" (:server-name request)
       (if (= 80 (:server-port request)) "" (str ":" (:server-port request)))
       (:uri request)))

(defn https-required-middleware [handler]
  "Middleware which redirects to HTTPS URLs."
  (fn [request]
    (if (and (= (:scheme request) :http)
             ;; Heroku terminates SSL themselves, but sets the original protocol in the headers.
             (not (= "https" (get-in request [:headers "x-forwarded-proto"]))))
      (do
        (println "Redirecting request to HTTPS")
        (ring.util.response/redirect (https-url request)))
      (handler request))))
