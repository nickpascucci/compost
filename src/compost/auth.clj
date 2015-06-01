(ns compost.auth
  (:require [cemerick.friend :as friend]
            (cemerick.friend [workflows :as workflows]
                             [credentials :as creds]
                             [util :as util])
            [clj-http.client :as http]
            [clj-jwt.core :as jwt]
            [clj-jwt.key :as jwt-key]
            [clj-jwt.base64 :as b64]
            [clj-time.core :refer [now plus days]]
            [clojure.core.cache :as cache]
            [clojure.java.io :as io])
  (:import [java.security KeyFactory]
           [java.security.spec RSAPublicKeySpec]))

(def google-oauth-discovery-url "https://accounts.google.com/.well-known/openid-configuration")
 ;; Refresh certificates every 12h
(def cert-cache (atom (cache/ttl-cache-factory {} :ttl (* 1000 60 60 12))))

(defn get-google-oauth-config []
  (http/get google-oauth-discovery-url
            {:as :json
             :coerce :always
             :throw-exceptions false}))

(defn fetch-google-creds! []
  "Gets the Google signing certificate as a string, caching it if possible."
  (swap! cert-cache
         (fn [C] (if (cache/has? C :certificate)
                      (cache/hit C :certificate)
                      (cache/miss C :certificate
                                  (let [config (get-google-oauth-config)
                                        _ (println "Retrieved certificate URIs:" config)
                                        keys-uri (get-in config [:body :jwks_uri])
                                        keys (http/get keys-uri
                                                       {:as :json
                                                        :coerce :always
                                                        :throw-exceptions false})]
                                    keys))))))

(let [key-factory (KeyFactory/getInstance "RSA")
      gen-key #(.generatePublic key-factory %)]
  (defn load-rsa-key [modulus exponent]
    "Load an RSA key from the modulus and exponent."
    (gen-key (RSAPublicKeySpec. modulus exponent))))

(defn fetch-google-signing-key! [kid]
  (let [creds (fetch-google-creds!)
        keydata (first (filter (fn [key] (= (:kid key) kid))
                                     (get-in creds [:certificate :body :keys])))
        modulus (BigInteger. (b64/decode (:n keydata)))
        exponent (BigInteger. (b64/decode (:e keydata)))]
    (load-rsa-key modulus exponent)))

(defn oauth-credential-fn [& {:keys [token] :as oauth-creds}]
  (let [decoded-token (jwt/str->jwt token)
        pub-key (fetch-google-signing-key! (get-in decoded-token [:header :kid]))
        verified-token (jwt/verify decoded-token :RS256 pub-key)]
    (println "Decoded token:" (pr-str decoded-token))
    (let [email (get-in decoded-token [:claims :email])]
      {:identity email :roles [] :token decoded-token})))

(defn google-oauth [& {:keys [credential-fn] :as oauth-config}]
  "Friend workflow for using Google OAuth."
  (fn [{{:strs [authorization]} :headers :as request}]
    (when (and authorization (re-matches #"\s*Bearer\s*(.+)" authorization))
      (if-let [[_ token]
               (try (re-matches #"\s*Bearer\s+(.+)" authorization)
                    (catch Exception e
                      (println "Invalid Authorization header for OAuth: " authorization)
                      (.printStackTrace e)))]
        (if-let [user-record ((util/gets :credential-fn oauth-config (::friend/auth-config request))
                              :token token)]
          (do
            (println "Authorization succeeded, user:" (:identity user-record))
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

(defn https-url [request]
  "Get the HTTPS version of a request URL."
  (str "https://" (:server-name request)
       (if (= 80 (:server-port request)) "" (str ":" (:server-port request)))
       (:uri request)))

(defn https-required-middleware [handler]
  "Middleware which redirects to HTTPS URLs."
  (fn [request]
    (if (= (:scheme request) :http)
      (do
        (println "Redirecting request to HTTPS")
        (ring.util.response/redirect (https-url request)))
      (handler request))))
