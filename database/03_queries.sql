-- =============================================================
-- Placement Analytics & Semantic Job Matching System
-- Phase 2: Complex SQL Queries
-- Target File: database/03_queries.sql
-- Covers: Unit 2 - Multi-Table JOINs, Aggregation (GROUP BY/HAVING),
--          Nested Subqueries, Correlated Subqueries, Common Table
--          Expressions (CTEs), Window Functions, Full-Text Search, Set Ops
-- =============================================================

USE placement_analytics;

-- =============================================================
-- 1. MULTI-TABLE JOINS (Inner, Left, Multi-way)
-- =============================================================

-- Q1.1: Comprehensive Placement Report across 4 normalized entities:
-- (candidates -> applications -> jobs -> companies)
SELECT
    c.full_name                         AS candidate_name,
    c.category                          AS domain,
    c.cgpa,
    j.job_title,
    co.company_name,
    co.location                         AS job_location,
    a.status                            AS application_status,
    ROUND(a.similarity_score * 100, 2)  AS semantic_match_pct,
    DATE_FORMAT(a.applied_at, '%Y-%m-%d') AS applied_date
FROM applications a
INNER JOIN candidates c  ON a.candidate_id = c.candidate_id
INNER JOIN jobs       j  ON a.job_id       = j.job_id
INNER JOIN companies  co ON j.company_id   = co.company_id
ORDER BY a.similarity_score DESC;

-- Q1.2: Left Outer Join: List all open jobs and the count of applicants,
-- including jobs that have zero applicants yet.
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


-- =============================================================
-- 2. AGGREGATE FUNCTIONS WITH GROUP BY AND HAVING
-- =============================================================

-- Q2.1: Industry-wise Job & Vacancy Analysis with threshold filtering:
-- Only show industries offering more than 1 open position with competitive stats
SELECT
    co.industry,
    COUNT(DISTINCT co.company_id) AS active_companies,
    COUNT(j.job_id)               AS total_job_openings,
    SUM(j.num_positions)          AS total_vacancies,
    ROUND(AVG(j.experience_min), 1) AS avg_min_experience_years
FROM jobs j
INNER JOIN companies co ON j.company_id = co.company_id
WHERE j.status = 'open'
GROUP BY co.industry
HAVING SUM(j.num_positions) >= 2
ORDER BY total_vacancies DESC;

-- Q2.2: Skill demand density:
-- Count jobs requiring each skill, categorized by mandatory vs optional
SELECT
    s.skill_name,
    s.category,
    COUNT(js.job_id)                 AS total_job_mentions,
    SUM(CASE WHEN js.is_mandatory = 1 THEN 1 ELSE 0 END) AS mandatory_requirement_count,
    SUM(CASE WHEN js.is_mandatory = 0 THEN 1 ELSE 0 END) AS preferred_requirement_count
FROM skills s
INNER JOIN job_skills js ON s.skill_id = js.skill_id
GROUP BY s.skill_id, s.skill_name, s.category
HAVING COUNT(js.job_id) >= 1
ORDER BY total_job_mentions DESC, mandatory_requirement_count DESC;


-- =============================================================
-- 3. NESTED SUBQUERIES (Non-Correlated)
-- =============================================================

-- Q3.1: Candidates whose CGPA is higher than the overall average CGPA
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

-- Q3.2: Jobs that require top-tier skills (e.g., Deep Learning or NLP)
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


-- =============================================================
-- 4. CORRELATED SUBQUERIES
-- =============================================================

-- Q4.1: Candidates who have achieved above the average similarity score
-- for the specific jobs they applied to (Correlated on job_id)
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

-- Q4.2: Companies that have at least one candidate shortlisted or hired (EXISTS)
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


-- =============================================================
-- 5. COMMON TABLE EXPRESSIONS (CTEs)
-- =============================================================

-- Q5.1: Multi-stage Hiring Funnel CTE:
-- Calculate application conversion rate from applied -> shortlisted -> hired per company
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
    sc.status                                          AS recruitment_stage,
    sc.candidate_count,
    ct.total_applications,
    ROUND((sc.candidate_count * 100.0 / ct.total_applications), 2) AS conversion_percentage
FROM stage_counts sc
JOIN company_totals ct ON sc.company_name = ct.company_name
ORDER BY sc.company_name, sc.status;

-- Q5.2: Skill Match Count CTE:
-- Quantify candidate skill overlap with job mandatory requirements
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


-- =============================================================
-- 6. WINDOW FUNCTIONS (Ranking, Partitioning, Cumulative)
-- =============================================================

-- Q6.1: RANK(), DENSE_RANK(), and ROW_NUMBER() over applicant scores per job
SELECT
    j.job_title,
    c.full_name                         AS candidate_name,
    a.similarity_score,
    RANK()       OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS score_rank,
    DENSE_RANK() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS dense_score_rank,
    ROW_NUMBER() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS row_num
FROM applications a
JOIN candidates c ON a.candidate_id = c.candidate_id
JOIN jobs       j ON a.job_id       = j.job_id
WHERE a.similarity_score IS NOT NULL
ORDER BY a.job_id, score_rank;

-- Q6.2: Running Total & Cumulative Application Tracking by Date
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


-- =============================================================
-- 7. FULL-TEXT SEARCH
-- =============================================================

-- Q7.1: Semantic and keyword matching on Job Description and Title
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


-- =============================================================
-- 8. SET OPERATIONS (UNION & UNION ALL)
-- =============================================================

-- Q8.1: Geographic footprint across all companies and job listings
SELECT location AS city, 'Job Posting City' AS source_type FROM jobs WHERE location IS NOT NULL
UNION
SELECT location AS city, 'Company HQ'       AS source_type FROM companies WHERE location IS NOT NULL
ORDER BY city;
