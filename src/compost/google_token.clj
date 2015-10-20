(ns compost.google-token
  (:import [com.google.api.client.googleapis.auth.oauth2 GoogleIdToken]
           [com.google.api.client.googleapis.auth.oauth2 GoogleIdTokenVerifier]
           [com.google.api.client.googleapis.auth.oauth2 GoogleIdTokenVerifier$Builder]
           [com.google.api.client.http.javanet NetHttpTransport]
           [com.google.api.client.json.jackson JacksonFactory]))

(def client-id "564625248083-vrmpbbdr39uelvr3iirme4vuc5kckeu7.apps.googleusercontent.com")
(def transport (NetHttpTransport.))
(def json-factory (JacksonFactory.))
(def token-verifier (.build
                     (.setAudience
                      (GoogleIdTokenVerifier$Builder. transport json-factory)
                      (list client-id))))

(defn validate [token]
  "Verify the JWT token using Google client libraries."
  (when-let [idToken (.verify token-verifier token)]
    (reduce (fn [m e] (assoc m (keyword (.getKey e)) (.getValue e)))
            {}
            (.entrySet (.getPayload idToken)))))
