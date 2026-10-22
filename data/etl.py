"""
etl.py -- Phase 2 Data Pipeline
================================
Loads UpdatedResumeDataSet.csv  (962 rows)
  and naukri_com-job_sample.csv (22 000 rows)
into MySQL: staging tables first, then normalised 3NF tables.

Usage (from project root):
    python data/etl.py

Credentials are read from the .env file in the project root.
"""

import csv
import re
import os
import sys
from pathlib import Path

# ── Load .env from project root (one level above data/) ─────────
try:
    from dotenv import load_dotenv
except ImportError:
    sys.exit("Run:  pip install python-dotenv mysql-connector-python")

ROOT = Path(__file__).resolve().parent.parent   # project root
load_dotenv(ROOT / ".env")

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except ImportError:
    sys.exit("Run:  pip install mysql-connector-python")

# ── Config (all from .env) ───────────────────────────────────────
DB_CONFIG = {
    "host":      os.getenv("DB_HOST",  "localhost"),
    "port":      int(os.getenv("DB_PORT", 3306)),
    "user":      os.getenv("DB_USER",  "root"),
    "password":  os.getenv("DB_PASS",  ""),
    "database":  os.getenv("DB_NAME",  "placement_analytics"),
    "charset":   "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
    "connection_timeout": 300,
}

DATA_DIR   = Path(__file__).resolve().parent / "raw"
RESUME_CSV = DATA_DIR / "UpdatedResumeDataSet.csv"
JOBS_CSV   = DATA_DIR / "naukri_com-job_sample.csv"

BATCH = 500   # rows per executemany call


# ── Helpers ──────────────────────────────────────────────────────

def clean(text):
    """Strip control characters and collapse whitespace."""
    if not text:
        return ""
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)
    return " ".join(text.split()).strip()


def parse_experience(exp_str):
    """
    '0 - 1 yrs'  -> (0.0, 1.0)
    '2-5 yrs'    -> (2.0, 5.0)
    'Freshers'   -> (0.0, 1.0)
    ''           -> (0.0, None)
    """
    if not exp_str:
        return 0.0, None
    s = exp_str.lower().replace("yrs", "").replace("years", "").strip()
    if "fresher" in s or s in ("", "0"):
        return 0.0, 1.0
    m = re.search(r"(\d+\.?\d*)\s*[-\u2013to]+\s*(\d+\.?\d*)", s)
    if m:
        return float(m.group(1)), float(m.group(2))
    m2 = re.search(r"(\d+\.?\d*)", s)
    if m2:
        v = float(m2.group(1))
        return v, v
    return 0.0, None


KNOWN_SKILLS = [
    "python", "java", "javascript", "sql", "mysql", "postgresql", "mongodb",
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "scikit-learn", "pandas", "numpy", "react", "angular", "vue", "node.js",
    "django", "flask", "spring boot", "hibernate", "docker", "kubernetes",
    "git", "linux", "rest api", "html", "css", "tableau", "power bi",
    "hadoop", "spark", "kafka", "aws", "azure", "gcp", "c++", "c#", "ruby",
    "php", "swift", "kotlin", "r", "scala", "matlab",
]

def extract_skills(text):
    lower = text.lower()
    return list(dict.fromkeys(
        s for s in KNOWN_SKILLS
        if re.search(r"\b" + re.escape(s) + r"\b", lower)
    ))


def batched(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i: i + size]


# ── Main ─────────────────────────────────────────────────────────

def run():
    print("Connecting to MySQL ...")
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
    except MySQLError as e:
        sys.exit(f"Connection failed: {e}")

    cur = conn.cursor()
    conn.autocommit = False

    # ── 0. Seed skills ───────────────────────────────────────────
    print("Seeding skills master table ...")
    SKILLS_SEED = [
        ("Python","Programming"),("Java","Programming"),("JavaScript","Programming"),
        ("SQL","Database"),("MySQL","Database"),("PostgreSQL","Database"),
        ("MongoDB","Database"),("Machine Learning","AI/ML"),("Deep Learning","AI/ML"),
        ("NLP","AI/ML"),("TensorFlow","AI/ML"),("PyTorch","AI/ML"),
        ("scikit-learn","AI/ML"),("Pandas","Data"),("NumPy","Data"),
        ("React","Framework"),("Angular","Framework"),("Vue","Framework"),
        ("Node.js","Framework"),("Django","Framework"),("Flask","Framework"),
        ("Spring Boot","Framework"),("Hibernate","Framework"),
        ("Docker","DevOps"),("Kubernetes","DevOps"),("Git","DevOps"),
        ("Linux","DevOps"),("AWS","Cloud"),("Azure","Cloud"),("GCP","Cloud"),
        ("REST API","Backend"),("HTML","Frontend"),("CSS","Frontend"),
        ("Tableau","BI"),("Power BI","BI"),
        ("Hadoop","Big Data"),("Spark","Big Data"),("Kafka","Big Data"),
        ("C++","Programming"),("C#","Programming"),("R","Programming"),
        ("Scala","Programming"),("Kotlin","Programming"),("Swift","Programming"),
        ("PHP","Programming"),("Ruby","Programming"),
    ]
    cur.executemany(
        "INSERT IGNORE INTO skills (skill_name, category) VALUES (%s, %s)",
        SKILLS_SEED
    )
    conn.commit()

    cur.execute("SELECT skill_id, LOWER(skill_name) FROM skills")
    skill_map = {name: sid for sid, name in cur.fetchall()}

    # ── 1. Admin user (idempotent) ───────────────────────────────
    cur.execute(
        "INSERT IGNORE INTO users (email, pass_hash, role) VALUES (%s, %s, %s)",
        ("admin@placementportal.com", "$2b$12$admin_hash", "admin")
    )
    conn.commit()

    # ════════════════════════════════════════════════════════════
    # 2. RESUMES  (962 rows)
    # ════════════════════════════════════════════════════════════
    print(f"\nReading {RESUME_CSV.name} ...")
    with open(RESUME_CSV, encoding="utf-8", errors="replace", newline="") as fh:
        rows = list(csv.DictReader(fh))
    print(f"  {len(rows)} resume rows read")

    # 2a. Stage
    print("  Staging raw_resumes ...")
    cur.execute("TRUNCATE TABLE raw_resumes")
    stage = [(clean(r["Category"]), clean(r["Resume"])) for r in rows]
    for chunk in batched(stage, BATCH):
        cur.executemany(
            "INSERT INTO raw_resumes (category, resume_text) VALUES (%s, %s)",
            chunk
        )
    conn.commit()

    # 2b. Normalise into users + candidates + candidate_skills
    print("  Normalising into candidates ...")
    inserted_candidates = 0

    # Bulk-insert all candidate users first
    user_rows = [
        (f"candidate_{i}@auto.pes.edu", "$2b$12$auto_hash", "student")
        for i in range(1, len(rows) + 1)
    ]
    cur.executemany(
        "INSERT IGNORE INTO users (email, pass_hash, role) VALUES (%s,%s,%s)",
        user_rows
    )
    conn.commit()

    # Fetch user_id for each email
    emails = [r[0] for r in user_rows]
    cur.execute(
        "SELECT user_id, email FROM users WHERE email IN (%s)" % ",".join(["%s"] * len(emails)),
        emails
    )
    email_to_uid = {email: uid for uid, email in cur.fetchall()}

    # Build candidate rows
    cand_rows = []
    for i, row in enumerate(rows, start=1):
        uid = email_to_uid.get(f"candidate_{i}@auto.pes.edu")
        if uid is None:
            continue
        cand_rows.append((
            uid,
            f"Candidate {i}",
            clean(row["Category"]),
            clean(row["Resume"]),
            "B.E. / B.Tech",
        ))

    for chunk in batched(cand_rows, BATCH):
        cur.executemany(
            """INSERT IGNORE INTO candidates
               (user_id, full_name, category, resume_text, education_level)
               VALUES (%s,%s,%s,%s,%s)""",
            chunk
        )
    conn.commit()
    inserted_candidates = len(cand_rows)

    # Fetch candidate_id for each user_id
    uids = [r[0] for r in cand_rows]
    cur.execute(
        "SELECT candidate_id, user_id FROM candidates WHERE user_id IN (%s)"
        % ",".join(["%s"] * len(uids)),
        uids
    )
    uid_to_cid = {uid: cid for cid, uid in cur.fetchall()}

    # Build candidate_skills rows
    cs_rows = []
    for i, row in enumerate(rows, start=1):
        uid = email_to_uid.get(f"candidate_{i}@auto.pes.edu")
        cid = uid_to_cid.get(uid)
        if not cid:
            continue
        for s in extract_skills(clean(row["Resume"])):
            sid = skill_map.get(s)
            if sid:
                cs_rows.append((cid, sid))

    for chunk in batched(cs_rows, BATCH):
        cur.executemany(
            "INSERT IGNORE INTO candidate_skills (candidate_id, skill_id) VALUES (%s,%s)",
            chunk
        )
    conn.commit()
    print(f"  Done: {inserted_candidates} candidates, {len(cs_rows)} skill links")

    # ════════════════════════════════════════════════════════════
    # 3. JOBS  (22 000 rows)
    # ════════════════════════════════════════════════════════════
    print(f"\nReading {JOBS_CSV.name} ...")
    with open(JOBS_CSV, encoding="utf-8", errors="replace", newline="") as fh:
        job_rows = list(csv.DictReader(fh))
    print(f"  {len(job_rows)} job rows read")

    # 3a. Stage raw_jobs in batches
    print("  Staging raw_jobs ...")
    cur.execute("TRUNCATE TABLE raw_jobs")
    stage_jobs = []
    for r in job_rows:
        stage_jobs.append((
            clean(r.get("company",""))[:255],
            clean(r.get("education","")),
            clean(r.get("experience",""))[:100],
            clean(r.get("industry",""))[:255],
            clean(r.get("jobdescription","")),
            clean(r.get("jobid",""))[:100],
            clean(r.get("joblocation_address",""))[:500],
            clean(r.get("jobtitle",""))[:255],
            clean(r.get("numberofpositions",""))[:50],
            clean(r.get("payrate",""))[:500],
            clean(r.get("postdate",""))[:100],
            clean(r.get("skills","")),
            clean(r.get("uniq_id",""))[:100],
        ))
    for chunk in batched(stage_jobs, BATCH):
        cur.executemany(
            """INSERT INTO raw_jobs
               (company,education,experience,industry,jobdescription,jobid,
                joblocation_address,jobtitle,numberofpositions,payrate,postdate,skills,uniq_id)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            chunk
        )
    conn.commit()

    # 3b. Build unique company list
    print("  Building unique companies ...")
    unique_companies = {}  # company_name -> (industry, location)
    for r in job_rows:
        name = clean(r.get("company", "")) or "Unknown Company"
        if name not in unique_companies:
            unique_companies[name] = (
                clean(r.get("industry", ""))[:255],
                clean(r.get("joblocation_address", ""))[:500],
            )

    print(f"  {len(unique_companies)} unique companies found")

    # Insert one recruiter user per unique company
    company_user_rows = [
        (f"recruiter_{slug}@auto.naukri.com", "$2b$12$auto_hash", "recruiter")
        for slug in (re.sub(r"\W+", "_", n)[:80] for n in unique_companies)
    ]
    for chunk in batched(company_user_rows, BATCH):
        cur.executemany(
            "INSERT IGNORE INTO users (email, pass_hash, role) VALUES (%s,%s,%s)",
            chunk
        )
    conn.commit()

    # Fetch user_ids for recruiter emails
    rec_emails = [r[0] for r in company_user_rows]
    cur.execute(
        "SELECT user_id, email FROM users WHERE email IN (%s)"
        % ",".join(["%s"] * len(rec_emails)),
        rec_emails
    )
    remail_to_uid = {email: uid for uid, email in cur.fetchall()}

    # Build company rows
    comp_insert = []
    company_name_to_email = {}
    for name, (industry, location) in unique_companies.items():
        slug  = re.sub(r"\W+", "_", name)[:80]
        email = f"recruiter_{slug}@auto.naukri.com"
        uid   = remail_to_uid.get(email)
        if uid:
            comp_insert.append((uid, name[:255], industry, location))
            company_name_to_email[name] = email

    for chunk in batched(comp_insert, BATCH):
        cur.executemany(
            "INSERT IGNORE INTO companies (user_id, company_name, industry, location) VALUES (%s,%s,%s,%s)",
            chunk
        )
    conn.commit()

    # Fetch company_id for each user_id
    comp_uids = [r[0] for r in comp_insert]
    cur.execute(
        "SELECT company_id, user_id FROM companies WHERE user_id IN (%s)"
        % ",".join(["%s"] * len(comp_uids)),
        comp_uids
    )
    uid_to_company_id = {uid: cid for cid, uid in cur.fetchall()}

    # Build name -> company_id map
    name_to_cid = {}
    for name, email in company_name_to_email.items():
        uid = remail_to_uid.get(email)
        cid = uid_to_company_id.get(uid)
        if cid:
            name_to_cid[name] = cid

    # 3c. Insert all jobs + job_skills
    print("  Inserting jobs and skill links ...")
    jobs_batch   = []
    inserted_jobs = 0

    # We need job_id after insert, so jobs must be inserted to get lastrowid
    # We do them in chunks and collect job_ids + skill links together
    js_rows = []  # (job_id, skill_id)

    for idx, r in enumerate(job_rows):
        comp_name = clean(r.get("company", "")) or "Unknown Company"
        cid = name_to_cid.get(comp_name)
        if not cid:
            continue

        exp_min, exp_max = parse_experience(r.get("experience", ""))
        title     = clean(r.get("jobtitle", ""))[:255] or "Untitled"
        desc      = clean(r.get("jobdescription", ""))
        payrate   = clean(r.get("payrate", ""))[:500]
        location  = clean(r.get("joblocation_address", ""))[:500]
        skills_raw= clean(r.get("skills", ""))
        try:
            num_pos = int(re.search(r"\d+", r.get("numberofpositions", "0") or "0").group())
        except Exception:
            num_pos = 1

        cur.execute(
            """INSERT INTO jobs
               (company_id, job_title, job_description, experience_min, experience_max,
                payrate, location, num_positions)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (cid, title, desc, exp_min, exp_max, payrate, location, max(1, num_pos))
        )
        job_id = cur.lastrowid
        inserted_jobs += 1

        for s in extract_skills(skills_raw + " " + desc):
            sid = skill_map.get(s)
            if sid:
                js_rows.append((job_id, sid))

        # Commit every BATCH rows to avoid huge transaction
        if inserted_jobs % BATCH == 0:
            conn.commit()
            print(f"    ... {inserted_jobs} jobs committed", end="\r")

    conn.commit()
    print(f"  Done: {inserted_jobs} jobs inserted")

    # Insert job_skills
    print("  Inserting job skill links ...")
    for chunk in batched(js_rows, BATCH):
        cur.executemany(
            "INSERT IGNORE INTO job_skills (job_id, skill_id, is_mandatory) VALUES (%s,%s,1)",
            chunk
        )
    conn.commit()
    print(f"  Done: {len(js_rows)} job-skill links")

    cur.close()
    conn.close()

    print("\n" + "="*50)
    print("ETL complete!")
    print(f"  Candidates      : {inserted_candidates}")
    print(f"  Jobs            : {inserted_jobs}")
    print(f"  Candidate skills: {len(cs_rows)}")
    print(f"  Job skills      : {len(js_rows)}")
    print("="*50)


if __name__ == "__main__":
    run()
