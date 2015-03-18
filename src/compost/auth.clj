(ns compost.auth
  (:require [cemerick.friend :as friend]
            (cemerick.friend [workflows :as workflows]
                             [credentials :as creds])))

(defn friend-middleware
  "Returns a middleware that enables authentication via Friend."
  [handler users]
  (let [friend-m {:credential-fn (partial creds/bcrypt-credential-fn users)
                  :workflows
                  [(workflows/http-basic :realm "/")
                   (workflows/interactive-form)]}]
    (-> handler
        (friend/authenticate friend-m))))
