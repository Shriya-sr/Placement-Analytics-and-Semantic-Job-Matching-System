-- =============================================================
-- Placement Analytics & Semantic Job Matching System
-- Phase 2: DML + Complex SQL Queries
-- Covers: Unit 2 - DML, Aggregate Functions, Nested Subqueries,
--          Correlated Queries, Join Expressions, Views, CTEs,
--          Window Functions, Full-Text Search
-- =============================================================

USE placement_analytics;

-- =============================================================
-- SECTION A: SEED DATA (INSERT — DML)
-- Shows parameterised inserts, multi-row inserts, NULLs
-- =============================================================

-- ── Users (all 3 roles demonstrated) ─────────────────────────
INSERT IGNORE INTO users (email, pass_hash, role) VALUES
    ('admin@placementportal.com',  '$2b$12$admin_hash_placeholder',   'admin'),
    ('recruiter@tcs.com',          '$2b$12$recruiter1_hash',          'recruiter'),
    ('recruiter@infosys.com',      '$2b$12$recruiter2_hash',          'recruiter'),
    ('recruiter@google.com',       '$2b$12$recruiter3_hash',          'recruiter'),
    ('alice@pes.edu',              '$2b$12$student_alice_hash',       'student'),
    ('bob@pes.edu',                '$2b$12$student_bob_hash',         'student'),
    ('carol@pes.edu',              '$2b$12$student_carol_hash',       'student'),
    ('david@pes.edu',              '$2b$12$student_david_hash',       'student'),
    ('eve@pes.edu',                '$2b$12$student_eve_hash',         'student');

-- ── Companies ─────────────────────────────────────────────────
INSERT IGNORE INTO companies (user_id, company_name, industry, location) VALUES
    (2, 'Tata Consultancy Services', 'IT Services',          'Bengaluru'),
    (3, 'Infosys',                   'IT Services',          'Bengaluru'),
    (4, 'Google India',              'Internet / Software',  'Hyderabad');

-- ── Candidates ───────────────────────────────────────────────
INSERT IGNORE INTO candidates (user_id, full_name, phone, category, education_level, cgpa, resume_text) VALUES
    (5, 'Alice Sharma',  '9876543210', 'Data Science',    'B.E. Computer Science', 8.9,
        'Python, Machine Learning, SQL, TensorFlow, scikit-learn, Pandas, NumPy'),
    (6, 'Bob Menon',     '9123456780', 'Java Developer',  'B.E. Information Science', 7.5,
        'Java, Spring Boot, Hibernate, MySQL, REST APIs, Maven, Git'),
    (7, 'Carol D''Souza','9988776655', 'Data Science',    'M.Tech Data Science', 9.1,
        'Python, Deep Learning, NLP, PyTorch, Data Visualisation, SQL, Tableau'),
    (8, 'David Nair',    '8877665544', 'Web Designing',   'B.Sc Computer Science', 6.8,
        'HTML, CSS, JavaScript, React, Node.js, MongoDB, Figma'),
    (9, 'Eve Patel',     '7766554433', 'Python Developer','B.E. Computer Science', 8.2,
        'Python, Django, Flask, PostgreSQL, Docker, Kubernetes, CI/CD');

-- ── Skills master list ───────────────────────────────────────
INSERT IGNORE INTO skills (skill_name, category) VALUES
    ('Python',           'Programming'),
    ('Java',             'Programming'),
    ('JavaScript',       'Programming'),
    ('SQL',              'Database'),
    ('Machine Learning', 'AI/ML'),
    ('Deep Learning',    'AI/ML'),
    ('React',            'Framework'),
    ('Spring Boot',      'Framework'),
    ('Django',           'Framework'),
    ('Docker',           'DevOps'),
    ('MySQL',            'Database'),
    ('NLP',              'AI/ML'),
    ('TensorFlow',       'AI/ML'),
    ('REST APIs',        'Backend'),
    ('HTML',             'Frontend'),
    ('CSS',              'Frontend');

-- ── Candidate ↔ Skills ───────────────────────────────────────
INSERT IGNORE INTO candidate_skills (candidate_id, skill_id, proficiency) VALUES
    -- Alice: Data Science
    (1,1,'expert'),(1,4,'expert'),(1,5,'expert'),(1,13,'intermediate'),
    -- Bob: Java
    (2,2,'expert'),(2,4,'intermediate'),(2,8,'expert'),(2,14,'expert'),
    -- Carol: Data Science/ML
    (3,1,'expert'),(3,4,'expert'),(3,5,'expert'),(3,6,'expert'),(3,12,'expert'),
    -- David: Web
    (4,3,'expert'),(4,7,'expert'),(4,15,'expert'),(4,16,'expert'),
    -- Eve: Python
    (5,1,'expert'),(5,4,'intermediate'),(5,9,'expert'),(5,10,'expert');

-- ── Jobs ─────────────────────────────────────────────────────
INSERT IGNORE INTO jobs (company_id, job_title, job_description, experience_min, experience_max, payrate, location, num_positions) VALUES
    (1, 'Data Analyst',
        'Analyse large datasets using Python and SQL. Build dashboards and reports. Work with ML models for predictive analytics.',
        0, 2, 'INR 6,00,000 - 10,00,000 P.A', 'Bengaluru', 5),
    (1, 'Java Backend Developer',
        'Design and build RESTful APIs using Java Spring Boot. Manage MySQL databases. Write unit tests.',
        1, 3, 'INR 8,00,000 - 14,00,000 P.A', 'Bengaluru', 3),
    (2, 'Machine Learning Engineer',
        'Develop and deploy ML models using Python, TensorFlow, PyTorch. Experience with NLP is a plus.',
        0, 3, 'INR 10,00,000 - 18,00,000 P.A', 'Bengaluru', 2),
    (3, 'Frontend Developer',
        'Build responsive web applications using React and JavaScript. Good understanding of HTML and CSS required.',
        0, 2, 'INR 7,00,000 - 12,00,000 P.A', 'Hyderabad', 4),
    (3, 'Python Backend Engineer',
        'Build scalable microservices using Python Django and Flask. Docker, Kubernetes experience preferred.',
        1, 4, 'INR 12,00,000 - 20,00,000 P.A', 'Hyderabad', 2);

-- ── Job ↔ Skills ─────────────────────────────────────────────
INSERT IGNORE INTO job_skills (job_id, skill_id, is_mandatory) VALUES
    (1,1,1),(1,4,1),(1,5,1),(1,13,0),             -- Data Analyst
    (2,2,1),(2,8,1),(2,11,1),(2,14,1),             -- Java Backend
    (3,1,1),(3,5,1),(3,6,1),(3,12,0),(3,13,0),     -- ML Engineer
    (4,3,1),(4,7,1),(4,15,1),(4,16,1),             -- Frontend
    (5,1,1),(5,9,1),(5,10,0);                      -- Python Backend

-- ── Applications ─────────────────────────────────────────────
INSERT IGNORE INTO applications (job_id, candidate_id, status, similarity_score) VALUES
    (1, 1, 'shortlisted', 0.9210),   -- Alice → Data Analyst (TCS)
    (1, 3, 'applied',     0.8870),   -- Carol → Data Analyst (TCS)
    (2, 2, 'reviewed',    0.8100),   -- Bob   → Java Backend (TCS)
    (3, 1, 'applied',     0.8540),   -- Alice → ML Engineer (Infosys)
    (3, 3, 'shortlisted', 0.9600),   -- Carol → ML Engineer (Infosys)
    (4, 4, 'applied',     0.7900),   -- David → Frontend (Google)
    (5, 5, 'hired',       0.9750),   -- Eve   → Python Backend (Google)
    (5, 1, 'rejected',    0.6200);   -- Alice → Python Backend (Google)

-- =============================================================
-- SECTION B: UPDATE & DELETE (DML)
-- =============================================================

-- Update application status after manual recruiter review
UPDATE applications
SET    status = 'shortlisted'
WHERE  job_id = 4 AND candidate_id = 4;

-- Update job — close a position that has been filled
UPDATE jobs
SET    status = 'closed'
WHERE  job_id = 5;

-- Recruiter corrects a payrate entry
UPDATE jobs
SET    payrate = 'INR 12,50,000 - 22,00,000 P.A'
WHERE  job_id = 5;

-- Candidate updates profile CGPA
UPDATE candidates
SET    cgpa = 7.8
WHERE  candidate_id = 2;

-- Delete a duplicate/test application (safe: no cascade needed)
-- (Demonstrates DELETE with WHERE — not a broad DELETE)
DELETE FROM applications
WHERE  job_id = 5 AND candidate_id = 1 AND status = 'rejected';

-- =============================================================
-- SECTION C: COMPLEX QUERIES
-- =============================================================

-- ── C1: Multi-table JOIN ─────────────────────────────────────
-- Full placement report: candidate + job + company in one view
SELECT
    c.full_name                         AS candidate,
    c.category,
    c.cgpa,
    j.job_title,
    co.company_name,
    co.location,
    a.status,
    a.similarity_score,
    a.applied_at
FROM applications a
JOIN candidates c  ON a.candidate_id = c.candidate_id
JOIN jobs       j  ON a.job_id       = j.job_id
JOIN companies  co ON j.company_id   = co.company_id
ORDER BY a.similarity_score DESC;

-- ── C2: Aggregate + GROUP BY + HAVING ────────────────────────
-- Industries with more than 1 open role and average positions
SELECT
    co.industry,
    COUNT(j.job_id)          AS total_jobs,
    SUM(j.num_positions)     AS total_positions,
    AVG(j.num_positions)     AS avg_positions_per_job
FROM jobs      j
JOIN companies co ON j.company_id = co.company_id
WHERE j.status = 'open'
GROUP BY co.industry
HAVING COUNT(j.job_id) > 1
ORDER BY total_positions DESC;

-- ── C3: Nested (Non-correlated) Subquery ─────────────────────
-- Candidates whose CGPA is above the overall average
SELECT
    full_name,
    category,
    cgpa
FROM candidates
WHERE cgpa > (
    SELECT AVG(cgpa) FROM candidates WHERE cgpa IS NOT NULL
)
ORDER BY cgpa DESC;

-- ── C4: Correlated Subquery ──────────────────────────────────
-- Jobs that have at least one shortlisted or hired applicant
SELECT
    j.job_id,
    j.job_title,
    co.company_name
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
WHERE EXISTS (
    SELECT 1
    FROM   applications a
    WHERE  a.job_id = j.job_id
      AND  a.status IN ('shortlisted','hired')
);

-- ── C5: CTE — Hiring funnel per company ──────────────────────
WITH funnel AS (
    SELECT
        co.company_name,
        a.status,
        COUNT(*) AS cnt
    FROM applications a
    JOIN jobs      j  ON a.job_id       = j.job_id
    JOIN companies co ON j.company_id   = co.company_id
    GROUP BY co.company_name, a.status
),
totals AS (
    SELECT company_name, SUM(cnt) AS total_applied
    FROM   funnel
    GROUP BY company_name
)
SELECT
    f.company_name,
    f.status,
    f.cnt                                              AS count_in_stage,
    t.total_applied,
    ROUND(f.cnt * 100.0 / t.total_applied, 1)         AS stage_pct
FROM funnel f
JOIN totals t USING (company_name)
ORDER BY f.company_name, f.status;

-- ── C6: Window Functions ─────────────────────────────────────
-- Rank candidates within each job by similarity score
SELECT
    j.job_title,
    c.full_name,
    a.similarity_score,
    RANK()       OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS rank_in_job,
    DENSE_RANK() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS dense_rank_in_job,
    ROW_NUMBER() OVER (PARTITION BY a.job_id ORDER BY a.similarity_score DESC) AS row_num
FROM applications a
JOIN candidates c ON a.candidate_id = c.candidate_id
JOIN jobs       j ON a.job_id       = j.job_id
WHERE a.similarity_score IS NOT NULL
ORDER BY j.job_id, rank_in_job;

-- ── C7: Window Function — Running total applications per day ─
SELECT
    DATE(applied_at)                                   AS application_date,
    COUNT(*)                                           AS daily_count,
    SUM(COUNT(*)) OVER (ORDER BY DATE(applied_at))     AS running_total
FROM applications
GROUP BY DATE(applied_at);

-- ── C8: FULL-TEXT SEARCH (Unit 2) ────────────────────────────
-- Enable full-text index (run once, separately, if not set):
-- ALTER TABLE jobs ADD FULLTEXT INDEX ft_job_desc (job_description, job_title);

-- Full-text search for 'machine learning' or 'NLP' roles
SELECT
    j.job_title,
    co.company_name,
    j.location,
    MATCH(j.job_description, j.job_title)
        AGAINST ('machine learning NLP python' IN NATURAL LANGUAGE MODE) AS relevance
FROM jobs      j
JOIN companies co ON j.company_id = co.company_id
WHERE MATCH(j.job_description, j.job_title)
      AGAINST ('machine learning NLP python' IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC;

-- ── C9: Set Operations — UNION ───────────────────────────────
-- All cities where either jobs or companies exist
SELECT location AS city FROM jobs     WHERE location IS NOT NULL
UNION
SELECT location AS city FROM companies WHERE location IS NOT NULL
ORDER BY city;

-- ── C10: Null handling + COALESCE ────────────────────────────
-- Show all candidates, display 'Not disclosed' if CGPA missing
SELECT
    full_name,
    category,
    COALESCE(CAST(cgpa AS CHAR), 'Not disclosed') AS cgpa_display,
    COALESCE(phone, 'Not provided')               AS contact
FROM candidates;

-- =============================================================
-- SECTION D: VIEWS (Unit 2)
-- =============================================================

-- View 1: Active job market summary
CREATE OR REPLACE VIEW vw_active_jobs AS
SELECT
    j.job_id,
    j.job_title,
    co.company_name,
    co.industry,
    j.location,
    j.experience_min,
    j.experience_max,
    j.payrate,
    j.num_positions,
    COUNT(a.application_id) AS applicant_count
FROM jobs      j
JOIN companies co ON j.company_id   = co.company_id
LEFT JOIN applications a ON a.job_id = j.job_id
WHERE j.status = 'open'
GROUP BY j.job_id, j.job_title, co.company_name, co.industry,
         j.location, j.experience_min, j.experience_max,
         j.payrate, j.num_positions;

-- View 2: Candidate placement summary (student dashboard)
CREATE OR REPLACE VIEW vw_candidate_summary AS
SELECT
    c.candidate_id,
    c.full_name,
    c.category,
    c.cgpa,
    COUNT(a.application_id)                          AS total_applications,
    SUM(a.status = 'shortlisted')                    AS shortlisted,
    SUM(a.status = 'hired')                          AS hired,
    MAX(a.similarity_score)                          AS best_match_score
FROM candidates  c
LEFT JOIN applications a ON a.candidate_id = c.candidate_id
GROUP BY c.candidate_id, c.full_name, c.category, c.cgpa;

-- Query the views
SELECT * FROM vw_active_jobs ORDER BY applicant_count DESC;
SELECT * FROM vw_candidate_summary ORDER BY best_match_score DESC;
