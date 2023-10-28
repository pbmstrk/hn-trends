(ns hndata.main-test
  (:require [clojure.test :refer :all]
            [hndata.main :as hn]
            [hndata.http :refer [fetch-data-from-algolia]]))

(declare thrown?)

(deftest build-numeric-filter-string-test
  (is (nil? (hn/build-numeric-filter-string "created_at_i" "lt" nil)))
  (is (= "created_at_i<0"
         (hn/build-numeric-filter-string "created_at_i" "lt" 0)))
  (is (= "created_at_i>0"
         (hn/build-numeric-filter-string "created_at_i" "gt" 0)))
  (is (thrown? AssertionError (hn/build-numeric-filter-string "created_at_i" "gte" 0))))

(deftest build-query-params-test
  (is (= {:tags "story" :hitsPerPage 1000}
         (hn/build-query-params {:tags "story" :creation-lb nil :creation-ub nil})))
  (is (thrown? AssertionError (hn/build-query-params {:tags nil :creation-lb nil :creation-ub nil})))
  (is (= {:tags "story" :hitsPerPage 1000 :numericFilters "created_at_i>0"}
         (hn/build-query-params {:tags "story" :creation-lb 0 :creation-ub nil})))
  (is (= {:tags "story" :hitsPerPage 1000 :numericFilters "created_at_i<1"}
         (hn/build-query-params {:tags "story" :creation-lb nil :creation-ub 1})))
  (is (= {:tags "story" :hitsPerPage 1000 :numericFilters "created_at_i>0,created_at_i<1"}
         (hn/build-query-params {:tags "story" :creation-lb 0 :creation-ub 1}))))

(deftest extract-story-metadata-test
  (is (= [101 "date" 1 "title" "author"]
         (hn/extract-story-metadata {:objectID     101
                                     :created_at   "date"
                                     :created_at_i 1
                                     :title        "title"
                                     :author       "author"}))))

(deftest unescape-html-test
  (is (= "&" (hn/unescape-html "&amp;")))
  (is (= "<" (hn/unescape-html "&lt;")))
  (is (= "" (hn/unescape-html nil))))

(deftest extract-comment-metadata-test
  (is (= [101 "comment text" 1 2 "date"]
      (hn/extract-comment-metadata {:objectID 101
                                    :comment_text "comment text"
                                    :story_id 1
                                    :parent_id 2
                                    :created_at "date"}))))


(deftest fetch-batch-test
  (with-redefs [fetch-data-from-algolia (fn [_ _] {:hits [:hit1 :hit2]})]
    (is (= [:hit1 :hit2] (hn/fetch-batch {:tags "story" :creation-lb nil :creation-ub nil})))))