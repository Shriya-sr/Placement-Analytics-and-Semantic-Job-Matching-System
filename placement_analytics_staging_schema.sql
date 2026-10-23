-- Placement Analytics and Semantic Job Matching System
-- MySQL schema created so far (staging tables only)
-- No dataset rows are included in this file.
-- Generated: 2026-10-22

CREATE DATABASE IF NOT EXISTS placement_analytics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE placement_analytics;

-- Staging table for UpdatedResumeDataSet.csv
CREATE TABLE IF NOT EXISTS raw_resumes (
    raw_id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100),
    resume_text LONGTEXT
);

-- Staging table for naukri_com-job_sample.csv
CREATE TABLE IF NOT EXISTS raw_jobs (
    raw_id INT AUTO_INCREMENT PRIMARY KEY,
    company VARCHAR(255),
    education TEXT,
    experience VARCHAR(100),
    industry VARCHAR(255),
    jobdescription LONGTEXT,
    jobid VARCHAR(100),
    joblocation_address VARCHAR(500),
    jobtitle VARCHAR(255),
    numberofpositions VARCHAR(50),
    payrate VARCHAR(255),
    postdate VARCHAR(100),
    skills TEXT,
    uniq_id VARCHAR(100)
);

-- Check the tables created by this script:
SHOW TABLES;
