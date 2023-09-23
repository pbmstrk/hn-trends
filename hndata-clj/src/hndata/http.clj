(ns hndata.http
  (:require [clj-http.client :as client]))

(defn fetch-data-from-algolia [url params]
  (let [response (client/get url {:throw-exceptions false :as :json :query-params params})]
    (if (= 200 (:status response))
      (:body response)
      (throw (ex-info "Failed to fetch from Algolia" {:status (:status response)})))))

