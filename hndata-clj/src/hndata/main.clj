(ns hndata.main
  (:require [clojure.string :as str]
            [next.jdbc :as jdbc]
            [next.jdbc.sql :as sql]
            [hndata.http :as http])
  (:import (org.jsoup.parser Parser)))

(defn get-datasource-from-env []
  (let [database-url "jdbc:postgresql://paulbaumstark@localhost:5432/hndata_clj"]
    (jdbc/get-datasource database-url)))

(defn build-filter-string [field op val]
  (when (not (nil? val))
    (case op
      "lt" (str field "<" val)
      "gt" (str field ">" val))))

(defn build-query-params [creation-lb creation-ub]
  (let [default-params {:tags "story" :hitsPerPage 1000}
        lower-bound (build-filter-string "created_at_i" "gt" creation-lb)
        upper-bound (build-filter-string "created_at_i" "lt" creation-ub)
        numeric-filter (->> [lower-bound upper-bound]
                            (filter some?)
                            (str/join ","))]
    (if (empty? numeric-filter)
      default-params
      (assoc default-params :numericFilters numeric-filter))))

(defn extract-metadata [record]
  ((juxt :objectID :created_at :created_at_i :title :author)
   record))

(defn insert-batch!
  [ds records]
  (let [query "INSERT INTO stories (objectID, submission_date, created_at_i, title, author) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"]
    (jdbc/execute-batch! ds query (map extract-metadata records) {})))

(defn safe-min [coll]
  (if (seq coll)
    (apply min coll)
    nil))

(defn fetch-batch-of-stories [creation-lb creation-ub]
  (let [query-params (build-query-params creation-lb creation-ub)
        response (http/fetch-data-from-algolia "http://hn.algolia.com/api/v1/search_by_date" query-params)]
    (println (str "Fetching batch with params.. " query-params))
    (:hits response)))

(defn process-batch [ds creation-lb creation-ub]
  (let [records (fetch-batch-of-stories creation-lb creation-ub)
        min-creation-date (safe-min (map :created_at_i records))]
    (println (str "Inserting batch of size: " (count records)))
    (insert-batch! ds records)
    min-creation-date))

(defn process-all-records [ds creation-lb creation-ub]
  (loop [next-ub creation-ub]
    (let [ub (process-batch ds creation-lb next-ub)]
      (if (not (nil? ub))
        (recur ub)
        (println "Fetching completed.")))))

(defn extract-comment-metadata [comment]
  ((juxt :objectID
         (comp #(Parser/unescapeEntities % true) :comment_text)
         :story_id
         :parent_id
         :created_at)
   comment))

(defn insert-comments! [ds comments]
  (let [query "INSERT INTO hiring_comments (objectID, comment_text, storyID, parentID, created_date) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING"]
    (jdbc/execute-batch! ds query (map extract-comment-metadata comments) {})))

(defn fetch-comments-for-story [id extra-params]
  (let [query-params (merge
                       extra-params
                       {:tags (str "comment,story_" id) :hitsPerPage 100})]
    (http/fetch-data-from-algolia "https://hn.algolia.com/api/v1/search" query-params)))

(defn process-hiring-story [ds id]
  (println (str "Processing story: " id))
  (let [response (fetch-comments-for-story id {})
        comments (:hits response)
        n-pages (:nbPages response)]
    (insert-comments! ds comments)
    (doseq [page (range 1 n-pages)]
      (let [response (fetch-comments-for-story id {:page page})
            comments (:hits response)]
        (insert-comments! ds comments)))))

(defn get-unprocessed_ids [ds]
  (let [query "select get_unprocessed_hiring_stories() as id;"
        object-ids (->> (sql/query ds [query])
                        (map :id))]
    object-ids))

(defn process-all-comments [ds]
  (let [ids (get-unprocessed_ids ds)]
    (doseq [id ids]
      (process-hiring-story ds id)
      (sql/insert! ds :hiring_posts_log {:objectID id}))))

(defn fetch-latest-timestamp [ds]
  (let [record (sql/query ds ["select max(created_at_i) from stories"])]
    (if-let [timestamp (-> record first :max)]
      timestamp
      nil)))

(defn refresh-views [ds views]
  (doseq [view views]
    (println (str "Running refresh for: " view))
    (jdbc/execute! ds  [(str "refresh materialized view " view ";")])))

(defn -main []
  (let [ds (get-datasource-from-env)
        latest-timestamp (fetch-latest-timestamp ds)]
    (process-all-records ds latest-timestamp nil)
    (process-all-comments ds)
    (refresh-views ds ["keywords" "hiring_keywords" "submissions_per_day"])))