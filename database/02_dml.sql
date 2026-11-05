-- ============================================================================
-- Placement Analytics and Semantic Job Matching System
-- ============================================================================
-- File: database/02_dml.sql
-- Role: Data Manipulation Language (DML) Operations & Data Modification Workflow
--
-- Syllabus Coverage (PES University DBMS Level 3 Mini-Project):
--   • Unit 2: Single-row & Multi-row Batch INSERT, Idempotent Upserts,
--             Targeted Business UPDATEs, Referential-Scoped DELETEs,
--             Handling of NULLs, and Transaction Integrity.
--
-- Team Members:
--   • Shriya S R (PES1UG24CS449) — Member 1 (Lead: DB Architecture & Transaction Systems)
--   • Ahana S S  (PES1UG24CS910) — Member 2 (Lead: Analytical Queries & Vector DB Architect)
-- ============================================================================

-- Select the database that will receive the seed rows and DML demonstrations.
USE placement_analytics;

-- ============================================================================
-- ARCHITECTURAL NOTE: SEED DATA vs. BULK PRODUCTION DATASET
-- ============================================================================
-- In accordance with academic best practices:
--   • database/02_dml.sql provides an annotated demonstration of DML syntax:
--     batch inserts, upserts, status transitions, grade adjustments, and safe deletions.
--   • The FULL real-world dataset (962 candidate resumes and 22,000 job postings)
--     is ingested via the automated Python pipeline in data/etl.py using
--     batch streaming (executemany in chunks of 500) to avoid client memory overload.
-- ============================================================================

-- ============================================================================
-- 1. INSERT OPERATIONS (Populating 3NF Master & Bridge Entities)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Insert User Accounts with Distinct Role-Based Authorization
-- ----------------------------------------------------------------------------
-- DBMS CONCEPT (Idempotent Upsert):
--   'ON DUPLICATE KEY UPDATE' ensures that if this seeding script is executed
--   multiple times, MySQL detects the duplicate unique key on 'email' and
--   updates the role instead of throwing an ER_DUP_ENTRY (Error 1062) exception.
INSERT INTO users (email, pass_hash, role) VALUES
    ('admin@placementportal.com', '$2b$12$admin_hash_sample_secret', 'admin'),
    ('recruiter@tcs.com',         '$2b$12$recruiter1_hash_sample',   'recruiter'),
    ('recruiter@infosys.com',     '$2b$12$recruiter2_hash_sample',   'recruiter'),
    ('recruiter@google.com',      '$2b$12$recruiter3_hash_sample',   'recruiter'),
    ('alice@pes.edu',             '$2b$12$student_alice_hash',      'student'),
    ('bob@pes.edu',               '$2b$12$student_bob_hash',        'student'),
    ('carol@pes.edu',             '$2b$12$student_carol_hash',      'student'),
    ('david@pes.edu',             '$2b$12$student_david_hash',      'student'),
    ('eve@pes.edu',               '$2b$12$student_eve_hash',        'student')
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- ----------------------------------------------------------------------------
-- 1.2 Insert Verified Employer Profiles (1:1 Correspondence with users)
-- ----------------------------------------------------------------------------
-- Foreign key 'user_id' links each company to its corresponding recruiter account.
INSERT INTO companies (user_id, company_name, industry, location) VALUES
    (2, 'Tata Consultancy Services', 'IT Services',          'Bengaluru'),
    (3, 'Infosys',                   'IT Services',          'Bengaluru'),
    (4, 'Google India',              'Internet / Software',  'Hyderabad')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- ----------------------------------------------------------------------------
-- 1.3 Insert Student Candidate Profiles (1:1 Correspondence with users)
-- ----------------------------------------------------------------------------
-- Contains student academic profile, verified CGPA, and resume content
-- that is transformed into 384-dimensional dense embeddings by ChromaDB.
INSERT INTO candidates (user_id, full_name, phone, category, education_level, cgpa, resume_text) VALUES
    (5, 'Alice Sharma',   '9876543210', 'Data Science',     'B.Tech Computer Science',  8.90,
        'Experienced in Python, Machine Learning, SQL, TensorFlow, scikit-learn, Pandas, and NumPy. Built predictive analytics pipelines.'),
    (6, 'Bob Menon',      '9123456780', 'Java Developer',   'B.Tech Information Science', 7.50,
        'Strong Java developer proficient with Spring Boot, Hibernate, MySQL, REST APIs, Maven, and Git microservices.'),
    (7, 'Carol D''Souza', '9988776655', 'Data Science',     'M.Tech Data Science',      9.10,
        'Deep learning enthusiast skilled in Python, PyTorch, NLP transformers, Computer Vision, SQL, and Tableau dashboards.'),
    (8, 'David Nair',     '8877665544', 'Web Development',  'BCA Computer Applications',6.80,
        'Frontend web developer experienced in JavaScript, React, Next.js, HTML5, CSS3, TailwindCSS, and Node.js backend integration.'),
    (9, 'Eve Patel',      '7766554433', 'Python Developer', 'B.Tech Computer Science',  8.20,
        'Backend developer proficient in Python, Django, FastAPI, PostgreSQL, Docker containerisation, and CI/CD pipelines.')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), cgpa = VALUES(cgpa);

-- ----------------------------------------------------------------------------
-- 1.4 Insert Master Skills Catalog (Master Data Management)
-- ----------------------------------------------------------------------------
-- Normalized skills catalog preventing string redundancy across candidate profiles.
INSERT INTO skills (skill_name, category) VALUES
    ('Python',           'Programming'),
    ('Java',             'Programming'),
    ('JavaScript',       'Programming'),
    ('SQL',              'Database'),
    ('Machine Learning', 'AI/ML'),
    ('Deep Learning',    'AI/ML'),
    ('React',            'Frontend'),
    ('Spring Boot',      'Backend'),
    ('Django',           'Backend'),
    ('Docker',           'DevOps'),
    ('MySQL',            'Database'),
    ('NLP',              'AI/ML'),
    ('TensorFlow',       'AI/ML'),
    ('REST APIs',        'Backend'),
    ('HTML',             'Frontend'),
    ('CSS',              'Frontend'),
    ('FastAPI',          'Backend'),
    ('Next.js',          'Frontend')
ON DUPLICATE KEY UPDATE category = VALUES(category);

-- ----------------------------------------------------------------------------
-- 1.5 Map Candidate Skills (M:N Bridge Population with Proficiency)
-- ----------------------------------------------------------------------------
-- DBMS CONCEPT (INSERT IGNORE):
--   If a candidate-skill pair already exists, 'INSERT IGNORE' silently skips
--   the insertion without aborting the batch transaction.
INSERT IGNORE INTO candidate_skills (candidate_id, skill_id, proficiency) VALUES
    -- Alice Sharma (Data Science & ML Specialist)
    (1, 1, 'expert'),        -- Python
    (1, 4, 'expert'),        -- SQL
    (1, 5, 'expert'),        -- Machine Learning
    (1, 13, 'intermediate'), -- TensorFlow
    -- Bob Menon (Enterprise Java Developer)
    (2, 2, 'expert'),        -- Java
    (2, 4, 'intermediate'), -- SQL
    (2, 8, 'expert'),        -- Spring Boot
    (2, 14, 'expert'),       -- REST APIs
    -- Carol D'Souza (Advanced Deep Learning & NLP Researcher)
    (3, 1, 'expert'),        -- Python
    (3, 4, 'expert'),        -- SQL
    (3, 5, 'expert'),        -- Machine Learning
    (3, 6, 'expert'),        -- Deep Learning
    (3, 12, 'expert'),       -- NLP
    -- David Nair (Modern Full Stack Web Developer)
    (4, 3, 'expert'),        -- JavaScript
    (4, 7, 'expert'),        -- React
    (4, 15, 'expert'),       -- HTML
    (4, 16, 'expert'),       -- CSS
    (4, 18, 'intermediate'), -- Next.js
    -- Eve Patel (Cloud Backend & DevOps Engineer)
    (5, 1, 'expert'),        -- Python
    (5, 4, 'intermediate'), -- SQL
    (5, 9, 'expert'),        -- Django
    (5, 10, 'expert'),       -- Docker
    (5, 17, 'expert');       -- FastAPI

-- ----------------------------------------------------------------------------
-- 1.6 Insert Job Postings (1:N from Companies)
-- ----------------------------------------------------------------------------
-- Represents live openings offering distinct salary ranges, vacancy counts,
-- and experience criteria enforced by CHECK constraints.
INSERT INTO jobs (company_id, job_title, job_description, experience_min, experience_max, payrate, location, status, num_positions) VALUES
    (1, 'Data Analyst',
        'Analyze large-scale enterprise datasets using Python and SQL. Design automated BI dashboards and predictive reports.',
        0, 2, 'INR 6,00,000 - 10,00,000 P.A', 'Bengaluru', 'open', 5),
    (1, 'Java Backend Engineer',
        'Develop microservices using Java, Spring Boot, and MySQL. Build secure RESTful APIs and optimise database queries.',
        1, 3, 'INR 8,00,000 - 14,00,000 P.A', 'Bengaluru', 'open', 3),
    (2, 'Machine Learning Engineer',
        'Train and deploy production ML and NLP models with PyTorch, TensorFlow, and Python. Experience in semantic search is a plus.',
        0, 3, 'INR 10,00,000 - 18,00,000 P.A', 'Bengaluru', 'open', 2),
    (3, 'Full Stack Web Developer',
        'Build responsive web interfaces using Next.js, React, and Tailwind. Integrate with backend REST/GraphQL APIs and relational DBs.',
        0, 2, 'INR 7,00,000 - 12,00,000 P.A', 'Hyderabad', 'open', 4),
    (3, 'Python Cloud Backend Engineer',
        'Design scalable cloud services using Python, Django, FastAPI, Docker, and MySQL. Maintain CI/CD automation pipelines.',
        1, 4, 'INR 12,00,000 - 20,00,000 P.A', 'Hyderabad', 'open', 2)
ON DUPLICATE KEY UPDATE job_title = VALUES(job_title);

-- ----------------------------------------------------------------------------
-- 1.7 Map Required Skills per Job Opening (M:N Bridge with Mandatory Flags)
-- ----------------------------------------------------------------------------
-- is_mandatory = 1 denotes a mandatory prerequisite; 0 denotes an optional preferred skill.
INSERT IGNORE INTO job_skills (job_id, skill_id, is_mandatory) VALUES
    -- Job 1: Data Analyst (Mandatory: Python, SQL, ML; Preferred: TensorFlow)
    (1, 1, 1), (1, 4, 1), (1, 5, 1), (1, 13, 0),
    -- Job 2: Java Backend Engineer (Mandatory: Java, Spring Boot, MySQL, REST APIs)
    (2, 2, 1), (2, 8, 1), (2, 11, 1), (2, 14, 1),
    -- Job 3: Machine Learning Engineer (Mandatory: Python, ML, Deep Learning; Preferred: NLP, TensorFlow)
    (3, 1, 1), (3, 5, 1), (3, 6, 1), (3, 12, 0), (3, 13, 0),
    -- Job 4: Full Stack Web Developer (Mandatory: JS, React, HTML, CSS; Preferred: Next.js)
    (4, 3, 1), (4, 7, 1), (4, 15, 1), (4, 16, 1), (4, 18, 0),
    -- Job 5: Python Cloud Backend Engineer (Mandatory: Python, Django, Docker; Preferred: FastAPI)
    (5, 1, 1), (5, 9, 1), (5, 10, 1), (5, 17, 0);

-- ----------------------------------------------------------------------------
-- 1.8 Insert Applications with AI Cosine Similarity Scores
-- ----------------------------------------------------------------------------
-- Demonstrates integration between Vector DB and Relational Schema:
-- similarity_score is computed in ChromaDB and synchronized into MySQL.
INSERT INTO applications (job_id, candidate_id, status, similarity_score) VALUES
    (1, 1, 'shortlisted', 0.9210),   -- Alice -> Data Analyst (92.1% High Match)
    (1, 3, 'applied',     0.8870),   -- Carol -> Data Analyst (88.7%)
    (2, 2, 'reviewed',    0.8100),   -- Bob   -> Java Backend (81.0%)
    (3, 1, 'applied',     0.8540),   -- Alice -> ML Engineer (85.4%)
    (3, 3, 'shortlisted', 0.9600),   -- Carol -> ML Engineer (96.0% Top Match)
    (4, 4, 'applied',     0.7900),   -- David -> Full Stack (79.0%)
    (5, 5, 'hired',       0.9750),   -- Eve   -> Python Backend (97.5% Hired)
    (5, 1, 'rejected',    0.6200)    -- Alice -> Python Backend (62.0%)
ON DUPLICATE KEY UPDATE similarity_score = VALUES(similarity_score);


-- ============================================================================
-- 2. TARGETED BUSINESS UPDATE OPERATIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Workflow Progression: Recruiter Shortlisting a Candidate
-- ----------------------------------------------------------------------------
-- Transitions application status from 'applied' to 'shortlisted' for a specific candidate.
-- Trigger trg_after_application_update automatically captures this transition in audit_logs.
UPDATE applications
SET    status = 'shortlisted'
WHERE  job_id = 4 AND candidate_id = 4 AND status = 'applied';

-- ----------------------------------------------------------------------------
-- 2.2 Profile Maintenance: Candidate CGPA Revision Post-Semester
-- ----------------------------------------------------------------------------
-- Trigger trg_before_candidate_update intercepts this write, validates that 9.25
-- is within [0.00, 10.00], and creates an audit entry recording the old and new grade.
UPDATE candidates
SET    cgpa = 9.25
WHERE  candidate_id = 1;

-- ----------------------------------------------------------------------------
-- 2.3 Job Management: Updating Headcount and Compensation Band
-- ----------------------------------------------------------------------------
-- Increments position availability and adjusts pay range for competitive hiring.
UPDATE jobs
SET    payrate = 'INR 11,00,000 - 19,00,000 P.A',
       num_positions = num_positions + 1
WHERE  job_id = 3;

-- ----------------------------------------------------------------------------
-- 2.4 Automatic State Transition: Closing a Filled Job Opening
-- ----------------------------------------------------------------------------
-- Updates status to 'closed' when open positions reach 0.
UPDATE jobs
SET    status = 'closed'
WHERE  job_id = 5 AND num_positions = 0;


-- ============================================================================
-- 3. SCOPED DELETE OPERATIONS (With Referential Scoping)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Safely Removing Duplicate / Rejected Application Record
-- ----------------------------------------------------------------------------
-- Scoped with multiple predicates to ensure valid active applications are untouched.
DELETE FROM applications
WHERE  job_id = 5 
  AND  candidate_id = 1 
  AND  status = 'rejected';

-- ----------------------------------------------------------------------------
-- 3.2 Pruning Obsolete Skill Mapping from Bridge Table
-- ----------------------------------------------------------------------------
-- Deletes a misassigned skill from candidate_skills without deleting the master skill row.
DELETE FROM candidate_skills
WHERE  candidate_id = 2 
  AND  skill_id = 15; -- Prune HTML from Java backend specialist profile

-- ----------------------------------------------------------------------------
-- Count the main entity rows together so the seed operation can be checked at a glance.
-- ----------------------------------------------------------------------------
SELECT 'users' AS tbl, COUNT(*) AS count FROM users
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'applications', COUNT(*) FROM applications;
