-- =============================================================
-- Placement Analytics & Semantic Job Matching System
-- Phase 1: Database Design & Core DDL (3NF Relational Schema)
-- Covers: Unit 1 - ER Model, Relational Schema, DDL, Constraints
--          Unit 3 - 1NF, 2NF, 3NF Normalization
-- =============================================================

CREATE DATABASE IF NOT EXISTS placement_analytics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE placement_analytics;

-- ---------------------------------------------------------------
-- DROP ORDER (reverse of FK dependency) for clean re-runs
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS job_skills;
DROP TABLE IF EXISTS candidate_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS users;

-- =============================================================
-- TABLE 1: users
-- Stores authentication credentials for all system actors.
-- Entity: User  |  Roles: student, recruiter, admin
-- =============================================================
CREATE TABLE users (
    user_id    INT            NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255)   NOT NULL,
    pass_hash  VARCHAR(255)   NOT NULL,
    role       ENUM('student','recruiter','admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_users        PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email  UNIQUE      (email)
);

-- =============================================================
-- TABLE 2: candidates
-- One student/candidate per user row (1:1 with users).
-- Normalised: bio & profile attributes separated from auth data.
-- =============================================================
CREATE TABLE candidates (
    candidate_id    INT          NOT NULL AUTO_INCREMENT,
    user_id         INT          NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    category        VARCHAR(100) NOT NULL COMMENT 'Domain / job family e.g. Data Science',
    resume_text     LONGTEXT,
    education_level VARCHAR(100),
    --
    CONSTRAINT pk_candidates     PRIMARY KEY (candidate_id),
    CONSTRAINT uq_candidates_uid UNIQUE      (user_id),
    CONSTRAINT fk_cand_user      FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================
-- TABLE 3: companies
-- One recruiter company per user row (1:1 with users).
-- =============================================================
CREATE TABLE companies (
    company_id   INT          NOT NULL AUTO_INCREMENT,
    user_id      INT          NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    industry     VARCHAR(255),
    location     VARCHAR(500),
    --
    CONSTRAINT pk_companies    PRIMARY KEY (company_id),
    CONSTRAINT uq_comp_uid     UNIQUE      (user_id),
    CONSTRAINT fk_comp_user    FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================
-- TABLE 4: jobs
-- Job postings. 1 company : many jobs.
-- =============================================================
CREATE TABLE jobs (
    job_id          INT          NOT NULL AUTO_INCREMENT,
    company_id      INT          NOT NULL,
    job_title       VARCHAR(255) NOT NULL,
    job_description LONGTEXT,
    experience_min  DECIMAL(4,1) NOT NULL DEFAULT 0,
    experience_max  DECIMAL(4,1),
    payrate         VARCHAR(500),
    location        VARCHAR(500),
    status          ENUM('open','closed') NOT NULL DEFAULT 'open',
    posted_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_jobs                PRIMARY KEY (job_id),
    CONSTRAINT fk_job_company         FOREIGN KEY (company_id)
        REFERENCES companies(company_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_experience         CHECK (experience_min >= 0),
    CONSTRAINT chk_exp_range          CHECK (experience_max IS NULL OR experience_max >= experience_min)
);

-- =============================================================
-- TABLE 5: skills
-- Normalised skill master table (avoids repeating skill names).
-- Satisfies 3NF: skill_name depends only on skill_id (PK).
-- =============================================================
CREATE TABLE skills (
    skill_id   INT          NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(150) NOT NULL,
    category   VARCHAR(100) COMMENT 'e.g. Programming, Database, Framework',
    --
    CONSTRAINT pk_skills       PRIMARY KEY (skill_id),
    CONSTRAINT uq_skill_name   UNIQUE      (skill_name)
);

-- =============================================================
-- TABLE 6: candidate_skills  (M:N bridge — candidates ↔ skills)
-- =============================================================
CREATE TABLE candidate_skills (
    candidate_id INT         NOT NULL,
    skill_id     INT         NOT NULL,
    proficiency  ENUM('beginner','intermediate','expert') DEFAULT 'intermediate',
    --
    CONSTRAINT pk_cand_skill  PRIMARY KEY (candidate_id, skill_id),
    CONSTRAINT fk_cs_cand     FOREIGN KEY (candidate_id)
        REFERENCES candidates(candidate_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_cs_skill    FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id)         ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================
-- TABLE 7: job_skills  (M:N bridge — jobs ↔ skills)
-- =============================================================
CREATE TABLE job_skills (
    job_id       INT  NOT NULL,
    skill_id     INT  NOT NULL,
    is_mandatory TINYINT(1) NOT NULL DEFAULT 1
                 COMMENT '1 = required, 0 = preferred',
    --
    CONSTRAINT pk_job_skill  PRIMARY KEY (job_id, skill_id),
    CONSTRAINT fk_js_job     FOREIGN KEY (job_id)
        REFERENCES jobs(job_id)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_js_skill   FOREIGN KEY (skill_id)
        REFERENCES skills(skill_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =============================================================
-- TABLE 8: applications
-- Candidate applies to a job. M:N resolved with extra attributes.
-- similarity_score: populated later by the vector matching layer.
-- =============================================================
CREATE TABLE applications (
    application_id   INT  NOT NULL AUTO_INCREMENT,
    job_id           INT  NOT NULL,
    candidate_id     INT  NOT NULL,
    status           ENUM('applied','reviewed','shortlisted','rejected','hired')
                     NOT NULL DEFAULT 'applied',
    similarity_score DECIMAL(5,4)
                     COMMENT 'Cosine similarity from vector DB (0.0000–1.0000)',
    applied_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_applications      PRIMARY KEY (application_id),
    CONSTRAINT uq_one_application   UNIQUE      (job_id, candidate_id),
    CONSTRAINT fk_app_job           FOREIGN KEY (job_id)
        REFERENCES jobs(job_id)           ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_app_candidate     FOREIGN KEY (candidate_id)
        REFERENCES candidates(candidate_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_score            CHECK (similarity_score IS NULL
                                        OR (similarity_score >= 0 AND similarity_score <= 1))
);

-- =============================================================
-- TABLE 9: audit_logs
-- Append-only log; populated by triggers (Phase 3 / Unit 2).
-- Keeps a record of who changed what and when.
-- =============================================================
CREATE TABLE audit_logs (
    log_id      INT          NOT NULL AUTO_INCREMENT,
    table_name  VARCHAR(100) NOT NULL,
    action_type ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    record_id   INT,
    changed_by  INT          COMMENT 'user_id or NULL for system actions',
    description TEXT,
    happened_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    --
    CONSTRAINT pk_audit_logs PRIMARY KEY (log_id)
);

-- ---------------------------------------------------------------
-- INDEXES (Unit 1: structure of SQL queries / query optimisation)
-- ---------------------------------------------------------------
CREATE INDEX idx_jobs_title    ON jobs(job_title);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status   ON jobs(status);
CREATE INDEX idx_apps_status   ON applications(status);
CREATE INDEX idx_cand_category ON candidates(category);

-- ---------------------------------------------------------------
-- ALTER TABLE demonstrations (required DDL coverage)
-- ---------------------------------------------------------------
ALTER TABLE candidates ADD COLUMN cgpa DECIMAL(4,2) DEFAULT NULL
    COMMENT 'GPA out of 10';
ALTER TABLE candidates ADD CONSTRAINT chk_cgpa
    CHECK (cgpa IS NULL OR (cgpa >= 0.00 AND cgpa <= 10.00));

ALTER TABLE jobs ADD COLUMN num_positions SMALLINT UNSIGNED DEFAULT 1;

-- ---------------------------------------------------------------
-- STAGING TABLES (raw CSV import landing zone)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS raw_resumes;
CREATE TABLE raw_resumes (
    raw_id      INT AUTO_INCREMENT PRIMARY KEY,
    category    VARCHAR(100),
    resume_text LONGTEXT
);

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
);

-- FULLTEXT index for Unit 2 full-text search queries
ALTER TABLE jobs ADD FULLTEXT INDEX ft_jobs (job_title, job_description);
ALTER TABLE raw_resumes ADD FULLTEXT INDEX ft_resumes (resume_text);

-- ---------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------
SHOW TABLES;
