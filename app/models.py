from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class ResumeAnalysis(Base):

    __tablename__ = "resume_analyses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    filename = Column(
        String,
        nullable=False
    )

    ats_score = Column(
        Integer,
        nullable=False
    )

    skill_match_score = Column(
        Integer,
        nullable=False
    )

    semantic_similarity = Column(
        Float,
        nullable=False
    )

    semantic_score = Column(
        Integer,
        nullable=False
    )

    resume_skills = Column(
        Text,
        nullable=False
    )

    job_skills = Column(
        Text,
        nullable=False
    )

    matched_skills = Column(
        Text,
        nullable=False
    )

    missing_skills = Column(
        Text,
        nullable=False
    )

    ai_analysis = Column(
        Text,
        nullable=False
    )