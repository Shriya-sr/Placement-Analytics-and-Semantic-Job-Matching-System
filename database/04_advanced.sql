-- =============================================================
-- Placement Analytics & Semantic Job Matching System
-- Phase 3: Advanced SQL Concepts (Stored Procedures, Transactions, Triggers, Views)
-- Target File: database/04_advanced.sql
-- Covers: Unit 2 & Unit 3 - Stored Procedures with ACID Transactions,
--          Audit Log Triggers, Materialized/Standard SQL Views,
--          Referential & Business Rule Integrity
-- =============================================================

USE placement_analytics;

-- =============================================================
-- SECTION 1: VIEWS (Placement Analytics & Reporting)
-- =============================================================

-- View 1: Active Job Market Summary
-- Displays active job postings joined with company profile and applicant count
CREATE OR REPLACE VIEW vw_active_jobs AS
SELECT
    j.job_id,
    j.job_title,
    co.company_id,
    co.company_name,
    co.industry,
    j.location,
    j.experience_min,
    j.experience_max,
    j.payrate,
    j.num_positions,
    j.posted_at,
    COUNT(a.application_id) AS total_applicants,
    ROUND(AVG(a.similarity_score) * 100, 1) AS avg_applicant_match_pct
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
WHERE j.status = 'open'
GROUP BY j.job_id, j.job_title, co.company_id, co.company_name, co.industry,
         j.location, j.experience_min, j.experience_max, j.payrate,
         j.num_positions, j.posted_at;

-- View 2: Candidate Performance & Placement Summary (Student Portal View)
CREATE OR REPLACE VIEW vw_candidate_summary AS
SELECT
    c.candidate_id,
    c.user_id,
    c.full_name,
    c.category,
    c.education_level,
    c.cgpa,
    COUNT(a.application_id)                                  AS total_applied,
    SUM(CASE WHEN a.status = 'reviewed'    THEN 1 ELSE 0 END) AS in_review,
    SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
    SUM(CASE WHEN a.status = 'hired'       THEN 1 ELSE 0 END) AS hired,
    SUM(CASE WHEN a.status = 'rejected'    THEN 1 ELSE 0 END) AS rejected,
    ROUND(MAX(a.similarity_score) * 100, 2)                  AS highest_match_score_pct
FROM candidates c
LEFT JOIN applications a ON c.candidate_id = a.candidate_id
GROUP BY c.candidate_id, c.user_id, c.full_name, c.category, c.education_level, c.cgpa;

-- View 3: Company Recruitment KPIs & Conversion Funnel
CREATE OR REPLACE VIEW vw_company_analytics AS
SELECT
    co.company_id,
    co.company_name,
    co.industry,
    COUNT(DISTINCT j.job_id)                                     AS total_jobs_posted,
    SUM(CASE WHEN j.status = 'open' THEN 1 ELSE 0 END)           AS open_jobs,
    SUM(CASE WHEN j.status = 'closed' THEN 1 ELSE 0 END)         AS closed_jobs,
    COUNT(a.application_id)                                      AS total_applications_received,
    SUM(CASE WHEN a.status = 'shortlisted' THEN 1 ELSE 0 END)    AS candidates_shortlisted,
    SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END)          AS candidates_hired,
    ROUND(
        CASE 
            WHEN COUNT(a.application_id) > 0 
            THEN (SUM(CASE WHEN a.status = 'hired' THEN 1 ELSE 0 END) * 100.0) / COUNT(a.application_id)
            ELSE 0 
        END, 2
    ) AS hiring_conversion_rate_pct
FROM companies co
LEFT JOIN jobs j ON co.company_id = j.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
GROUP BY co.company_id, co.company_name, co.industry;

-- View 4: Skill Market Demand Breakdown
CREATE OR REPLACE VIEW vw_skill_demand AS
SELECT
    s.skill_id,
    s.skill_name,
    s.category,
    COUNT(DISTINCT js.job_id) AS demanding_jobs_count,
    SUM(CASE WHEN js.is_mandatory = 1 THEN 1 ELSE 0 END) AS mandatory_demand,
    SUM(CASE WHEN js.is_mandatory = 0 THEN 1 ELSE 0 END) AS preferred_demand,
    COUNT(DISTINCT cs.candidate_id) AS candidates_with_skill
FROM skills s
LEFT JOIN job_skills js ON s.skill_id = js.skill_id
LEFT JOIN candidate_skills cs ON s.skill_id = cs.skill_id
GROUP BY s.skill_id, s.skill_name, s.category;

-- View 5: Human-Readable System Audit History
CREATE OR REPLACE VIEW vw_audit_history AS
SELECT
    al.log_id,
    al.table_name,
    al.action_type,
    al.record_id,
    al.changed_by,
    u.email AS actor_email,
    u.role  AS actor_role,
    al.description,
    al.happened_at
FROM audit_logs al
LEFT JOIN users u ON al.changed_by = u.user_id
ORDER BY al.happened_at DESC;


-- =============================================================
-- SECTION 2: TRIGGERS (Automated Audit Trails & Integrity Checks)
-- =============================================================

DROP TRIGGER IF EXISTS trg_after_application_insert;
DROP TRIGGER IF EXISTS trg_after_application_update;
DROP TRIGGER IF EXISTS trg_after_application_delete;
DROP TRIGGER IF EXISTS trg_after_job_status_change;
DROP TRIGGER IF EXISTS trg_before_candidate_update;

DELIMITER $$

-- Trigger 1: Log every new job application into audit_logs
CREATE TRIGGER trg_after_application_insert
AFTER INSERT ON applications
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
    VALUES (
        'applications',
        'INSERT',
        NEW.application_id,
        NULL,
        CONCAT('New application submitted: Candidate ID ', NEW.candidate_id, 
               ' applied to Job ID ', NEW.job_id, 
               ' with match score ', COALESCE(ROUND(NEW.similarity_score * 100, 2), 'N/A'), '%'),
        NOW()
    );
END$$

-- Trigger 2: Log state transitions of applications (e.g., applied -> shortlisted -> hired)
CREATE TRIGGER trg_after_application_update
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
        VALUES (
            'applications',
            'UPDATE',
            NEW.application_id,
            NULL,
            CONCAT('Application status updated for Candidate ID ', NEW.candidate_id,
                   ' on Job ID ', NEW.job_id, 
                   ' from [', OLD.status, '] to [', NEW.status, ']'),
            NOW()
        );
    END IF;
END$$

-- Trigger 3: Log application deletion / withdrawal
CREATE TRIGGER trg_after_application_delete
AFTER DELETE ON applications
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
    VALUES (
        'applications',
        'DELETE',
        OLD.application_id,
        NULL,
        CONCAT('Application withdrawn/deleted: Candidate ID ', OLD.candidate_id, ' from Job ID ', OLD.job_id),
        NOW()
    );
END$$

-- Trigger 4: Log Job Status Changes (e.g. open -> closed)
CREATE TRIGGER trg_after_job_status_change
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
        VALUES (
            'jobs',
            'UPDATE',
            NEW.job_id,
            NULL,
            CONCAT('Job ID ', NEW.job_id, ' (', NEW.job_title, ') status changed from [', OLD.status, '] to [', NEW.status, ']'),
            NOW()
        );
    END IF;
END$$

-- Trigger 5: Candidate profile integrity check & audit logging
CREATE TRIGGER trg_before_candidate_update
BEFORE UPDATE ON candidates
FOR EACH ROW
BEGIN
    -- Prevent invalid CGPA values
    IF NEW.cgpa IS NOT NULL AND (NEW.cgpa < 0.00 OR NEW.cgpa > 10.00) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity Violation: CGPA must be between 0.00 and 10.00';
    END IF;

    -- Audit CGPA update if modified (null-safe)
    IF NOT (OLD.cgpa <=> NEW.cgpa) THEN
        INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
        VALUES (
            'candidates',
            'UPDATE',
            NEW.candidate_id,
            NEW.user_id,
            CONCAT('Candidate ', NEW.full_name, ' CGPA updated from ', COALESCE(OLD.cgpa, 'NULL'), ' to ', COALESCE(NEW.cgpa, 'NULL')),
            NOW()
        );
    END IF;
END$$

DELIMITER ;


-- =============================================================
-- SECTION 3: STORED PROCEDURES WITH TRANSACTION MANAGEMENT
-- Demonstrates START TRANSACTION, COMMIT, ROLLBACK, and Exception Handlers
-- =============================================================

DROP PROCEDURE IF EXISTS sp_apply_job;
DROP PROCEDURE IF EXISTS sp_hire_candidate;
DROP PROCEDURE IF EXISTS sp_post_job_with_audit;

DELIMITER $$

-- =============================================================
-- Procedure 1: sp_apply_job
-- Transactional procedure for student application:
-- 1. Validates candidate existence
-- 2. Validates job existence and active 'open' status
-- 3. Checks for duplicate application
-- 4. Inserts into applications table
-- 5. Logs audit event atomically
-- =============================================================
CREATE PROCEDURE sp_apply_job(
    IN  p_candidate_id     INT,
    IN  p_job_id           INT,
    IN  p_similarity_score DECIMAL(5,4),
    OUT p_status_code      INT,         -- 0 = Success, 1 = Error
    OUT p_status_message   VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_job_status   VARCHAR(20);
    DECLARE v_cand_exists  INT DEFAULT 0;
    DECLARE v_app_exists   INT DEFAULT 0;

    -- Error handler: if any SQL exception occurs, rollback changes
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 1;
        SET p_status_message = 'Transaction Failed: SQLEXCEPTION encountered during job application. Rolled back.';
    END;

    -- Validation 1: Candidate exists
    SELECT COUNT(*) INTO v_cand_exists FROM candidates WHERE candidate_id = p_candidate_id;
    IF v_cand_exists = 0 THEN
        SET p_status_code = 1;
        SET p_status_message = 'Error: Specified Candidate ID does not exist.';
        LEAVE proc_label;
    END IF;

    -- Validation 2: Job exists and is open
    SELECT status INTO v_job_status FROM jobs WHERE job_id = p_job_id;
    IF v_job_status IS NULL THEN
        SET p_status_code = 1;
        SET p_status_message = 'Error: Specified Job ID does not exist.';
        LEAVE proc_label;
    ELSEIF v_job_status <> 'open' THEN
        SET p_status_code = 1;
        SET p_status_message = 'Error: This job listing is closed and no longer accepting applications.';
        LEAVE proc_label;
    END IF;

    -- Validation 3: Duplicate application check
    SELECT COUNT(*) INTO v_app_exists 
    FROM applications 
    WHERE candidate_id = p_candidate_id AND job_id = p_job_id;

    IF v_app_exists > 0 THEN
        SET p_status_code = 1;
        SET p_status_message = 'Notice: Candidate has already submitted an application for this position.';
        LEAVE proc_label;
    END IF;

    -- Begin Transaction
    START TRANSACTION;

    INSERT INTO applications (job_id, candidate_id, status, similarity_score, applied_at)
    VALUES (p_job_id, p_candidate_id, 'applied', p_similarity_score, NOW());

    COMMIT;

    SET p_status_code = 0;
    SET p_status_message = 'Success: Application submitted successfully and logged.';
END proc_label$$


-- =============================================================
-- Procedure 2: sp_hire_candidate
-- Transactional procedure for recruiter hiring action:
-- 1. Updates application status to 'hired'
-- 2. Decrements available positions (num_positions) on the job
-- 3. If num_positions reaches 0, automatically changes job status to 'closed'
-- 4. Ensures all modifications happen atomically or are rolled back
-- =============================================================
CREATE PROCEDURE sp_hire_candidate(
    IN  p_job_id         INT,
    IN  p_candidate_id   INT,
    IN  p_changed_by_uid INT,
    OUT p_status_code    INT,
    OUT p_status_message VARCHAR(255)
)
hire_label: BEGIN
    DECLARE v_remaining_positions INT;
    DECLARE v_app_status VARCHAR(50);

    -- Exception handler with automatic rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 1;
        SET p_status_message = 'Transaction Failed: Error occurred during candidate hiring. Rolled back.';
    END;

    -- Validation: Ensure application exists
    SELECT status INTO v_app_status
    FROM applications
    WHERE job_id = p_job_id AND candidate_id = p_candidate_id;

    IF v_app_status IS NULL THEN
        SET p_status_code = 1;
        SET p_status_message = 'Error: Application record not found.';
        LEAVE hire_label;
    ELSEIF v_app_status = 'hired' THEN
        SET p_status_code = 1;
        SET p_status_message = 'Notice: Candidate is already recorded as hired for this role.';
        LEAVE hire_label;
    END IF;

    -- Begin Atomic Transaction
    START TRANSACTION;

    -- Step 1: Update application status
    UPDATE applications
    SET status = 'hired'
    WHERE job_id = p_job_id AND candidate_id = p_candidate_id;

    -- Step 2: Decrement available vacancies
    UPDATE jobs
    SET num_positions = GREATEST(0, num_positions - 1)
    WHERE job_id = p_job_id;

    -- Step 3: Check remaining vacancies
    SELECT num_positions INTO v_remaining_positions
    FROM jobs
    WHERE job_id = p_job_id;

    -- Step 4: If no more vacancies remain, close the job
    IF v_remaining_positions <= 0 THEN
        UPDATE jobs
        SET status = 'closed'
        WHERE job_id = p_job_id;
    END IF;

    -- Step 5: Audit the hiring decision
    INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
    VALUES (
        'applications',
        'UPDATE',
        p_job_id,
        p_changed_by_uid,
        CONCAT('Hiring Finalized: Candidate ', p_candidate_id, ' hired for Job ', p_job_id, 
               '. Remaining vacancies: ', v_remaining_positions),
        NOW()
    );

    COMMIT;

    SET p_status_code = 0;
    SET p_status_message = CONCAT('Success: Candidate hired successfully. Remaining open positions: ', v_remaining_positions);
END hire_label$$


-- =============================================================
-- Procedure 3: sp_post_job_with_audit
-- Transactional procedure for recruiters to publish a job posting
-- and initialize its requirements and audit trail atomically.
-- =============================================================
CREATE PROCEDURE sp_post_job_with_audit(
    IN  p_company_id    INT,
    IN  p_job_title     VARCHAR(255),
    IN  p_job_desc      LONGTEXT,
    IN  p_exp_min       DECIMAL(4,1),
    IN  p_exp_max       DECIMAL(4,1),
    IN  p_payrate       VARCHAR(500),
    IN  p_location      VARCHAR(500),
    IN  p_positions     INT,
    OUT p_new_job_id    INT,
    OUT p_status_msg    VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_new_job_id = 0;
        SET p_status_msg = 'Transaction Failed: Error inserting new job posting. Rolled back.';
    END;

    START TRANSACTION;

    INSERT INTO jobs (company_id, job_title, job_description, experience_min, experience_max, payrate, location, status, num_positions, posted_at)
    VALUES (p_company_id, p_job_title, p_job_desc, p_exp_min, p_exp_max, p_payrate, p_location, 'open', p_positions, NOW());

    SET p_new_job_id = LAST_INSERT_ID();

    INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
    VALUES (
        'jobs',
        'INSERT',
        p_new_job_id,
        NULL,
        CONCAT('New job posted: "', p_job_title, '" by Company ID ', p_company_id, ' with ', p_positions, ' openings.'),
        NOW()
    );

    COMMIT;
    SET p_status_msg = 'Success: Job created and published successfully.';
END$$

DELIMITER ;


-- =============================================================
-- SECTION 4: DEMONSTRATION & VERIFICATION OF ADVANCED FEATURES
-- =============================================================

-- 4.1 Test sp_apply_job execution
CALL sp_apply_job(2, 4, 0.8250, @out_code, @out_msg);
SELECT @out_code AS result_code, @out_msg AS result_message;

-- 4.2 Test sp_hire_candidate execution
CALL sp_hire_candidate(1, 1, 1, @hire_code, @hire_msg);
SELECT @hire_code AS hire_code, @hire_msg AS hire_message;

-- 4.3 Inspect Triggers output in Audit Log
SELECT * FROM vw_audit_history LIMIT 10;

-- 4.4 Inspect Views
SELECT * FROM vw_active_jobs;
SELECT * FROM vw_candidate_summary;
SELECT * FROM vw_company_analytics;
SELECT * FROM vw_skill_demand LIMIT 10;
