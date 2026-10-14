
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.pdf_parser import extract_text_from_pdf
from app.skill_extractor import extract_skills
from app.embedding import calculate_similarity
from app.llm import analyze_resume_with_llm

from app.database import SessionLocal
from app.models import ResumeAnalysis

import tempfile
import os
import json


# ---------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------

app = FastAPI(
    title="AI Resume ATS Analyzer",
    description="API for analyzing resumes against job descriptions",
    version="1.0.0"
)

# ---------------------------------------------------------
# CORS CONFIGURATION
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# ROOT ENDPOINT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "AI Resume ATS Analyzer API is running"
    }


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ---------------------------------------------------------
# REQUEST MODEL
# ---------------------------------------------------------

class ResumeRequest(BaseModel):
    resume: str
    job_description: str


# ---------------------------------------------------------
# ATS SCORE CALCULATION
# ---------------------------------------------------------

def calculate_ats_score(resume, job_description):
    resume_skills = set(extract_skills(resume))
    job_skills = set(extract_skills(job_description))

    matched_skills = sorted(
        resume_skills.intersection(job_skills)
    )

    missing_skills = sorted(
        job_skills - resume_skills
    )

    total_required = len(job_skills)

    if total_required > 0:
        skill_match_score = round(
            len(matched_skills) / total_required * 100
        )
    else:
        skill_match_score = 0

    semantic_similarity = calculate_similarity(
        resume,
        job_description
    )

    semantic_score = round(semantic_similarity * 100)

    final_ats_score = round(
        skill_match_score * 0.60
        + semantic_score * 0.40
    )

    return {
        "ats_score": final_ats_score,
        "skill_match_score": skill_match_score,
        "semantic_similarity": semantic_similarity,
        "semantic_score": semantic_score,
        "resume_skills": sorted(resume_skills),
        "job_skills": sorted(job_skills),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }


# ---------------------------------------------------------
# FALLBACK RECOMMENDATIONS
# ---------------------------------------------------------

def generate_recommendations(missing_skills):
    return [
        f"Consider learning {skill} and gaining hands-on "
        f"experience before adding it to your resume."
        for skill in missing_skills
    ]


# ---------------------------------------------------------
# ANALYZE TEXT RESUME
# ---------------------------------------------------------

@app.post("/analyze")
def analyze_resume(request: ResumeRequest):
    ats_result = calculate_ats_score(
        request.resume,
        request.job_description
    )

    recommendations = generate_recommendations(
        ats_result["missing_skills"]
    )

    ai_analysis = analyze_resume_with_llm(
        request.resume,
        request.job_description,
        ats_result["ats_score"],
        ats_result["missing_skills"]
    )

    return {
        "ats_score": ats_result["ats_score"],
        "skill_match_score": ats_result["skill_match_score"],
        "semantic_similarity": ats_result["semantic_similarity"],
        "semantic_score": ats_result["semantic_score"],
        "resume_skills": ats_result["resume_skills"],
        "job_skills": ats_result["job_skills"],
        "matched_skills": ats_result["matched_skills"],
        "missing_skills": ats_result["missing_skills"],
        "recommendations": ai_analysis.get(
            "recommendations", recommendations
        ),
        "ai_analysis": ai_analysis
    }


# ---------------------------------------------------------
# UPLOAD RESUME PDF
# ---------------------------------------------------------

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    )

    try:
        contents = await file.read()
        temp_file.write(contents)
        temp_file.close()

        text = extract_text_from_pdf(temp_file.name)

        return {
            "filename": file.filename,
            "text": text
        }

    finally:
        temp_file.close()

        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)


# ---------------------------------------------------------
# ANALYZE PDF AND SAVE TO DATABASE
# ---------------------------------------------------------

@app.post("/analyze-pdf")
async def analyze_pdf(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    )

    try:
        contents = await file.read()
        temp_file.write(contents)
        temp_file.close()

        resume_text = extract_text_from_pdf(temp_file.name)

        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the PDF."
            )

        ats_result = calculate_ats_score(
            resume_text,
            job_description
        )

        recommendations = generate_recommendations(
            ats_result["missing_skills"]
        )

        ai_analysis = analyze_resume_with_llm(
            resume_text,
            job_description,
            ats_result["ats_score"],
            ats_result["missing_skills"]
        )

        ai_recommendations = ai_analysis.get(
            "recommendations", recommendations
        )

        db = SessionLocal()

        try:
            analysis = ResumeAnalysis(
                filename=file.filename,
                ats_score=ats_result["ats_score"],
                skill_match_score=ats_result["skill_match_score"],
                semantic_similarity=ats_result["semantic_similarity"],
                semantic_score=ats_result["semantic_score"],
                resume_skills=json.dumps(
                    ats_result["resume_skills"]
                ),
                job_skills=json.dumps(
                    ats_result["job_skills"]
                ),
                matched_skills=json.dumps(
                    ats_result["matched_skills"]
                ),
                missing_skills=json.dumps(
                    ats_result["missing_skills"]
                ),
                ai_analysis=json.dumps(ai_analysis)
            )

            db.add(analysis)
            db.commit()
            db.refresh(analysis)

            analysis_id = analysis.id

        except Exception:
            db.rollback()
            raise

        finally:
            db.close()

        return {
            "id": analysis_id,
            "filename": file.filename,
            "ats_score": ats_result["ats_score"],
            "skill_match_score": ats_result["skill_match_score"],
            "semantic_similarity": ats_result["semantic_similarity"],
            "semantic_score": ats_result["semantic_score"],
            "resume_skills": ats_result["resume_skills"],
            "job_skills": ats_result["job_skills"],
            "matched_skills": ats_result["matched_skills"],
            "missing_skills": ats_result["missing_skills"],
            "recommendations": ai_recommendations,
            "ai_analysis": ai_analysis
        }

    finally:
        temp_file.close()

        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)


# ---------------------------------------------------------
# GET ALL SAVED ANALYSES
# ---------------------------------------------------------

@app.get("/analyses")
def get_all_analyses():
    db = SessionLocal()

    try:
        analyses = (
            db.query(ResumeAnalysis)
            .order_by(ResumeAnalysis.id.desc())
            .all()
        )

        results = []

        for analysis in analyses:
            results.append({
                "id": analysis.id,
                "filename": analysis.filename,
                "ats_score": analysis.ats_score,
                "skill_match_score": analysis.skill_match_score,
                "semantic_similarity": analysis.semantic_similarity,
                "semantic_score": analysis.semantic_score
            })

        return {
            "total": len(results),
            "analyses": results
        }

    finally:
        db.close()


# ---------------------------------------------------------
# GET ONE ANALYSIS BY ID
# ---------------------------------------------------------

@app.get("/analyses/{analysis_id}")
def get_analysis_by_id(analysis_id: int):
    db = SessionLocal()

    try:
        analysis = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.id == analysis_id)
            .first()
        )

        if analysis is None:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis with ID {analysis_id} not found."
            )

        return {
            "id": analysis.id,
            "filename": analysis.filename,
            "ats_score": analysis.ats_score,
            "skill_match_score": analysis.skill_match_score,
            "semantic_similarity": analysis.semantic_similarity,
            "semantic_score": analysis.semantic_score,
            "resume_skills": json.loads(analysis.resume_skills),
            "job_skills": json.loads(analysis.job_skills),
            "matched_skills": json.loads(analysis.matched_skills),
            "missing_skills": json.loads(analysis.missing_skills),
            "ai_analysis": json.loads(analysis.ai_analysis)
        }

    finally:
        db.close()


# ---------------------------------------------------------
# UPDATE A SAVED ANALYSIS
# ---------------------------------------------------------

class AnalysisUpdate(BaseModel):
    filename: str


@app.put("/analyses/{analysis_id}")
def update_analysis(
    analysis_id: int,
    request: AnalysisUpdate
):
    db = SessionLocal()

    try:
        analysis = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.id == analysis_id)
            .first()
        )

        if analysis is None:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis with ID {analysis_id} not found."
            )

        analysis.filename = request.filename

        db.commit()
        db.refresh(analysis)

        return {
            "message": "Analysis updated successfully",
            "id": analysis.id,
            "filename": analysis.filename,
            "ats_score": analysis.ats_score
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


# ---------------------------------------------------------
# DELETE A SAVED ANALYSIS
# ---------------------------------------------------------

@app.delete("/analyses/{analysis_id}")
def delete_analysis(analysis_id: int):
    db = SessionLocal()

    try:
        analysis = (
            db.query(ResumeAnalysis)
            .filter(ResumeAnalysis.id == analysis_id)
            .first()
        )

        if analysis is None:
            raise HTTPException(
                status_code=404,
                detail=f"Analysis with ID {analysis_id} not found."
            )

        deleted_id = analysis.id
        deleted_filename = analysis.filename

        db.delete(analysis)
        db.commit()

        return {
            "message": "Analysis deleted successfully",
            "id": deleted_id,
            "filename": deleted_filename
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
