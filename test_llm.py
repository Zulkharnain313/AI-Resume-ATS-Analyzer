from app.llm import analyze_resume_with_llm


resume = """
I am a Python developer with experience in FastAPI, SQL,
MySQL and machine learning. I have built REST APIs and
worked on NLP projects.
"""

job_description = """
We are looking for a Python developer with experience in
FastAPI, SQL, machine learning, Docker and AWS.
"""

ats_score = 72

missing_skills = ["aws", "docker"]


result = analyze_resume_with_llm(
    resume,
    job_description,
    ats_score,
    missing_skills
)

print("\n===== AI RESUME ANALYSIS =====\n")
print(result)