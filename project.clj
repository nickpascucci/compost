(defproject compost "0.0.1-SNAPSHOT"
  :description "A tracker for your fridge"
  :url "http://www.nickpascucci.com"
  :license {:name "Confidential and Proprietary" :url "http://www.nickpascucci.com"}
  :dependencies [
                 [com.cemerick/friend "0.2.1"]
                 [com.novemberain/monger "1.7.0"]
                 [compojure "1.1.6"]
                 [environ "0.2.1"]
                 [http-kit "2.1.16"]
                 [javax.servlet/servlet-api "2.5"]
                 [com.google.api-client/google-api-client "1.18.0-rc"]
                 [com.google.http-client/google-http-client "1.20.0"]
                 [com.google.http-client/google-http-client-jackson "1.20.0"]
                 [liberator "0.10.0"]
                 [org.clojure/clojure "1.5.1"]
                 [org.clojure/core.async "0.1.338.0-5c5012-alpha"]
                 [prismatic/dommy "0.1.2"]
                 [prismatic/schema "0.2.1"]
                 [ring-basic-authentication "1.0.1"]
                 [ring/ring-core "1.2.1"]
                 [ring/ring-devel "1.1.0"]
                 [ring/ring-json "0.2.0"]
                 [speclj "2.9.1"]
                 ]
  :min-lein-version "2.0.0"
  :main compost.core
  :aot [compost.core]
  :uberjar-name "compost-standalone.jar"
  :plugins [[environ/environ.lein "0.2.1"]]
  :hooks [environ.leiningen.hooks]
  :profiles {:production {:env {:production true}}})
