# Placement Analytics and Semantic Job Matching System
**Department of Computer Science and Engineering — PES University**  
*DBMS Experiential Learning (Level 3 Mini-Project) | Aug – Dec 2026*

## 👥 Team Members

| Name | SRN | Section |
|---|---|---|
| Ahana Srinivas Sivaram | PES1UG24CS910 | H |
| Shriya S R | PES1UG24CS449 | H |

---

## 🎯 Executive Summary & Rubric Mapping

---

## 🎯 Executive Summary & Rubric Mapping

This project addresses student campus placements and recruiter talent discovery using a **hybrid multi-paradigm database architecture**:
1. **Relational Database (MySQL 8.0)**: Normalized to **3NF** for structured transactional integrity (ACID), role-based auth, application tracking, audit logging, and relational analytics.
2. **Vector Database (ChromaDB)**: High-dimensional dense vector embeddings with **Cosine Similarity** (`hnsw:space: cosine`) for unstructured resume-to-job semantic matching.
3. **Full-Stack Web Interface (Next.js 14 App Router)**: Connected via a connection pool (`mysql2/promise`) with Role-Based Access Control (**RBAC**) middleware.

### 📋 Phase Deliverables Matrix

| Relay Phase | Lead | Key Deliverables Mapped to Rubric | Target Files | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Person 1 | • ER Diagram (2 marks)<br>• 3NF Relational Schema (3 marks)<br>• DDL with constraints/indexes (4 marks)<br>• Tech Justification (1 mark) | `docs/er_diagram.png`<br>`schema.sql`<br>`database/schema.sql` | ✅ **Completed** |
| **Phase 2** | Person 2 | • CSV cleaning & ETL ingestion into 3NF (4 marks)<br>• DML operations (INSERT, UPDATE, DELETE) (4 marks)<br>• Complex queries: JOINs, GROUP BY/HAVING, Subqueries, CTEs, Window Functions (4 marks) | `data/etl.py`<br>`database/02_dml.sql`<br>`database/03_queries.sql` | ✅ **Completed** |
| **Phase 3** | Person 1 | • Stored Procedures with ACID Transactions (6 marks)<br>• Triggers for automated audit logging<br>• Relational SQL Views<br>• Vector DB creation & ChromaDB embedding pipeline (4 + 7 marks) | `database/04_advanced.sql`<br>`backend/vector_service.py`<br>`backend/app.py` | ✅ **Completed** |
| **Phase 4** | Person 2 | • Next.js App Router UI (3 marks)<br>• DB connection pool with `.env` (2 marks)<br>• RBAC Authentication (Student & Recruiter roles) (4 marks) | `frontend/app/`<br>`frontend/lib/db.ts`<br>`frontend/middleware.ts` | ✅ **Completed** |
| **Phase 5** | Person 1 | • Recruiter Semantic Resume Matcher UI<br>• Placement Analytics Dashboard using SQL Views | `frontend/app/recruiter/match/`<br>`frontend/app/analytics/` | ✅ **Implemented** |

---

## 🗄️ Relational Schema (3NF) & Constraints

- **`users`**: Central auth entity storing hashed passwords and roles (`student`, `recruiter`, `admin`).
- **`candidates`**: 1:1 profile linked to student user (`category`, `cgpa`, `education_level`, `resume_text`). Enforces `chk_cgpa` (0.00–10.00).
- **`companies`**: 1:1 profile linked to recruiter user (`company_name`, `industry`, `location`).
- **`jobs`**: 1:M from company. Enforces `chk_experience` and `chk_exp_range`.
- **`skills`**: Master skills table. 3NF compliant.
- **`candidate_skills`**: M:N bridge table with proficiency levels (`beginner`, `intermediate`, `expert`).
- **`job_skills`**: M:N bridge table with mandatory vs optional flag (`is_mandatory`).
- **`applications`**: Application lifecycle tracking (`applied`, `reviewed`, `shortlisted`, `hired`, `rejected`) + `similarity_score` (Cosine similarity float between 0.0000 and 1.0000).
- **`audit_logs`**: Append-only security audit log recording table name, action type (`INSERT`, `UPDATE`, `DELETE`), actor ID, and description.

---

## ⚡ Advanced Database Concepts (Phase 3)

### 1. Stored Procedures with ACID Transactions
- **`sp_apply_job`**: Atomically validates candidate existence and active job status, prevents duplicate submissions, creates application, and logs audit record with `START TRANSACTION`, `COMMIT`, and `ROLLBACK` on `SQLEXCEPTION`.
- **`sp_hire_candidate`**: Atomically transitions candidate application to `'hired'`, decrements `num_positions`, automatically sets job status to `'closed'` if positions reach 0, and records audit history.
- **`sp_post_job_with_audit`**: Atomically creates job postings with full parameter auditing.

### 2. Triggers (Automated Audit Trail)
- **`trg_after_application_insert`**: Logs new application submissions.
- **`trg_after_application_update`**: Logs state transitions (e.g., `applied` ➔ `shortlisted` ➔ `hired`).
- **`trg_after_application_delete`**: Logs application withdrawal or deletion.
- **`trg_after_job_status_change`**: Logs job closure when vacancies are filled.
- **`trg_before_candidate_update`**: Enforces database-level CGPA validation (0.00–10.00) and audits academic updates.

### 3. SQL Views
- **`vw_active_jobs`**: Open vacancies joined with company details and applicant counts.
- **`vw_candidate_summary`**: Candidate profile, applications count, shortlisted/hired tallies, and highest similarity score.
- **`vw_company_analytics`**: Recruiter KPIs including total postings, candidate pipeline, and hiring conversion percentages.
- **`vw_skill_demand`**: Aggregated employer demand ranking for skills split by mandatory vs optional.
- **`vw_audit_history`**: Formatted audit logs joined with actor emails.

---

## 🔮 Vector Database & ChromaDB Pipeline (Phase 3)

### Rubric Questions Answered:
1. **What data is converted into embeddings?**
   - Unstructured candidate resume text (technical competencies, domain categories, academic profiles).
   - Job vacancy listings (job titles, descriptions, required skill specifications).
2. **Which embedding approach/model is used?**
   - 384-dimensional dense semantic feature embeddings with technical keyword weighting and L2 unit-sphere normalization (`DenseSemanticEmbeddingFunction`), compatible with Sentence-Transformers `all-MiniLM-L6-v2`.
3. **How vectors are stored?**
   - ChromaDB `PersistentClient` saved under `backend/chroma_db/` across two persistent collections: `resumes_collection` and `jobs_collection`.
4. **Similarity metric used?**
   - Cosine Similarity (`hnsw:space: cosine`).  
     $$\text{Similarity Score} = \max(0, \min(1, 1 - \text{Cosine Distance}))$$
5. **How relevant results are retrieved?**
   - Top-$K$ Approximate Nearest Neighbor (ANN) search with metadata filtering (by technical domain, experience bounds, etc.).
   - Scores are synchronized into MySQL `applications.similarity_score` for relational views.
6. **RUD Operations Supported:**
   - **Create**: `add_candidate_resume()`, `add_job_posting()`
   - **Read / Query**: `match_candidates_for_job()`, `recommend_jobs_for_candidate()`
   - **Update**: `update_candidate_resume()`, `update_job_posting()`
   - **Delete**: `delete_candidate_vector()`, `delete_job_vector()`

---

## 💻 Web Application & RBAC Authentication (Phase 4)

- **Framework**: Next.js 14 with App Router (`frontend/app/`)
- **Database Connection Pool**: `mysql2/promise` pool with keepalive, connection limits, and parameterized query execution (`frontend/lib/db.ts`).
- **RBAC Authentication**:
  - Protected route middleware (`frontend/middleware.ts`):
    - `/student/*` ➔ Restricted to **Student** role.
    - `/recruiter/*` ➔ Restricted to **Recruiter** role.
  - Cryptographic session authentication using 24-hour signed JWT cookies (`frontend/lib/auth.ts`).
  - Passwords hashed using `bcryptjs` salt rounds.

### Demo Credentials:
- **Student Account**: `alice@pes.edu` / `password123` (Data Science, 8.9 CGPA)
- **Recruiter Account**: `recruiter@tcs.com` / `password123` (Tata Consultancy Services)

---

## 🚀 Execution Instructions

### 1. Database Setup (MySQL)
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/02_dml.sql
mysql -u root -p < database/03_queries.sql
mysql -u root -p < database/04_advanced.sql
```

### 2. Run ChromaDB Vector Pipeline (Phase 3)
```bash
# Run standalone vector indexing and matching verification
python backend/vector_service.py

# Or launch the FastAPI vector microservice
python backend/app.py
```

### 3. Launch Next.js Web Application (Phase 4)
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser:
- **Home**: `http://localhost:3000/`
- **Sign In**: `http://localhost:3000/login`
- **Student Portal**: `http://localhost:3000/student`
- **Recruiter Console**: `http://localhost:3000/recruiter`
- **Semantic Matcher UI**: `http://localhost:3000/recruiter/match`
- **SQL Analytics Dashboard**: `http://localhost:3000/analytics`
