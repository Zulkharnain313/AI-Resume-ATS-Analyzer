import os
import json
from dotenv import load_dotenv
from openrouter import OpenRouter
from pydantic import BaseModel, ValidationError


load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise ValueError("OpenRouter API key not found!")


client = OpenRouter(api_key=api_key)


class MissingSkillGuidance(BaseModel):
    skill: str
    has_related_evidence: bool
    guidance: str


class ResumeAnalysis(BaseModel):
    match_summary: str
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    missing_skills_guidance: list[MissingSkillGuidance]


def analyze_resume_with_llm(
    resume_text,
    job_description,
    ats_score,
    missing_skills
):

    prompt = f"""
You are an AI resume analysis assistant.

Analyze the candidate's resume against the job description.

IMPORTANT RULES:

1. Never invent experience, projects, education, certifications,
   technologies, or skills.

2. Never tell the candidate to falsely claim a skill.

3. Recommendations must use only truthful information.

4. If a skill is missing and there is no evidence of it in the
   resume, recommend learning it or building a relevant project
   before adding it to the resume.

5. Keep the analysis concise and professional.

6. Return ONLY valid JSON.
   Do not use markdown.
   Do not use ```json.
   Do not add any text before or after the JSON.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

CURRENT ATS SCORE:
{ats_score}

MISSING SKILLS:
{missing_skills}

Return JSON using exactly this structure:

{{
    "match_summary": "Brief summary of how well the resume matches the job.",
    "strengths": [
        "Strong point 1",
        "Strong point 2"
    ],
    "weaknesses": [
        "Weakness 1",
        "Weakness 2"
    ],
    "recommendations": [
        "Practical recommendation 1",
        "Practical recommendation 2"
    ],
    "missing_skills_guidance": [
        {{
            "skill": "skill name",
            "has_related_evidence": false,
            "guidance": "Honest guidance for the candidate."
        }}
    ]
}}
"""

    response = client.chat.send(
        model="openrouter/free",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    response_text = response.choices[0].message.content

    # Convert the JSON text into Python data
    try:
        data = json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "error": "LLM returned invalid JSON",
            "raw_response": response_text
        }

    # Validate the structure using Pydantic
    try:
        validated_data = ResumeAnalysis.model_validate(data)

        return validated_data.model_dump()

    except ValidationError as error:
        return {
            "error": "LLM response structure is invalid",
            "details": error.errors(),
            "raw_response": data
        }