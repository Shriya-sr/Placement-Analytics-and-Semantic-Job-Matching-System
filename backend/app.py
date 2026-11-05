"""
app.py -- Placement Analytics & Semantic Matching FastAPI Backend Service
==========================================================================
Provides REST API endpoints for:
  - Semantic vector matching between candidates and jobs (ChromaDB)
  - Vector database CRUD operations
  - Application similarity score synchronization
"""

import os
import sys
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from vector_service import PlacementVectorService

app = FastAPI(
    title="Placement Analytics Semantic Vector Service",
    description="Vector database API powered by ChromaDB for real-time resume & job matching",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize vector service singleton
vector_service = PlacementVectorService()


# Request / Response Models
class CandidateQueryRequest(BaseModel):
    job_description: str
    top_k: int = 5
    category_filter: Optional[str] = None


class JobQueryRequest(BaseModel):
    resume_text: str
    top_k: int = 5


class CandidateIndexRequest(BaseModel):
    candidate_id: int
    full_name: str
    category: str
    cgpa: Optional[float] = None
    resume_text: str
    skills: Optional[List[str]] = None


class JobIndexRequest(BaseModel):
    job_id: int
    job_title: str
    company_name: str
    job_description: str
    experience_min: float = 0.0
    experience_max: Optional[float] = None
    location: str = ""


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Placement Analytics Vector Engine",
        "engine": "ChromaDB Persistent Client",
        "metric": "Cosine Similarity"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "chroma_resumes_count": vector_service.resumes_col.count(),
        "chroma_jobs_count": vector_service.jobs_col.count()
    }


@app.post("/api/match/candidates")
def match_candidates(req: CandidateQueryRequest):
    """Semantic Search: Match top candidates for a job description."""
    results = vector_service.match_candidates_for_job(
        job_description=req.job_description,
        top_k=req.top_k,
        category_filter=req.category_filter
    )
    return {"matches": results, "total": len(results)}


@app.post("/api/match/jobs")
def recommend_jobs(req: JobQueryRequest):
    """Semantic Search: Recommend top jobs for a candidate's resume/skills."""
    results = vector_service.recommend_jobs_for_candidate(
        resume_text=req.resume_text,
        top_k=req.top_k
    )
    return {"recommendations": results, "total": len(results)}


@app.post("/api/vector/candidate")
def upsert_candidate(req: CandidateIndexRequest):
    """Index or update candidate profile in ChromaDB."""
    ok = vector_service.add_candidate_resume(
        candidate_id=req.candidate_id,
        full_name=req.full_name,
        category=req.category,
        cgpa=req.cgpa,
        resume_text=req.resume_text,
        skills=req.skills
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to index candidate vector")
    return {"status": "success", "candidate_id": req.candidate_id}


@app.delete("/api/vector/candidate/{candidate_id}")
def delete_candidate(candidate_id: int):
    """Delete candidate from ChromaDB."""
    ok = vector_service.delete_candidate_vector(candidate_id)
    return {"status": "deleted" if ok else "failed", "candidate_id": candidate_id}


@app.post("/api/vector/job")
def upsert_job(req: JobIndexRequest):
    """Index or update job listing in ChromaDB."""
    ok = vector_service.add_job_posting(
        job_id=req.job_id,
        job_title=req.job_title,
        company_name=req.company_name,
        job_description=req.job_description,
        experience_min=req.experience_min,
        experience_max=req.experience_max,
        location=req.location
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to index job vector")
    return {"status": "success", "job_id": req.job_id}


@app.post("/api/vector/seed")
def seed_demo():
    """Seed ChromaDB with standard candidates and jobs."""
    stats = vector_service.seed_demo_data()
    return {"status": "seeded", "statistics": stats}


@app.post("/api/vector/sync-mysql")
def sync_mysql():
    """Sync candidate profiles & job listings from MySQL into ChromaDB."""
    stats = vector_service.sync_from_mysql()
    return {"status": "synced", "counts": stats}


if __name__ == "__main__":
    import uvicorn
    # Keep the demo server in a single process. Watching the project root can
    # restart it for unrelated files (datasets, docs, generated artifacts) and
    # interrupt Chroma's dependency imports during startup on Windows.
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
