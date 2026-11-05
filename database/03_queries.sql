-- ============================================================================
-- Placement Analytics and Semantic Job Matching System
-- ============================================================================
-- File: database/03_queries.sql
-- Role: Complex Analytical Queries (Data Query Language - DQL)
--
-- Syllabus Coverage (PES University DBMS Level 3 Mini-Project):
--   • Unit 2: Multi-Table JOINs (Inner, Outer, Multi-Way), Aggregations (GROUP BY,
--             HAVING), Nested Subqueries, Correlated Subqueries, Common Table
--             Expressions (CTEs), Window Functions, Full-Text Search, Set Operations.
--
-- Team Members:
--   • Shriya S R (PES1UG24CS449) — Member 1 (Lead: DB Architecture & Transaction Systems)
--   • Ahana S S  (PES1UG24CS910) — Member 2 (Lead: Analytical Queries & Vector DB Architect)
-- ============================================================================

-- Select the schema that contains the tables queried throughout this file.
USE placement_analytics;

-- ============================================================================
-- SECTION 1: MULTI-TABLE RELATIONAL JOINS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q1.1: Comprehensive Placement Report across 4 Normalized Entities (4-Way INNER JOIN)
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   Assembles data distributed across 4 distinct normalized tables:
--     candidates (c) |><| applications (a) |><| jobs (j) |><| companies (co)
--   InnoDB optimizer uses indexed foreign key lookups (fk_app_candidate, fk_app_job,
--   fk_job_company) to compute the join tree in O(N log M) time.
SELECT
    c.full_name                           AS candidate_name,
    c.category                            AS candidate_domain,
    c.cgpa                                AS candidate_cgpa,
    j.job_title,
    co.company_name,
    co.location                           AS job_location,
    a.status                              AS application_status,
    ROUND(a.similarity_score * 100, 2)    AS semantic_match_pct,
    DATE_FORMAT(a.applied_at, '%Y-%m-%d') AS applied_date
FROM applications a
INNER JOIN candidates c  ON a.candidate_id = c.candidate_id
INNER JOIN jobs       j  ON a.job_id       = j.job_id
INNER JOIN companies  co ON j.company_id   = co.company_id
ORDER BY a.similarity_score DESC;

-- ----------------------------------------------------------------------------
-- Q1.2: Preserving Zero-Applicant Openings (LEFT OUTER JOIN & Null Handling)
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   An INNER JOIN would discard active job openings that currently have ZERO applicants.
--   A LEFT OUTER JOIN preserves all rows from the left relation (jobs), producing
--   NULL for unmatched application rows. Using COUNT(a.application_id) correctly
--   evaluates NULLs to 0, unlike COUNT(*) which would erroneously count 1 for NULL rows.
SELECT
    j.job_id,
    j.job_title,
    co.company_name,
    j.location,
    j.num_positions,
    COUNT(a.application_id) AS total_applicants
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
WHERE j.status = 'open'
GROUP BY j.job_id, j.job_title, co.company_name, j.location, j.num_positions
ORDER BY total_applicants DESC;


-- ============================================================================
-- SECTION 2: AGGREGATE FUNCTIONS WITH GROUP BY AND HAVING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q2.1: Industry-Wise Vacancy & Experience Analysis with Group Threshold Filtering
-- ----------------------------------------------------------------------------
-- CORE VIVA CONCEPT (Execution Order of SQL Clauses):
--   1. FROM & JOIN: Forms Cartesian product of jobs and companies.
--   2. WHERE: Evaluates row-level predicates BEFORE grouping (only open jobs).
--   3. GROUP BY: Partitions surviving rows by co.industry.
--   4. AGGREGATES: Computes COUNT(), SUM(), and AVG() per industry partition.
--   5. HAVING: Filters aggregated groups AFTER calculation (only industries with 2+ vacancies).
--   6. SELECT: Formats the output column projection.
--   7. ORDER BY: Sorts the final result set descending by total vacancies.
SELECT
    co.industry,
    COUNT(DISTINCT co.company_id)   AS active_companies,
    COUNT(j.job_id)                 AS total_job_openings,
    SUM(j.num_positions)            AS total_vacancies,
    ROUND(AVG(j.experience_min), 1) AS avg_min_experience_years
FROM jobs j
INNER JOIN companies co ON j.company_id = co.company_id
WHERE j.status = 'open'
GROUP BY co.industry
HAVING SUM(j.num_positions) >= 2
ORDER BY total_vacancies DESC;

-- ----------------------------------------------------------------------------
-- Q2.2: Skill Market Demand Density (Conditional Aggregation with CASE WHEN)
-- ----------------------------------------------------------------------------
-- Combines SUM(CASE WHEN ...) inside GROUP BY to count mandatory prerequisites
-- vs. preferred secondary skills per master skill entity.
SELECT
    s.skill_name,
    s.category,
    COUNT(js.job_id) AS total_job_mentions,
    SUM(CASE WHEN js.is_mandatory = 1 THEN 1 ELSE 0 END) AS mandatory_requirement_count,
    SUM(CASE WHEN js.is_mandatory = 0 THEN 1 ELSE 0 END) AS preferred_requirement_count
FROM skills s
INNER JOIN job_skills js ON s.skill_id = js.skill_id
GROUP BY s.skill_id, s.skill_name, s.category
HAVING COUNT(js.job_id) >= 1
ORDER BY total_job_mentions DESC, mandatory_requirement_count DESC;


-- ============================================================================
-- SECTION 3: NESTED SUBQUERIES (Non-Correlated / Independent Evaluation)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q3.1: Candidates Exceeding Overall Academic Benchmark (Scalar Subquery)
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   The inner subquery (SELECT AVG(cgpa) FROM candidates) is completely independent
--   of the outer query. The query optimizer evaluates it EXACTLY ONCE to produce a scalar
--   constant, which is then used as a filter threshold for the outer candidate scan.
SELECT
    full_name,
    category,
    education_level,
    cgpa
FROM candidates
WHERE cgpa > (
    SELECT AVG(cgpa) 
    FROM candidates 
    WHERE cgpa IS NOT NULL
)
ORDER BY cgpa DESC;

-- ----------------------------------------------------------------------------
-- Q3.2: Jobs Requiring Specialized Advanced Skills (IN Predicate Subquery)
-- ----------------------------------------------------------------------------
-- Evaluates membership using 'IN (subquery)', identifying jobs demanding
-- deep tech capabilities (Deep Learning, NLP, or TensorFlow).
SELECT
    j.job_id,
    j.job_title,
    co.company_name,
    j.payrate
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
WHERE j.job_id IN (
    SELECT js.job_id
    FROM job_skills js
    JOIN skills s ON js.skill_id = s.skill_id
    WHERE s.skill_name IN ('Deep Learning', 'NLP', 'TensorFlow')
);


-- ============================================================================
-- SECTION 4: CORRELATED SUBQUERIES & EXISTS PREDICATE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q4.1: Candidates Scoring at or Above Their Job's Average (Grouped Derived Table)
-- ----------------------------------------------------------------------------
-- The derived table computes one average per job independently; the outer query joins
-- each application to its job's average and keeps scores at or above that average.
-- Q4.2 below is the file's correlated subquery example because it references co.company_id.
SELECT
    c.full_name,
    j.job_title,
    a.similarity_score,
    ROUND(sub.avg_job_similarity, 4) AS job_average_similarity
FROM applications a
JOIN candidates c ON a.candidate_id = c.candidate_id
JOIN jobs j       ON a.job_id       = j.job_id
JOIN (
    SELECT job_id, AVG(similarity_score) AS avg_job_similarity
    FROM applications
    WHERE similarity_score IS NOT NULL
    GROUP BY job_id
) sub ON a.job_id = sub.job_id
WHERE a.similarity_score >= sub.avg_job_similarity;

-- ----------------------------------------------------------------------------
-- Q4.2: Companies with Successfully Placed Candidates (EXISTS Semi-Join)
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   The 'EXISTS' operator tests for the presence of rows returned by the subquery.
--   Unlike IN or COUNT(), EXISTS short-circuits to TRUE as soon as the first matching
--   record is encountered, preventing unnecessary full table scanning.
SELECT
    co.company_id,
    co.company_name,
    co.industry
FROM companies co
WHERE EXISTS (
    SELECT 1
    FROM jobs j
    INNER JOIN applications a ON j.job_id = a.job_id
    WHERE j.company_id = co.company_id
      AND a.status IN ('shortlisted', 'hired')
);


-- ============================================================================
-- SECTION 5: COMMON TABLE EXPRESSIONS (CTEs)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q5.1: Multi-Stage Corporate Recruitment Conversion Funnel (Chained CTEs)
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   CTEs (WITH ... AS) create modular, named temporary result sets within execution scope.
--   Stage 1 (stage_counts): Computes applicant volume grouped by company and stage.
--   Stage 2 (company_totals): Computes total overall applicant volume per company.
--   Final Query: Joins both temporary tables to calculate exact conversion percentages
--   (e.g., % of total applicants who were successfully shortlisted or hired).
WITH stage_counts AS (
    SELECT
        co.company_name,
        a.status,
        COUNT(a.application_id) AS candidate_count
    FROM applications a
    JOIN jobs      j  ON a.job_id       = j.job_id
    JOIN companies co ON j.company_id   = co.company_id
    GROUP BY co.company_name, a.status
),
company_totals AS (
    SELECT
        company_name,
        SUM(candidate_count) AS total_applications
    FROM stage_counts
    GROUP BY company_name
)
SELECT
    sc.company_name,
    sc.status                                                      AS recruitment_stage,
    sc.candidate_count,
    ct.total_applications,
    ROUND((sc.candidate_count * 100.0 / ct.total_applications), 2) AS conversion_percentage
FROM stage_counts sc
JOIN company_totals ct ON sc.company_name = ct.company_name
ORDER BY sc.company_name, sc.status;

-- ----------------------------------------------------------------------------
-- Q5.2: Verified Skill Overlap CTE (Comparing Candidate Skills vs. Mandatory Job Prereqs)
-- ----------------------------------------------------------------------------
-- Computes the exact count of verified mandatory skills matched per applicant.
WITH candidate_job_skill_overlap AS (
    SELECT
        a.candidate_id,
        a.job_id,
        COUNT(cs.skill_id) AS matched_skills_count
    FROM applications a
    JOIN candidate_skills cs ON a.candidate_id = cs.candidate_id
    JOIN job_skills js       ON a.job_id       = js.job_id 
                            AND cs.skill_id    = js.skill_id
    WHERE js.is_mandatory = 1
    GROUP BY a.candidate_id, a.job_id
)
SELECT
    c.full_name,
    j.job_title,
    COALESCE(cjs.matched_skills_count, 0) AS verified_mandatory_skills_matched,
    a.similarity_score
FROM applications a
JOIN candidates c ON a.candidate_id = c.candidate_id
JOIN jobs j       ON a.job_id       = j.job_id
LEFT JOIN candidate_job_skill_overlap cjs 
       ON a.candidate_id = cjs.candidate_id AND a.job_id = cjs.job_id
ORDER BY verified_mandatory_skills_matched DESC, a.similarity_score DESC;


-- ============================================================================
-- SECTION 6: WINDOW FUNCTIONS (Ranking, Partitioning & Cumulative Analytics)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q6.1: Candidate Match Leaderboard per Job Opening (Window Partitioning)
-- ----------------------------------------------------------------------------
-- MATHEMATICAL DISTINCTION BETWEEN WINDOW RANKING FUNCTIONS:
--   • ROW_NUMBER(): Assigns strict sequential integers (1, 2, 3...) regardless of ties.
--   • RANK(): Identical values receive identical ranks, leaving a gap for subsequent rows
--             (e.g., scores 0.95, 0.95, 0.80 -> ranks 1, 1, 3).
--   • DENSE_RANK(): Identical values receive identical ranks without gaps
--                   (e.g., scores 0.95, 0.95, 0.80 -> ranks 1, 1, 2).
--   Unlike GROUP BY, window functions do not collapse rows; each student tuple is preserved.
SELECT
    j.job_title,
    c.full_name                         AS candidate_name,
    a.similarity_score,a.job_id,
    RANK()       OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS score_rank,
    DENSE_RANK() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS dense_score_rank,
    ROW_NUMBER() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS row_num
FROM applications a
JOIN candidates c ON a.candidate_id = c.candidate_id
JOIN jobs       j ON a.job_id       = j.job_id
WHERE a.similarity_score IS NOT NULL
ORDER BY a.job_id, score_rank;

-- ----------------------------------------------------------------------------
-- Q6.2: Platform Cumulative Application Growth & 3-Day Rolling Moving Average
-- ----------------------------------------------------------------------------
-- Uses 'SUM() OVER (ORDER BY date)' to compute cumulative running totals over time,
-- and 'ROWS BETWEEN 2 PRECEDING AND CURRENT ROW' for moving averages.
SELECT
    DATE(applied_at)                                      AS application_date,
    COUNT(*)                                              AS daily_applications,
    SUM(COUNT(*)) OVER (ORDER BY DATE(applied_at))        AS cumulative_applications,
    ROUND(AVG(similarity_score) OVER (
        ORDER BY DATE(applied_at) 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 4)                                                 AS rolling_3day_avg_similarity
FROM applications
GROUP BY DATE(applied_at), similarity_score;


-- ============================================================================
-- SECTION 7: FULL-TEXT SEARCH (Inverted Index Querying)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q7.1: Natural Language Relevance Scoring on Job Postings
-- ----------------------------------------------------------------------------
-- DBMS THEORY:
--   Queries the inverted FULLTEXT index created in schema.sql.
--   'MATCH ... AGAINST (... IN NATURAL LANGUAGE MODE)' evaluates token relevance
--   using term-frequency / inverse-document-frequency (TF-IDF), returning floating
--   point relevance scores in milliseconds without slow full-table scans.
SELECT
    j.job_id,
    j.job_title,
    co.company_name,
    j.location,
    MATCH(j.job_title, j.job_description) 
        AGAINST ('Python Machine Learning Analytics' IN NATURAL LANGUAGE MODE) AS relevance_score
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
WHERE MATCH(j.job_title, j.job_description) 
      AGAINST ('Python Machine Learning Analytics' IN NATURAL LANGUAGE MODE)
ORDER BY relevance_score DESC;


-- ============================================================================
-- SECTION 8: SET OPERATIONS (UNION & UNION ALL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Q8.1: Geographic Footprint Union across Companies & Job Locations
-- ----------------------------------------------------------------------------
-- 'UNION' automatically deduplicates identical city names across tables.
-- (UNION ALL would retain duplicates if frequency counting was desired).
-- Combine distinct city/source pairs from jobs and company headquarters.
SELECT location AS city, 'Job Posting City' AS source_type FROM jobs WHERE location IS NOT NULL
UNION
SELECT location AS city, 'Company HQ'       AS source_type FROM companies WHERE location IS NOT NULL
ORDER BY city;
