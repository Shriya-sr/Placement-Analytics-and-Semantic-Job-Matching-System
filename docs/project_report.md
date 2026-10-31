# Placement Analytics & Semantic Job Matching System
## DBMS Experiential Learning – Level 3 Comprehensive Project Report

**Course**: Database Management Systems (Aug – Dec 2026)  
**Department**: Department of Computer Science and Engineering  
**Institution**: PES University, Bengaluru  

### 👥 Team Details
- **Student 1**: Ahana Srinivas Sivaram (SRN: PES1UG24CS910, Section H) — Lead DB Architect & Backend Lead
- **Student 2**: Shriya S R (SRN: PES1UG24CS449, Section H) — Data Engineer & Frontend Lead

---

## 1. Project Objectives
1. **Design and normalize** an enterprise recruitment and campus placement system into Third Normal Form (3NF) to eliminate data redundancy and preserve referential integrity.
2. **Implement transactional integrity (ACID)** using MySQL Stored Procedures and Triggers for candidate applications, hiring decisions, and vacancy tracking.
3. **Bridge relational analytics with semantic vector intelligence** by integrating ChromaDB vector database with Cosine Similarity for unstructured resume-to-job description matching.
4. **Build a high-performance web application** using Next.js 14 App Router, featuring Role-Based Access Control (RBAC), connection pooling, and interactive analytical dashboards.

---

## 2. Functional Requirements
- **Candidate / Student Module**:
  - Secure registration and login with bcrypt password hashing.
  - Profile tracking with academic credentials (CGPA, degree, category).
  - Search and browse 21,000+ open career positions.
  - Submit applications with ACID transactional guarantees via `sp_apply_job`.
  - Real-time application lifecycle tracking (`applied` &rarr; `shortlisted` &rarr; `hired` &rarr; `rejected`).
- **Corporate Recruiter Module**:
  - Secure recruiter onboarding and corporate identity association.
  - Publish job listings with automated audit logging via `sp_post_job_with_audit`.
  - Applicant pipeline review with match scores, CGPA, and candidate domains.
  - Execute candidate hiring decisions via `sp_hire_candidate` with automated vacancy decrement and job auto-closure.
  - Semantic resume retrieval using ChromaDB Top-$K$ Cosine Similarity.
- **Analytics & Administrative Module**:
  - Aggregated hiring funnels, skill demand vs supply ratios, and salary distributions via relational SQL views.
  - Complete security audit logging recorded in `audit_logs` via automated triggers.

---

## 3. System Architecture & Dual Database Justification

### Dual Database Architecture
```
+-------------------------------------------------------------+
|                      Client Layer                           |
|        Next.js 14 App Router (Tailwind CSS, React)          |
|    - Main Dashboard (/)         - Student Portal (/student) |
|    - Recruiter Console          - Semantic Matcher (/match) |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Application Tier                        |
|   Next.js API Route Handlers & Python FastAPI Microservice  |
|    - RBAC Middleware (jose JWT + HTTP-only cookies)         |
|    - mysql2/promise Connection Pool                         |
|    - 384-dimensional Dense Semantic Embedding Engine        |
+--------------+------------------------------+---------------+
               |                              |
               v                              v
+-------------------------------+ +---------------------------+
|    Relational Database        | |      Vector Database      |
|         MySQL 8.0             | |          ChromaDB         |
| - 3NF Normalized Schema       | | - PersistentClient        |
| - ACID Stored Procedures      | | - Cosine Similarity HNSW  |
| - Automated Audit Triggers    | | - 962 Resume Embeddings   |
| - Analytical Views & CTEs     | | - 21,349 Job Embeddings   |
+-------------------------------+ +---------------------------+
```

### Technology Choice & Justification (Rubric Item 5)
- **Why MySQL for Relational Core?**
  - **ACID Guarantees**: Campus recruitment involves financial and career decisions. Job vacancies must decrement atomically, duplicate applications must be rejected, and hiring operations must commit or rollback as single units of work.
  - **Schema Constraints**: Enforces primary keys, foreign key cascading, and domain check constraints (e.g. CGPA between $0.00$ and $10.00$).
  - **Audit Trails**: Triggers guarantee an unalterable history of application status changes and job closures.
- **Why ChromaDB for Vector Search?**
  - Standard SQL relational matching (`LIKE '%python%'` or `REGEXP`) relies on exact substring matches and fails to capture synonyms (e.g., "NLP" vs "Natural Language Processing" or "Big Data" vs "Spark/Hadoop").
  - ChromaDB computes high-dimensional vector distances using Cosine Similarity over unstructured resume and job description text.
  - Vector similarity scores ($0.0000$ to $1.0000$) are synchronized back into MySQL `applications.similarity_score` to provide hybrid ranking.

---

## 4. Entity-Relationship (ER) Diagram & Relational Schema

### Entities & Relationships
1. **`users`** (1:1 with `candidates`, 1:1 with `companies`)
2. **`candidates`** (1:M with `applications`, M:N with `skills` via `candidate_skills`)
3. **`companies`** (1:M with `jobs`)
4. **`jobs`** (1:M with `applications`, M:N with `skills` via `job_skills`)
5. **`skills`** (Master catalog)
6. **`candidate_skills`** (Bridge entity with proficiency)
7. **`job_skills`** (Bridge entity with `is_mandatory` flag)
8. **`applications`** (Core transactional bridge linking `candidates` and `jobs`)
9. **`audit_logs`** (System-wide immutable audit trail)

The high-resolution ER Diagram and Relational Schema are preserved under:
- `docs/er_diagram.png`
- `docs/relational_schema.png`

---

## 5. Data Dictionary (3NF Schema Description)

| Table | Column | Type | Nullable | Key / Constraint | Description |
|---|---|---|:---:|:---:|---|
| **users** | `user_id` | INT | No | PK, Auto Inc | Unique user identifier |
| | `email` | VARCHAR(255) | No | UNIQUE | User login email |
| | `pass_hash` | VARCHAR(255) | No | | Bcrypt password hash |
| | `role` | ENUM | No | 'student','recruiter','admin' | RBAC role |
| **candidates** | `candidate_id` | INT | No | PK, Auto Inc | Candidate record ID |
| | `user_id` | INT | No | FK &rarr; users(user_id) | Linked user account |
| | `full_name` | VARCHAR(255) | No | | Candidate legal name |
| | `category` | VARCHAR(100) | No | | Professional domain |
| | `cgpa` | DECIMAL(4,2) | Yes | CHECK (0.00 - 10.00) | Academic GPA |
| **companies** | `company_id` | INT | No | PK, Auto Inc | Company record ID |
| | `user_id` | INT | No | FK &rarr; users(user_id) | Linked recruiter user |
| | `company_name` | VARCHAR(255) | No | | Enterprise company name |
| | `location` | VARCHAR(500) | Yes | | Primary office location |
| **jobs** | `job_id` | INT | No | PK, Auto Inc | Job listing ID |
| | `company_id` | INT | No | FK &rarr; companies(company_id) | Employer company |
| | `job_title` | VARCHAR(255) | No | | Job title |
| | `status` | ENUM | No | 'open','closed' | Vacancy status |
| | `num_positions` | INT | No | CHECK (&gt;= 0) | Remaining vacancies |
| **applications** | `application_id` | INT | No | PK, Auto Inc | Application submission ID |
| | `job_id` | INT | No | FK &rarr; jobs(job_id) | Target job |
| | `candidate_id` | INT | No | FK &rarr; candidates(candidate_id) | Applicant |
| | `status` | ENUM | No | 'applied','reviewed','shortlisted','hired','rejected' | Lifecycle status |
| | `similarity_score`| DECIMAL(5,4) | Yes | CHECK (0.0000 - 1.0000) | ChromaDB Cosine score |
| **audit_logs** | `log_id` | INT | No | PK, Auto Inc | Audit entry ID |
| | `table_name` | VARCHAR(50) | No | | Target table audited |
| | `action_type` | VARCHAR(20) | No | 'INSERT','UPDATE','DELETE' | Operation type |
| | `description` | TEXT | No | | Event description |

---

## 6. Advanced Database Concepts Implementation

### Stored Procedures with ACID Transactions (`database/04_advanced.sql`)
1. **`sp_apply_job`**: Atomically checks candidate existence and open job status, verifies no duplicate application exists, inserts into `applications`, and commits. Automatically rolls back on any `SQLEXCEPTION`.
2. **`sp_hire_candidate`**: Atomically updates candidate status to `'hired'`, decrements `num_positions`, automatically closes the job if vacancies reach 0, and records in `audit_logs`.
3. **`sp_post_job_with_audit`**: Transactional job creation with automatic audit trail recording.

### Automated Triggers
1. **`trg_after_application_insert`**: Logs application submissions into `audit_logs`.
2. **`trg_after_application_update`**: Audits status transitions (e.g. `applied` &rarr; `shortlisted` &rarr; `hired`).
3. **`trg_after_application_delete`**: Logs application withdrawals.
4. **`trg_after_job_status_change`**: Logs automatic and manual job closing events.
5. **`trg_before_candidate_update`**: Validates CGPA range ($0.00$ to $10.00$) at the database layer.

### Pre-computed Relational Views
1. **`vw_active_jobs`**: Active job openings joined with company profiles and total applicant counts.
2. **`vw_candidate_summary`**: Student performance summary, total applications, shortlists, and top semantic score.
3. **`vw_company_analytics`**: Recruiter hiring funnel metrics, total postings, and conversion rate percentage.
4. **`vw_skill_demand`**: Employer skill demand ranking with mandatory vs. preferred distribution.
5. **`vw_audit_history`**: Formatted view of all database transactions joined with user emails.

---

## 7. ChromaDB Vector Database & Semantic RUD Operations

### 5 Rubric Questions Answered
1. **What data is converted into embeddings?** Unstructured candidate resume text and recruiter job descriptions.
2. **Which embedding approach is used?** 384-dimensional dense semantic feature embeddings with technical keyword weighting and L2 unit-sphere normalization (`DenseSemanticEmbeddingFunction`), compatible with Sentence-Transformers `all-MiniLM-L6-v2`.
3. **How vectors are stored?** ChromaDB `PersistentClient` persisted on disk under `backend/chroma_db/` across `resumes_collection` and `jobs_collection`.
4. **Similarity metric used?** Cosine Similarity (`hnsw:space: cosine`):
   $$\text{Similarity Score} = \max(0, \min(1, 1 - \text{Cosine Distance}))$$
5. **How results are retrieved?** Top-$K$ Approximate Nearest Neighbor (ANN) search with metadata filtering, synchronized back to MySQL `applications.similarity_score`.

### Vector RUD Operations
- **Create**: `add_candidate_resume()`, `add_job_posting()`
- **Read / Query**: `match_candidates_for_job()`, `recommend_jobs_for_candidate()`
- **Update**: `update_candidate_resume()`, `update_job_posting()`
- **Delete**: `delete_candidate_vector()`, `delete_job_vector()`

---

## 8. Web Application & RBAC Authentication

- **Next.js 14 App Router**: Clean modular component architecture.
- **Connection Pool**: `mysql2/promise` pool with keepalive, connection limits, and parameterized queries.
- **Dedicated Portals**:
  - `/`: Main Platform Dashboard with live system stats and featured jobs.
  - `/login/student`: Dedicated student login with 1-click demo button (`alice@pes.edu` / `password123`).
  - `/login/recruiter`: Dedicated recruiter login with 1-click demo button (`recruiter@tcs.com` / `password123`).
  - `/register`: Role-based registration writing atomically to `users` and profile tables.
  - `/student`: Student dashboard showing real application statuses.
  - `/student/jobs`: Live job board with 1-click transactional apply and `✓ Applied` indicator.
  - `/recruiter`: Recruiter console with candidate pipeline, hiring buttons, and active postings list.
  - `/recruiter/jobs`: Transactional job posting form executing `sp_post_job_with_audit`.
  - `/recruiter/match`: Real-time semantic resume matcher with top-$K$ slider and domain filter.
  - `/analytics`: SQL analytics dashboard powered by MySQL views.

---

## 9. Verification & Test Cases

| Test ID | Module | Input | Expected Output | Actual Result | Status |
|---|---|---|---|---|:---:|
| **TC-01** | Schema | Insert candidate with CGPA = 11.5 | Database rejects with `chk_cgpa` violation | Rejected by MySQL constraint | **PASS** |
| **TC-02** | Stored Proc | Apply for closed job via `sp_apply_job` | Return error code 1 ("Job is closed") | Returned error code 1 | **PASS** |
| **TC-03** | Stored Proc | Apply twice for same job | Return code 1 ("Already submitted application") | Rejected with notice | **PASS** |
| **TC-04** | Stored Proc | Hire candidate when vacancies = 1 | Candidate marked 'hired', vacancies = 0, job status &rarr; 'closed' | Atomically updated & closed | **PASS** |
| **TC-05** | Trigger | Insert application record | Automatic row created in `audit_logs` | Audit record logged with timestamp | **PASS** |
| **TC-06** | Vector DB | Cosine match for "Machine Learning" job | Returns candidates with ML/Python at top | Ranked > 90% match | **PASS** |
| **TC-07** | Next.js RBAC | Student attempts to visit `/recruiter` | Redirected to `/login/recruiter` with 403 | Redirected by middleware | **PASS** |
| **TC-08** | Recruiter Post | Post new job on `/recruiter/jobs` | Job immediately appears on student `/student/jobs` | Visible at top of job board | **PASS** |
| **TC-09** | Student Apply | Student applies to job on `/student/jobs` | Application immediately appears in recruiter pipeline | Visible in recruiter review table | **PASS** |
| **TC-10** | Build | Run `npm run build` | Next.js production build completes with 0 errors | Exit code 0, 23/23 routes compiled | **PASS** |

---

## 10. Conclusion
The Placement Analytics and Semantic Job Matching System satisfies all 14 evaluation criteria of the PES University DBMS Level 3 experiential learning curriculum. The project combines a robust Third Normal Form (3NF) relational database (MySQL) enforcing ACID transactions, stored procedures, triggers, and views with an intelligent vector database (ChromaDB) for unstructured semantic search, exposed through a responsive, role-based Next.js 14 web application.
