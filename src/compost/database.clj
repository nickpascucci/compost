(ns compost.database
  (:require
   [monger.core :as mg]))

(defonce connection (atom nil))

(defn get-database []
  (let [{:keys [conn db]} @connection] db))
