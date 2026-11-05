-- ============================================================================
-- Placement Analytics and Semantic Job Matching System
-- ============================================================================
-- File: database/04_advanced.sql
-- Role: Advanced Database Concepts (Views, Triggers, Stored Procedures, ACID Transactions)
--
-- Syllabus Coverage (PES University DBMS Level 3 Mini-Project):
--   • Section 7 of Rubric (Advanced Database Features - Minimum 4 required):
--       1. Relational Views (Data Virtualization & Abstraction)
--       2. Automated Database Triggers (Audit Trails & Domain Integrity)
--       3. Stored Procedures (Encapsulated Business Workflows)
--       4. ACID Transactions (START TRANSACTION, COMMIT, ROLLBACK, Exception Handlers)
--       5. Concurrency Control (Race-condition prevention in vacancy management)
--
-- Team Members:
--   • Shriya S R (PES1UG24CS449) — Member 1 (Lead: DB Architecture & Transaction Systems)
--   • Ahana S S  (PES1UG24CS910) — Member 2 (Lead: Analytical Queries & Vector DB Architect)
-- ============================================================================

-- Select the schema that owns the views, triggers, procedures, and demo data.
USE placement_analytics;

-- ============================================================================
-- SECTION 1: RELATIONAL VIEWS (Virtual Tables for Abstraction & Reporting)
-- ============================================================================
-- DBMS THEORY:
--   A View is a stored query specification that presents a virtual table dynamically.
--   Benefits in this Architecture:
--     1. Security & Abstraction: The Next.js frontend interacts with clean view projections
--        without exposing underlying sensitive table schemas or raw user credential columns.
--     2. Performance: Pre-compiles complex multi-table joins and aggregation trees.
--     3. Consistency: Guarantees unified calculation logic across student, recruiter,
--        and placement office analytics dashboards.

-- ----------------------------------------------------------------------------
-- View 1: vw_active_jobs (Powers the Student Job Board Interface)
-- ----------------------------------------------------------------------------
-- Joins open jobs with company details, computing real-time applicant volume
-- and average semantic similarity match percentage.
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
    COUNT(a.application_id)                 AS total_applicants,
    ROUND(AVG(a.similarity_score) * 100, 1) AS avg_applicant_match_pct
FROM jobs j
JOIN companies co ON j.company_id = co.company_id
LEFT JOIN applications a ON j.job_id = a.job_id
WHERE j.status = 'open'
GROUP BY j.job_id, j.job_title, co.company_id, co.company_name, co.industry,
         j.location, j.experience_min, j.experience_max, j.payrate,
         j.num_positions, j.posted_at;

-- ----------------------------------------------------------------------------
-- View 2: vw_candidate_summary (Powers the Student Personal Dashboard)
-- ----------------------------------------------------------------------------
-- Consolidates each candidate's application pipeline status into a single row:
-- total submitted, reviewed, shortlisted, hired, and rejected counts,
-- along with their highest achieved semantic match percentage.
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

-- ----------------------------------------------------------------------------
-- View 3: vw_company_analytics (Powers Recruiter KPIs & Conversion Funnel)
-- ----------------------------------------------------------------------------
-- Computes recruitment pipeline metrics per enterprise: total postings, open vs closed
-- positions, total candidates received, and hiring conversion rate (Hired / Total * 100).
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

-- ----------------------------------------------------------------------------
-- View 4: vw_skill_demand (Curriculum & Skill Gap Analysis)
-- ----------------------------------------------------------------------------
-- Cross-aggregates industry demand from job_skills against student talent supply
-- from candidate_skills, splitting demand into mandatory prerequisites vs preferred.
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

-- ----------------------------------------------------------------------------
-- View 5: vw_audit_history (Human-Readable Security & Compliance Trail)
-- ----------------------------------------------------------------------------
-- Formats raw trigger-populated audit entries joined with user accounts
-- to display the exact identity (email, role) responsible for database mutations.
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


-- ============================================================================
-- SECTION 2: AUTOMATED TRIGGERS (Auditing & Domain Integrity)
-- ============================================================================
-- DBMS THEORY:
--   Triggers are event-driven procedural routines executed automatically by MySQL
--   when specific DML events (INSERT, UPDATE, DELETE) occur on a table.
--   Key Distinctions:
--     • BEFORE Triggers: Fire BEFORE changes are committed. Used for data validation,
--       sanitization, or aborting transactions using SIGNAL SQLSTATE '45000'.
--     • AFTER Triggers: Fire AFTER changes succeed. Used for change data capture (CDC),
--       audit logging, and synchronizing secondary audit tables.

-- Remove old definitions first so this script can recreate the current trigger versions.
DROP TRIGGER IF EXISTS trg_after_application_insert;
DROP TRIGGER IF EXISTS trg_after_application_update;
DROP TRIGGER IF EXISTS trg_after_application_delete;
DROP TRIGGER IF EXISTS trg_after_job_status_change;
DROP TRIGGER IF EXISTS trg_before_candidate_update;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- Trigger 1: trg_after_application_insert (Application Submission Audit)
-- ----------------------------------------------------------------------------
-- Automatically writes an immutable audit record whenever a candidate applies.
CREATE TRIGGER trg_after_application_insert
AFTER INSERT ON applications
FOR EACH ROW
BEGIN
    -- Write one audit row using NEW values from the application just inserted.
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

-- ----------------------------------------------------------------------------
-- Trigger 2: trg_after_application_update (Recruitment Stage Transition Audit)
-- ----------------------------------------------------------------------------
-- Detects workflow state transitions (e.g., applied -> shortlisted -> hired).
CREATE TRIGGER trg_after_application_update
AFTER UPDATE ON applications
FOR EACH ROW
BEGIN
    -- Only log an update when the application's workflow status actually changed.
    IF OLD.status <> NEW.status THEN
        -- Record both the previous and new status for this application.
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

-- ----------------------------------------------------------------------------
-- Trigger 3: trg_after_application_delete (Application Withdrawal Audit)
-- ----------------------------------------------------------------------------
-- Captures candidate application withdrawal or record pruning.
CREATE TRIGGER trg_after_application_delete
AFTER DELETE ON applications
FOR EACH ROW
BEGIN
    -- Preserve identifying details from OLD because the application row is being removed.
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

-- ----------------------------------------------------------------------------
-- Trigger 4: trg_after_job_status_change (Job Opening / Closing Event Audit)
-- ----------------------------------------------------------------------------
-- Logs changes between 'open' and 'closed' statuses for regulatory transparency.
CREATE TRIGGER trg_after_job_status_change
AFTER UPDATE ON jobs
FOR EACH ROW
BEGIN
    -- Ignore updates to other job fields; audit only open/closed transitions.
    IF OLD.status <> NEW.status THEN
        -- Record the job whose status changed and the old/new states.
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

-- ----------------------------------------------------------------------------
-- Trigger 5: trg_before_candidate_update (Domain Integrity Guard & Null-Safe Audit)
-- ----------------------------------------------------------------------------
-- CORE VIVA CONCEPTS:
--   1. BEFORE UPDATE Validation: Intercepts the row before modification is committed.
--      If NEW.cgpa is outside [0.00, 10.00], it executes 'SIGNAL SQLSTATE 45000',
--      raising an unhandled user exception that aborts the DML statement.
--   2. Null-Safe Equality Operator (<=>):
--      Standard '<>' yields NULL if either operand is NULL, failing to detect when
--      a previously unassigned CGPA (NULL) is updated to a numeric value.
--      The spaceship operator '<=>' guarantees true/false evaluation across NULLs.
CREATE TRIGGER trg_before_candidate_update
BEFORE UPDATE ON candidates
FOR EACH ROW
BEGIN
    -- Domain Validation: Abort invalid CGPA
    IF NEW.cgpa IS NOT NULL AND (NEW.cgpa < 0.00 OR NEW.cgpa > 10.00) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity Violation: CGPA must be between 0.00 and 10.00';
    END IF;

    -- Null-Safe Audit Comparison: Detects grade changes from/to NULL
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
-- SECTION 3: STORED PROCEDURES WITH ATOMIC ACID TRANSACTIONS
-- =============================================================
-- DBMS THEORY:
--   ACID Properties Enforced:
--     • Atomicity: All operations in the procedure succeed, or all are rolled back.
--     • Consistency: Preserves all CHECK, FOREIGN KEY, and UNIQUE constraints.
--     • Isolation: Read Committed / Repeatable Read prevents dirty reads.
--     • Durability: Once committed, updates persist permanently on disk.
--
-- Exception Handling Architecture:
--   'DECLARE EXIT HANDLER FOR SQLEXCEPTION': If ANY constraint violation or SQL
--   error occurs at any step, the handler executes ROLLBACK immediately and
--   returns an error status code to the calling application.

-- Remove existing procedure definitions so the following CREATE statements install the latest versions.
DROP PROCEDURE IF EXISTS sp_apply_job;
DROP PROCEDURE IF EXISTS sp_hire_candidate;
DROP PROCEDURE IF EXISTS sp_post_job_with_audit;
DROP PROCEDURE IF EXISTS sp_auto_reject_expired_applications;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- Procedure 1: sp_apply_job (Atomic Candidate Job Application)
-- ----------------------------------------------------------------------------
-- Workflow:
--   1. Validates candidate existence.
--   2. Validates job existence and active 'open' status.
--   3. Checks for duplicate applications.
--   4. Atomically inserts application and commits transaction.
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

    -- Error handler: If any SQL exception occurs, rollback and exit
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 1;
        SET p_status_message = 'Transaction Failed: SQLEXCEPTION encountered during job application. Rolled back.';
    END;

    -- Validation 1: Count matching candidate rows; zero means the supplied ID is invalid.
    SELECT COUNT(*) INTO v_cand_exists FROM candidates WHERE candidate_id = p_candidate_id;
    IF v_cand_exists = 0 THEN
        SET p_status_code = 1;
        SET p_status_message = 'Error: Specified Candidate ID does not exist.';
        LEAVE proc_label;
    END IF;

    -- Validation 2: Read the job state; NULL means missing, and non-open means closed.
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

    -- Validation 3: Count this candidate/job pair to reject repeat applications.
    SELECT COUNT(*) INTO v_app_exists 
    FROM applications 
    WHERE candidate_id = p_candidate_id AND job_id = p_job_id;

    IF v_app_exists > 0 THEN
        SET p_status_code = 1;
        SET p_status_message = 'Notice: Candidate has already submitted an application for this position.';
        LEAVE proc_label;
    END IF;

    -- Begin the write transaction after the read-only validations pass.
    START TRANSACTION;

    -- Create the application row; the AFTER INSERT trigger writes its audit record.
    INSERT INTO applications (job_id, candidate_id, status, similarity_score, applied_at)
    VALUES (p_job_id, p_candidate_id, 'applied', p_similarity_score, NOW());

    -- Persist the application and trigger audit row as one transaction.
    COMMIT;

    -- Return success code and human-readable result to the caller.
    SET p_status_code = 0;
    SET p_status_message = 'Success: Application submitted successfully and logged.';
END proc_label$$


-- ----------------------------------------------------------------------------
-- Procedure 2: sp_hire_candidate (Atomic Multi-Entity Hiring Workflow)
-- ----------------------------------------------------------------------------
-- CRITICAL CONCURRENCY PROBLEM SOLVED:
--   When hiring a candidate, multiple operations MUST happen synchronously:
--     Step 1: Mark applicant status as 'hired'.
--     Step 2: Decrement open vacancies (num_positions = GREATEST(0, num_positions - 1)).
--     Step 3: If num_positions reaches 0, automatically transition jobs.status to 'closed'.
--     Step 4: Record hiring decision in audit_logs.
--   If a crash occurs after Step 1, the system would be in an inconsistent state
--   (candidate hired but vacancy not decremented). START TRANSACTION and COMMIT
--   guarantee that either ALL steps succeed or NONE take effect.
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

    -- Read the current application state; a missing row returns NULL.
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

    -- Start the atomic hiring write sequence after the pre-check passes.
    START TRANSACTION;

    -- Step 1: Mark the application hired; the status trigger records this transition.
    UPDATE applications
    SET status = 'hired'
    WHERE job_id = p_job_id AND candidate_id = p_candidate_id;

    -- Step 2: Decrement vacancies, clamping at zero to prevent a negative count.
    UPDATE jobs
    SET num_positions = GREATEST(0, num_positions - 1)
    WHERE job_id = p_job_id;

    -- Step 3: Read the updated vacancy count to decide whether the job is filled.
    SELECT num_positions INTO v_remaining_positions
    FROM jobs
    WHERE job_id = p_job_id;

    -- Step 4: Close the job when no vacancies remain; the job trigger audits the status change.
    IF v_remaining_positions <= 0 THEN
        UPDATE jobs
        SET status = 'closed'
        WHERE job_id = p_job_id;
    END IF;

    -- Step 5: Add a hiring-specific audit entry including the recruiter user ID.
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

    -- Persist all hiring changes and audit entries together.
    COMMIT;

    -- Return the completed hiring status and remaining vacancy count.
    SET p_status_code = 0;
    SET p_status_message = CONCAT('Success: Candidate hired successfully. Remaining open positions: ', v_remaining_positions);
END hire_label$$


-- ----------------------------------------------------------------------------
-- Procedure 3: sp_post_job_with_audit (Atomic Job Creation & Compliance Logging)
-- ----------------------------------------------------------------------------
-- Atomically publishes a new job posting and records its creation in audit_logs.
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
    -- Roll back both the job row and audit row if any statement raises an SQL error.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_new_job_id = 0;
        SET p_status_msg = 'Transaction Failed: Error inserting new job posting. Rolled back.';
    END;

    -- Start a transaction so job creation and its audit event succeed or fail together.
    START TRANSACTION;

    -- Insert the new open job with the recruiter-supplied role and vacancy details.
    INSERT INTO jobs (company_id, job_title, job_description, experience_min, experience_max, payrate, location, status, num_positions, posted_at)
    VALUES (p_company_id, p_job_title, p_job_desc, p_exp_min, p_exp_max, p_payrate, p_location, 'open', p_positions, NOW());

    -- Capture the auto-generated job ID for the audit row and OUT parameter.
    SET p_new_job_id = LAST_INSERT_ID();

    -- Record who/what was posted in the audit history within the same transaction.
    INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
    VALUES (
        'jobs',
        'INSERT',
        p_new_job_id,
        NULL,
        CONCAT('New job posted: "', p_job_title, '" by Company ID ', p_company_id, ' with ', p_positions, ' openings.'),
        NOW()
    );

    -- Persist the new job and its audit row together.
    COMMIT;
    -- Return a success message to the Next.js API caller.
    SET p_status_msg = 'Success: Job created and published successfully.';
END$$


-- ----------------------------------------------------------------------------
-- Procedure 4: sp_auto_reject_expired_applications (1-Month Inactivity Auto-Rejection)
-- ----------------------------------------------------------------------------
-- BUSINESS REQUIREMENT (Syllabus Invariant):
--   If a recruiter does not accept (hire/shortlist) an applicant within 1 month (30 days),
--   the application status automatically transitions to 'rejected'.
--
-- DBMS CONCEPTS DEMONSTRATED:
--   * Atomic Batch Transaction: START TRANSACTION ... COMMIT with EXIT HANDLER FOR SQLEXCEPTION.
--   * Change Data Capture via Trigger: When applications.status updates to 'rejected',
--     trg_after_application_update automatically intercepts each modified tuple and
--     writes an immutable transition entry into audit_logs.
--   * Dynamic Inactivity Parameter: Accepts custom days (default 30 days = 1 month).
CREATE PROCEDURE sp_auto_reject_expired_applications(
    IN  p_inactivity_days INT,           -- Inactivity threshold in days (default 30 days = 1 month)
    OUT p_rejected_count  INT,           -- Number of applications rejected
    OUT p_status_message  VARCHAR(255)   -- Diagnostic summary message
)
auto_reject_label: BEGIN
    DECLARE v_days INT DEFAULT 30;

    -- Exception handler with automatic transaction rollback
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_rejected_count = 0;
        SET p_status_message = 'Transaction Failed: SQLEXCEPTION during 1-month auto-rejection. Rolled back.';
    END;

    -- Enforce default 30 days if NULL or non-positive value passed
    IF p_inactivity_days IS NOT NULL AND p_inactivity_days > 0 THEN
        SET v_days = p_inactivity_days;
    END IF;

    -- Begin atomic batch write transaction
    START TRANSACTION;

    -- Step 1: Update status to 'rejected' for pending applications older than threshold
    -- Note: trg_after_application_update automatically logs each transition in audit_logs.
    UPDATE applications
    SET status = 'rejected'
    WHERE status IN ('applied', 'reviewed')
      AND applied_at < (NOW() - INTERVAL v_days DAY);

    -- Step 2: Capture total rows modified
    SET p_rejected_count = ROW_COUNT();

    -- Step 3: Record a high-level batch audit log entry if any records were expired
    IF p_rejected_count > 0 THEN
        INSERT INTO audit_logs (table_name, action_type, record_id, changed_by, description, happened_at)
        VALUES (
            'applications',
            'UPDATE',
            NULL,
            NULL,
            CONCAT('Batch Inactivity Rule: Auto-rejected ', p_rejected_count, 
                   ' application(s) pending over ', v_days, ' days without recruiter acceptance.'),
            NOW()
        );
    END IF;

    -- Persist all status transitions and audit logs atomically
    COMMIT;

    -- Return diagnostic message to caller
    SET p_status_message = CONCAT('Success: ', p_rejected_count, ' stale application(s) older than ', v_days, ' days were automatically rejected and audited.');
END auto_reject_label$$

DELIMITER ;


-- ============================================================================
-- SECTION 3B: MYSQL EVENT SCHEDULER (Automated Background Processing)
-- ============================================================================
-- DBMS THEORY:
--   The MySQL Event Scheduler executes recurring tasks at scheduled intervals directly
--   within the database engine, ensuring business invariants execute even without API traffic.
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS ev_auto_reject_expired_applications;

DELIMITER $$
CREATE EVENT ev_auto_reject_expired_applications
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
COMMENT 'Daily background maintenance: Auto-reject applications unaccepted after 30 days'
DO
BEGIN
    CALL sp_auto_reject_expired_applications(30, @out_ev_cnt, @out_ev_msg);
END$$
DELIMITER ;


-- ============================================================================
-- SECTION 4: DEMONSTRATION & VERIFICATION OF ADVANCED FEATURES
-- ============================================================================

-- 4.1 Submit the sample application for candidate 2 to job 4. This CALL can
--     permanently insert an application and its audit row because the procedure commits.
CALL sp_apply_job(2, 4, 0.8250, @out_code, @out_msg);
-- Read the OUT parameters returned by sp_apply_job: success/error code and message.
SELECT @out_code AS result_code, @out_msg AS result_message;

-- 4.2 Hire candidate 1 for job 1 as user 1. This CALL commits status, vacancy,
--     and audit changes; do not rerun casually on a database with valuable data.
CALL sp_hire_candidate(1, 1, 1, @hire_code, @hire_msg);
-- Read the OUT parameters returned by sp_hire_candidate.
SELECT @hire_code AS hire_code, @hire_msg AS hire_message;

-- 4.3 Display the ten newest audit events, including events created by triggers.
SELECT * FROM vw_audit_history LIMIT 10;

-- 4.4 List currently open jobs with applicant counts and average match scores.
SELECT * FROM vw_active_jobs;
-- Summarize each candidate's application totals and outcomes.
SELECT * FROM vw_candidate_summary;
-- Show job and applicant pipeline totals grouped by company.
SELECT * FROM vw_company_analytics;
-- Show skill demand and candidate supply for the first ten skills.
SELECT * FROM vw_skill_demand LIMIT 10;

-- 4.5 Test 1-Month Inactivity Auto-Rejection (Procedure & Trigger Verification)
-- Demonstrates automatic rejection of applications pending for > 30 days.
CALL sp_auto_reject_expired_applications(30, @rejected_cnt, @reject_msg);
SELECT @rejected_cnt AS auto_rejected_count, @reject_msg AS result_message;
-- Inspect audit log to verify trg_after_application_update captured the rejection:
SELECT * FROM vw_audit_history WHERE description LIKE '%rejected%' LIMIT 5;
