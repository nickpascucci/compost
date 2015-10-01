(ns compost.core
  (:require [compojure.core :refer [defroutes GET PUT POST DELETE ANY]]
            [compojure.handler :refer [site]]
            [compojure.route :as route]
            [clojure.java.io :as io]
            [compost.handler :as handler]
            [ring.middleware.stacktrace :as trace]
            [ring.middleware.session :as session]
            [ring.middleware.session.cookie :as cookie]
            [ring.middleware.basic-authentication :as basic]
            [ring.util.response :as resp]
            [org.httpkit.server :as server]
            [monger.core :as mg]
            [environ.core :refer [env]])
  (:gen-class))

(defonce server-handle (atom {:server nil
                              :port nil
                              :db-up? false}))

(defn wrap-error-page [handler]
  (fn [req]
    (try (handler req)
         (catch Exception e
           {:status 500
            :headers {"Content-Type" "text/html"}
            :body (slurp (io/resource "500.html"))}))))

(defn init-db! [db-uri]
  (when (not (:db-up? @server-handle))
    (mg/connect-via-uri db-uri)
    (swap! server-handle assoc :db-up? true)))

(defn start-server! [port]
  (println "Running server on port" port)
  (println "Running in" (if (env :production) "prod" "dev"))
  (swap! server-handle assoc :server
         (server/run-server
          (-> #'handler/app
              ((if (env :production)
                 wrap-error-page
                 trace/wrap-stacktrace))
              ;; TODO: heroku config:add SESSION_SECRET=$RANDOM_16_CHARS
              (site {:session {:store (cookie/cookie-store {:key (env :session-secret)})}}))
          {:port port :join? false})
         :port port))

(defn stop-server! []
  ((:server @server-handle)))

(defn restart-server! []
  (stop-server!)
  (start-server! (:port @server-handle)))

(defn -main [& [port db-uri]]
  (let [port (Integer. (or port (env :port) 5000))
        db-uri (or db-uri (env :mongolab-uri) "mongodb://127.0.0.1/compost")]
    (println "Connecting to MongoDB at " db-uri)
    (init-db! db-uri)
    (start-server! port)))

;; For interactive development:
;; (-main)
