from app.embedding import calculate_similarity


job_text = "Natural language processing experience"

resume_text = "Worked on NLP projects"


similarity = calculate_similarity(
    job_text,
    resume_text
)


print("Semantic similarity:", similarity)