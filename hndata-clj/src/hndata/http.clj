(ns hndata.http
  (:require [clj-http.client :as client]
            [taoensso.timbre :as log])
  (:import (java.net SocketException)
           (clojure.lang ExceptionInfo)))

(def ^:private ^:const
  retryable-http-status-codes
  #{408 409 410 500 502 503 504 509})

(defn should-retry? [exception]
  (cond
    (instance? SocketException exception) true
    (and (instance? ExceptionInfo exception)
         (retryable-http-status-codes (-> exception ex-data :status))) true
    :else false))

(defn fetch-data [url params]
  (let [response (client/get url {:as :json :query-params params})]
    (if (= 200 (:status response))
      (:body response)
      (throw (ex-info "Failed to fetch data" {:status (:status response)})))))

(defn fetch-with-retries [url params retries]
  (try
    (fetch-data url params)
    (catch Exception e
      (if (and (> retries 0) (should-retry? e))
        (do
          (log/info "Error occurred: " (.getMessage e) ". Retrying..")
          (Thread/sleep 1000)
          (fetch-with-retries url params (dec retries)))
        (throw e)))))

(defn fetch-data-from-algolia [url params]
  (fetch-with-retries url params 3))