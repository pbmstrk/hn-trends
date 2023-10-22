(ns hndata.http
  (:require [clj-http.client :as client]
            [taoensso.timbre :as log])
  (:import (java.net SocketException)
           (clojure.lang ExceptionInfo)))

(def ^:private ^:const
  retryable-http-status-codes
  #{408 409 410 500 502 503 504 509})

(defn should-retry?
  "Determines if a request should be retried based on the exception received."
  [exception]
  (cond
    (instance? SocketException exception) true
    (and (instance? ExceptionInfo exception)
         (retryable-http-status-codes (-> exception ex-data :status))) true
    :else false))

(defn fetch-data
  "Performs a GET request to the specified URL and returns the response body if the request is successful."
  [url params]
  (let [response (client/get url {:as :json :query-params params})]
    (if (= 200 (:status response))
      (:body response)
      (throw (ex-info "Failed to fetch data" {:status (:status response)})))))

(defn fetch-with-retries
  "Attempts to fetch data from a URL with specified parameters, retrying up to a specified number of
  times if certain exceptions occur."
  [url params retries]
  (try
    (fetch-data url params)
    (catch Exception e
      (if (and (> retries 0) (should-retry? e))
        (do
          (log/info "Error occurred: " (.getMessage e) ". Retrying..")
          (Thread/sleep 1000)
          (fetch-with-retries url params (dec retries)))
        (throw e)))))

(defn fetch-data-from-algolia
  "Fetches data from Algolia with retry logic, given a URL and query parameters.
  Retries up to 3 times upon failures that are deemed retry-able."
  [url params]
  (fetch-with-retries url params 3))