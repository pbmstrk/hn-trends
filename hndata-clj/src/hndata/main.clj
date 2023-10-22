(ns hndata.main
  (:gen-class)
  (:require [clojure.string :as str]
            [hndata.http :as http]
            [next.jdbc :as jdbc]
            [next.jdbc.sql :as sql]
            [taoensso.timbre :as log])
  (:import (org.jsoup.parser Parser)))

(def ^:const algolia-hn-search-url "http://hn.algolia.com/api/v1/search_by_date")
(def ^:const insert-stories-statement
  (str "INSERT INTO stories "
       "(objectID, submission_date, created_at_i, title, author) "
       "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"))
(def ^:const insert-comments-statement
  (str "INSERT INTO hiring_comments "
       "(objectID, comment_text, storyID, parentID, created_date) "
       "VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"))
(def ^:const hits-per-page 1000)

(defn get-datasource-from-env []
  (jdbc/get-datasource (System/getenv "database_url")))

(def operator-mappings {"lt" "<", "gt" ">"})
(defn build-numeric-filter-string [field op val]
  (when (some? val)
    (str field (operator-mappings op) val)))

(defn build-query-params
  "Build query parameters for the Algolia API based on tags and creation date bounds."
  [tags creation-lb creation-ub]
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

(defn insert-with-preprocessing!
  "Execute a batch insert into the database after processing records."
  [ds records query record-processor]
  (jdbc/execute-batch! ds query (map record-processor records) {}))

(defn insert-stories!
  "Batch insert stories into the database."
  [ds stories]
  (insert-with-preprocessing! ds stories insert-stories-statement extract-story-metadata))

(defn insert-comments!
  "Batch insert comments into the database."
  [ds comments]
  (insert-with-preprocessing! ds comments insert-comments-statement extract-comment-metadata))

(defn fetch-batch
  "Fetch a batch of results from API based on search parameters."
  [tags creation-lb creation-ub]
  (let [query-params (build-query-params tags creation-lb creation-ub)
        response (http/fetch-data-from-algolia algolia-hn-search-url query-params)]
    (log/info "Fetching batch with params.. " query-params)
    (:hits response)))

(defn process-batch
  "Process a batch of records and determine if further processing is needed."
  [insert-function tags creation-lb creation-ub]
  (let [records (fetch-batch tags creation-lb creation-ub)]
    (log/info "Processing batch of size: " (count records))
    (insert-function records)
    ; The created_at_i field is used to paginate through the results. If
    ; the number of results is equal to the page size (i.e. hits per page),
    ; this indicates we may need further requests to retrieve all the data
    (if (= (count records) hits-per-page)
      {:should-continue true :ub (apply min (map :created_at_i records))}
      {:should-continue false})))

(defn process-search-results [{:keys [tags creation-lb creation-ub insert-function]}]
  (loop [next-ub creation-ub iteration 1]
    (log/info "Batch" iteration)
    (let [{:keys [should-continue ub]} (process-batch insert-function tags creation-lb next-ub)]
      (if should-continue
        (recur ub (inc iteration))
        (log/info "Fetching complete...")))))

(defn get-unprocessed-hiring-story-ids [ds]
  (let [query "select get_unprocessed_hiring_stories() as id;"
        object-ids (->> (sql/query ds [query])
                        (map :id))]
    object-ids))

(defn process-all-comments [ds]
  (let [ids (get-unprocessed-hiring-story-ids ds)]
    (doseq [id ids]
      (process-search-results {:tags            (format "comment,story_%s" id)
                               :creation-lb     nil
                               :creation-ub     nil
                               :insert-function (partial insert-comments! ds)})
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
    ; process all new stories from the latest timestamp record in db
    (process-search-results {:tags            "story"
                             :creation-lb     latest-timestamp
                             :creation-ub     nil
                             :insert-function (partial insert-stories! ds)})
    ; check if there are any unprocessed "who is hiring" stories and fetch comments
    (process-all-comments ds)
    (refresh-views ds ["keywords" "hiring_keywords" "submissions_per_day"])))