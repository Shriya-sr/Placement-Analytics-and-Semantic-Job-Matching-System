-- ============================================================================
-- Placement Analytics and Semantic Job Matching System
-- ============================================================================
-- File: database/schema.sql
-- Role: Core Database Definition Language (DDL) & Relational Schema Architecture
--
-- Syllabus Coverage (PES University DBMS Level 3 Mini-Project):
--   • Unit 1: Entity-Relationship (ER) to Relational Mapping, Core DDL Statements
--             (CREATE, ALTER, DROP), Integrity Constraints, Indexing.
--   • Unit 3: Normalization Theory (1NF, 2NF, 3NF Decomposition), Anomaly Prevention.
--
-- Team Members (Compulsory Announcement):
--   • Shriya S R (PES1UG24CS449) — Member 1 (Lead: DB Architecture & Transaction Systems)
--   • Ahana S S  (PES1UG24CS910) — Member 2 (Lead: Analytical Queries & Vector DB Architect)
-- ============================================================================

-- ============================================================================
-- 1. DATABASE CREATION & CHARACTER ENCODING SPECIFICATION
-- ============================================================================
-- RATIONALE:
--   - utf8mb4: Full Unicode support covering 4 bytes per character. Crucial for
--     storing unstructured technical resume text containing emojis, special mathematical
--     symbols, accents, and non-ASCII characters without data corruption.
--   - utf8mb4_unicode_ci: Collation providing culturally accurate, case-insensitive
--     comparisons and sort orders compliant with Unicode standard 9.0+.
CREATE DATABASE IF NOT EXISTS placement_analytics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE placement_analytics;

-- ============================================================================
-- 2. REVERSE TOPOLOGICAL DROP ORDER (Preserving Referential Integrity)
-- ============================================================================
-- DBMS THEORY (Referential Integrity Constraint):
--   A parent table cannot be dropped while child tables possess Foreign Keys
--   referencing its Primary Key (would result in ERROR 1217: Cannot delete or
--   update a parent row: a foreign key constraint fails).
--   To ensure idempotent re-runs, tables MUST be dropped in the exact REVERSE
--   order of foreign key dependency:
--     audit_logs -> applications -> job_skills -> candidate_skills ->
--     skills -> jobs -> companies -> candidates -> users
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS job_skills;
DROP TABLE IF EXISTS candidate_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- 3. CORE RELATIONAL TABLES IN THIRD NORMAL FORM (3NF)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE 1: users (Central Authentication & Role-Based Authorization Master)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • 1NF: All attributes contain atomic, indivisible scalar values.
--   • 2NF: The primary key is single-column (user_id); no partial dependencies exist.
--   • 3NF: No transitive functional dependencies. All attributes (email, pass_hash,
--          role, created_at) are functionally dependent strictly on user_id.
-- SECURITY & DATA MODEL:
--   Decouples user credentials from candidate and recruiter domain profiles.
--   A user can be a 'student', 'recruiter', or 'admin'.
CREATE TABLE users (
    user_id    INT            NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255)   NOT NULL,
    pass_hash  VARCHAR(255)   NOT NULL,
    role       ENUM('student','recruiter','admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    -- Entity Integrity: Ensures unique identifier for every actor in the system.
    CONSTRAINT pk_users        PRIMARY KEY (user_id),
    -- Domain Integrity: Disallows duplicate registration using the same email address.
    CONSTRAINT uq_users_email  UNIQUE      (email)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 2: candidates (Student Academic & Biographical Master Entity)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • Normalization: Separates biographical profile data from authentication data.
--   • Functional Dependencies:
--       candidate_id -> {user_id, full_name, phone, category, resume_text, education_level}
--       user_id -> candidate_id (1:1 candidate to user account correspondence)
--   • Anomaly Prevention: If user changes their password, candidate data remains
--     untouched, preventing modification and update anomalies.
CREATE TABLE candidates (
    candidate_id    INT          NOT NULL AUTO_INCREMENT,
    user_id         INT          NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    category        VARCHAR(100) NOT NULL COMMENT 'Domain / job family e.g. Data Science, Java Developer',
    resume_text     LONGTEXT     COMMENT 'Extracted raw resume text converted into vector embeddings',
    education_level VARCHAR(100) COMMENT 'Highest degree completed or in-progress',
    --
    -- Entity Integrity
    CONSTRAINT pk_candidates     PRIMARY KEY (candidate_id),
    -- 1:1 Relationship Enforcement: A user account can correspond to at most one candidate profile.
    CONSTRAINT uq_candidates_uid UNIQUE      (user_id),
    -- Referential Integrity: If a user account is deleted, the candidate record is deleted cascade-wise.
    CONSTRAINT fk_cand_user      FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 3: companies (Recruiter Corporate Entity)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • Functional Dependencies: company_id -> {user_id, company_name, industry, location}
--   • 1:1 relationship with users table; represents verified employer accounts.
--   • Separating company data avoids repeating corporate details for every job posted.
CREATE TABLE companies (
    company_id   INT          NOT NULL AUTO_INCREMENT,
    user_id      INT          NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry     VARCHAR(255),
    location     VARCHAR(500) COMMENT 'Corporate Headquarters or Regional Office City',
    --
    CONSTRAINT pk_companies    PRIMARY KEY (company_id),
    -- 1:1 Relationship Enforcement: Each recruiter account corresponds to one employer entity.
    CONSTRAINT uq_comp_uid     UNIQUE      (user_id),
    -- Referential Integrity: Cascades user account modifications to company profile.
    CONSTRAINT fk_comp_user    FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 4: jobs (Employment Opportunities & Vacancy Tracking)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • Binary 1:N Relationship: One Company posts Many Jobs.
--   • Foreign key company_id places the reference on the N-side of the relationship.
--   • Prevents Insertion Anomaly: A job cannot exist without being tied to a valid registered company.
CREATE TABLE jobs (
    job_id          INT          NOT NULL AUTO_INCREMENT,
    company_id      INT          NOT NULL,
    job_title       VARCHAR(255) NOT NULL,
    job_description LONGTEXT     COMMENT 'Full role description; indexed for Full-Text Search',
    experience_min  DECIMAL(4,1) NOT NULL DEFAULT 0 COMMENT 'Minimum required experience in years',
    experience_max  DECIMAL(4,1) COMMENT 'Maximum experience threshold in years',
    payrate         VARCHAR(500) COMMENT 'Salary band e.g. INR 8,00,000 - 14,00,000 P.A',
    location        VARCHAR(500) COMMENT 'Posting location / remote specification',
    status          ENUM('open','closed') NOT NULL DEFAULT 'open',
    posted_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_jobs                PRIMARY KEY (job_id),
    -- Referential Integrity: If a company profile is removed, all its active job listings are pruned.
    CONSTRAINT fk_job_company         FOREIGN KEY (company_id)
        REFERENCES companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- Domain Integrity Constraints: Check constraints enforce logical bounds on numeric ranges.
    CONSTRAINT chk_experience         CHECK (experience_min >= 0),
    CONSTRAINT chk_exp_range          CHECK (experience_max IS NULL OR experience_max >= experience_min)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 5: skills (Normalized Skills Master Catalog)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • Crucial for 3NF: Without this master catalog, storing skill strings inside
--     candidates or jobs creates redundancy, spelling anomalies, and transitive dependencies.
--   • Functional Dependency: skill_id -> {skill_name, category}
CREATE TABLE skills (
    skill_id   INT          NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(150) NOT NULL COMMENT 'Canonical skill identifier e.g. Python, Spring Boot',
    category   VARCHAR(100) COMMENT 'Broad classification: Programming, Database, Frontend, AI/ML',
    --
    CONSTRAINT pk_skills       PRIMARY KEY (skill_id),
    -- Prevents duplicate skill synonyms in master table.
    CONSTRAINT uq_skill_name   UNIQUE      (skill_name)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 6: candidate_skills (M:N Bridge: Candidates <-> Skills)
-- ----------------------------------------------------------------------------
-- 2NF & 3NF ANALYSIS:
--   • Decomposes the Many-to-Many relationship between Candidates and Skills.
--   • Composite Primary Key: (candidate_id, skill_id).
--   • 2NF Proof: Non-key attribute 'proficiency' depends on BOTH candidate_id and
--     skill_id together (Alice's proficiency in Python may be expert, but Bob's may be beginner).
--     There are NO partial functional dependencies.
CREATE TABLE candidate_skills (
    candidate_id INT         NOT NULL,
    skill_id     INT         NOT NULL,
    proficiency  ENUM('beginner','intermediate','expert') DEFAULT 'intermediate',
    --
    -- Composite Entity Integrity
    CONSTRAINT pk_cand_skill  PRIMARY KEY (candidate_id, skill_id),
    -- Dual Referential Integrity Constraints with Cascades
    CONSTRAINT fk_cs_cand     FOREIGN KEY (candidate_id)
        REFERENCES candidates(candidate_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cs_skill    FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)         ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 7: job_skills (M:N Bridge: Jobs <-> Skills)
-- ----------------------------------------------------------------------------
-- 2NF & 3NF ANALYSIS:
--   • Decomposes the Many-to-Many relationship between Job Openings and Skills.
--   • Composite Primary Key: (job_id, skill_id).
--   • Attribute 'is_mandatory' indicates whether the skill is a strict prerequisite (1)
--     or a preferred bonus (0).
CREATE TABLE job_skills (
    job_id       INT        NOT NULL,
    skill_id     INT        NOT NULL,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1
                 COMMENT '1 = Required prerequisite, 0 = Preferred secondary skill',
    --
    CONSTRAINT pk_job_skill  PRIMARY KEY (job_id, skill_id),
    CONSTRAINT fk_js_job     FOREIGN KEY (job_id)
        REFERENCES jobs(job_id)     ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_js_skill   FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 8: applications (M:N Relationship: Candidates <-> Jobs with AI Similarity)
-- ----------------------------------------------------------------------------
-- 3NF ANALYSIS:
--   • Represents a student candidate applying to an open job position.
--   • Holds descriptive relationship attributes: status, similarity_score, applied_at.
--   • similarity_score: Normalized Cosine Similarity (0.0000 to 1.0000) generated
--     by ChromaDB HNSW vector search comparing candidate resume against job description.
CREATE TABLE applications (
    application_id   INT  NOT NULL AUTO_INCREMENT,
    job_id           INT  NOT NULL,
    candidate_id     INT  NOT NULL,
    status           ENUM('applied','reviewed','shortlisted','rejected','hired')
                     NOT NULL DEFAULT 'applied',
    similarity_score DECIMAL(5,4)
                     COMMENT 'Cosine similarity from ChromaDB vector search (0.0000 to 1.0000)',
    applied_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_applications      PRIMARY KEY (application_id),
    -- Business Invariant: A candidate can only apply ONCE to any specific job opening.
    CONSTRAINT uq_one_application   UNIQUE      (job_id, candidate_id),
    -- Referential Integrity: Dual foreign keys with cascading deletions.
    CONSTRAINT fk_app_job           FOREIGN KEY (job_id)
        REFERENCES jobs(job_id)           ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_app_candidate     FOREIGN KEY (candidate_id)
        REFERENCES candidates(candidate_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- Domain Integrity: Verifies that vector scores remain strictly within [0.0, 1.0].
    CONSTRAINT chk_score            CHECK (similarity_score IS NULL
                                        OR (similarity_score >= 0 AND similarity_score <= 1))
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- TABLE 9: audit_logs (Append-Only Compliance & Transaction Log)
-- ----------------------------------------------------------------------------
-- DBMS CONCEPTS:
--   • Populated automatically by database TRIGGERS (Phase 3).
--   • Implements tamper-evident change-data-capture (CDC) for enterprise compliance.
--   • Records table name, action type (INSERT, UPDATE, DELETE), modified ID, and timestamp.
CREATE TABLE audit_logs (
    log_id      INT          NOT NULL AUTO_INCREMENT,
    table_name  VARCHAR(100) NOT NULL,
    action_type ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    record_id   INT,
    changed_by  INT          COMMENT 'Foreign key reference to users.user_id (or NULL for system)',
    description TEXT,
    happened_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_audit_logs PRIMARY KEY (log_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. B-TREE INDEXING STRATEGY (Query Optimization)
-- ============================================================================
-- DBMS THEORY:
--   Primary keys in InnoDB are automatically Clustered Indexes (data stored on leaf pages).
--   Secondary B-Tree indexes below avoid expensive full-table scans (O(N)) on high-frequency
--   WHERE, JOIN, and ORDER BY predicates, reducing lookup time to logarithmic complexity O(log N).
CREATE INDEX idx_jobs_title    ON jobs(job_title);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status   ON jobs(status);
CREATE INDEX idx_apps_status   ON applications(status);
CREATE INDEX idx_cand_category ON candidates(category);

-- ============================================================================
-- 5. SCHEMA EVOLUTION (ALTER TABLE Demonstrations)
-- ============================================================================
-- Demonstrates non-destructive DDL modifications adding domain constraints post-creation:
-- 5.1 Add CGPA column to candidates table with domain range validation
ALTER TABLE candidates ADD COLUMN cgpa DECIMAL(4,2) DEFAULT NULL
    COMMENT 'Cumulative Grade Point Average (0.00 to 10.00 scale)';
ALTER TABLE candidates ADD CONSTRAINT chk_cgpa
    CHECK (cgpa IS NULL OR (cgpa >= 0.00 AND cgpa <= 10.00));

-- 5.2 Add total vacancies count to jobs table
ALTER TABLE jobs ADD COLUMN num_positions SMALLINT UNSIGNED DEFAULT 1
    COMMENT 'Total available open headcount for the posting';

-- ============================================================================
-- 6. FULL-TEXT SEARCH INVERTED INDEXES
-- ============================================================================
-- DBMS THEORY:
--   Unlike standard B-Trees that only support prefix matching (LIKE 'pattern%'),
--   FULLTEXT indexes build an inverted word-to-document index supporting natural
--   language token matching, relevance ranking, and stopword pruning.
ALTER TABLE jobs ADD FULLTEXT INDEX ft_jobs (job_title, job_description);

-- ============================================================================
-- 7. STAGING TABLES (ETL Data Pipeline Landing Zone)
-- ============================================================================
-- Staging tables accept raw CSV records from Kaggle/Naukri datasets prior to
-- normalization, cleansing, and insertion into 3NF master entities via data/etl.py.
DROP TABLE IF EXISTS raw_resumes;
CREATE TABLE raw_resumes (
    raw_id      INT AUTO_INCREMENT PRIMARY KEY,
    category    VARCHAR(100),
    resume_text LONGTEXT
) ENGINE=InnoDB;

DROP TABLE IF EXISTS raw_jobs;
CREATE TABLE raw_jobs (
    raw_id               INT AUTO_INCREMENT PRIMARY KEY,
    company              VARCHAR(255),
    education            TEXT,
    experience           VARCHAR(100),
    industry             VARCHAR(255),
    jobdescription       LONGTEXT,
    jobid                VARCHAR(100),
    joblocation_address  VARCHAR(500),
    jobtitle             VARCHAR(255),
    numberofpositions    VARCHAR(50),
    payrate              VARCHAR(500),
    postdate             VARCHAR(100),
    skills               TEXT,
    uniq_id              VARCHAR(100)
) ENGINE=InnoDB;

ALTER TABLE raw_resumes ADD FULLTEXT INDEX ft_resumes (resume_text);

-- Verification Check:
SHOW TABLES;
