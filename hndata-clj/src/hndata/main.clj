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
  (assert (contains? operator-mappings op))
  (when (some? val)
    (str field (get operator-mappings op) val)))

(defn build-query-params
  "Build query parameters for the Algolia API based on tags and creation date bounds."
  [{:keys [tags creation-lb creation-ub]}]
  (assert (some? tags))
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

(defn unescape-html
  "Converts HTML escape sequences in text back to their corresponding characters."
  [s]
  (if (nil? s)
    ""
    (Parser/unescapeEntities s true)))

(defn extract-comment-metadata [record]
  ((juxt :objectID
         (comp unescape-html :comment_text)
         :story_id
         :parent_id
         :created_at)
   record))

(defn fetch-batch
  "Fetch a batch of results from API based on search parameters."
  [search-map]
  (let [query-params (build-query-params search-map)
        response (http/fetch-data-from-algolia algolia-hn-search-url query-params)]
    (log/info "Fetching batch with params.. " query-params)
    (:hits response)))

(defn search-results
  [search-map]
  (lazy-seq
    (let [records (fetch-batch search-map)]
      (when (seq records)
        (cons records
              ; batch having fewer records than hits-per-page indicates that
              ; all records have been retrieved.
              (when (= (count records) hits-per-page)
                (search-results (assoc search-map :creation-ub (apply min (map :created_at_i records))))))))))

(defn insert-records! [ds sql-statement extract-fn batches]
  (doseq [batch batches]
    (let [records (map extract-fn batch)]
      (jdbc/execute-batch! ds sql-statement records {}))))

(defn insert-stories! [ds batches]
  (insert-records! ds insert-stories-statement extract-story-metadata batches))

(defn insert-comments! [ds batches]
  (insert-records! ds insert-comments-statement extract-comment-metadata batches))

(defn process-search-results [search-map process-fn]
  (let [batches (search-results search-map)]
    (process-fn batches)))

(defn get-unprocessed-hiring-story-ids [ds]
  (let [query "select get_unprocessed_hiring_stories() as id;"
        object-ids (->> (sql/query ds [query])
                        (map :id))]
    object-ids))

(defn process-all-comments [ds]
  (let [ids (get-unprocessed-hiring-story-ids ds)]
    (doseq [id ids]
      (process-search-results {:tags        (format "comment,story_%s" id)
                               :creation-lb nil
                               :creation-ub nil}
                              (partial insert-comments! ds))
      (sql/insert! ds :hiring_posts_log {:objectID id}))))

(defn fetch-timestamps [ds]
  (let [record (sql/query ds ["select min(created_at_i), max(created_at_i) from stories"])]
    (first record)))

(defn parse-args [args]
  (let [command (first args)]
    (cond
      (nil? command) nil
      (not (#{"earliest" "latest"} command))  (throw (Exception. "Command must be earliest or latest"))
      :else (keyword command))))

(defn get-search-map [command ts]
  (case command
    :earliest {:tags "story" :creation-lb nil :creation-ub (:min ts)}
    :latest {:tags "story" :creation-lb (:max ts) :creation-ub nil}))

(defn -main [& args]
  (let [ds (get-datasource-from-env)
        ts (fetch-timestamps ds)
        command (or (parse-args args) :latest)
        search-map (get-search-map command ts)]
    (println ts)
    (process-search-results search-map
                            (partial insert-stories! ds))
    ; check if there are any unprocessed "who is hiring" stories and fetch comments
    (process-all-comments ds)))