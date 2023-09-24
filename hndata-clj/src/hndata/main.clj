(ns hndata.main
  (:require [clojure.string :as str]
            [hndata.http :as http]
            [next.jdbc :as jdbc]
            [next.jdbc.sql :as sql]
            [taoensso.timbre :as log])
  (:import (org.jsoup.parser Parser)))

(def algolia-hn-search-url "http://hn.algolia.com/api/v1/search_by_date")
(def insert-stories-statement
  (str "INSERT INTO stories "
       "(objectID, submission_date, created_at_i, title, author) "
       "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"))
(def insert-comments-statement
  (str "INSERT INTO hiring_comments "
       "(objectID, comment_text, storyID, parentID, created_date) "
       "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"))
(def hits-per-page 1000)

(defn get-datasource-from-env []
  (jdbc/get-datasource (System/getenv "database_url")))

(def operator-mappings {"lt" "<", "gt" ">"})
(defn build-numeric-filter-string [field op val]
  (when (some? val)
    (str field (operator-mappings op) val)))

(defn build-query-params [tags creation-lb creation-ub]
  (let [params {:tags tags :hitsPerPage hits-per-page}
        lower-bound (build-numeric-filter-string "created_at_i" "gt" creation-lb)
        upper-bound (build-numeric-filter-string "created_at_i" "lt" creation-ub)
        numeric-filter (->> [lower-bound upper-bound]
                            (filter some?)
                            (str/join ","))]
    (if (empty? numeric-filter)
      params
      (assoc params :numericFilters numeric-filter))))

(defn extract-story-metadata [record]
  ((juxt :objectID :created_at :created_at_i :title :author)
   record))

(defn extract-comment-metadata [record]
  ((juxt :objectID
         (comp #(Parser/unescapeEntities % true) :comment_text)
         :story_id
         :parent_id
         :created_at)
   record))

(defn insert-with-preprocessing! [ds records query pre-processor]
  (jdbc/execute-batch! ds query (map pre-processor records) {}))

(defn insert-stories! [ds stories]
  (insert-with-preprocessing! ds stories insert-stories-statement extract-story-metadata))

(defn insert-comments! [ds comments]
  (insert-with-preprocessing! ds comments insert-comments-statement extract-comment-metadata))

(defn fetch-batch [search-map creation-lb creation-ub]
  (let [query-params (build-query-params search-map creation-lb creation-ub)
        response (http/fetch-data-from-algolia algolia-hn-search-url query-params)]
    (log/info "Fetching batch with params.. " query-params)
    (:hits response)))

(defn process-batch [process-function search-map creation-lb creation-ub]
  (let [records (fetch-batch search-map creation-lb creation-ub)]
    (log/info "Processing batch of size: " (count records))
    (process-function records)
    ; The created_at_i field is used to paginate through the results. If
    ; the number of results is equal to the page size (i.e. hits per page),
    ; this indicates we may need further requests to retrieve all the data
    (if (= (count records) hits-per-page)
      {:should-continue true :ub (apply min (map :created_at_i records))}
      {:should-continue false})))

(defn process-search-results [{:keys [tags creation-lb creation-ub process-function]}]
  (loop [next-ub creation-ub]
    (let [{:keys [should-continue ub]} (process-batch process-function tags creation-lb next-ub)]
      (if should-continue
        (recur ub)
        (log/info "Fetching complete...")))))

(defn get-unprocessed-ids [ds]
  (let [query "select get_unprocessed_hiring_stories() as id;"
        object-ids (->> (sql/query ds [query])
                        (map :id))]
    object-ids))

(defn process-all-comments [ds]
  (let [ids (get-unprocessed-ids ds)]
    (doseq [id ids]
      (process-search-results {:tags             (format "comment,story_%s" id)
                               :creation-lb      nil
                               :creation-ub      nil
                               :process-function (partial insert-comments! ds)})
      (sql/insert! ds :hiring_posts_log {:objectID id}))))

(defn fetch-latest-story-timestamp [ds]
  (let [record (sql/query ds ["select max(created_at_i) from stories"])]
    (when-let [timestamp (-> record first :max)]
      timestamp)))


(defn refresh-views [ds views]
  (doseq [view views]
    (log/info "Running refresh for: " view)
    (jdbc/execute! ds [(format "refresh materialized view %s;" view)])))

(defn -main []
  (let [ds (get-datasource-from-env)
        latest-timestamp (fetch-latest-story-timestamp ds)]
    (process-search-results {:tags             "story"
                             :creation-lb      latest-timestamp
                             :creation-ub      nil
                             :process-function (partial insert-stories! ds)})
    (process-all-comments ds)
    (refresh-views ds ["keywords" "hiring_keywords" "submissions_per_day"])))