from app.skill_extractor import extract_skills


text = """
I am a Python developer with experience in
FastAPI, SQL, Machine Learning, Docker,
GitHub and Data Science.
"""


skills = extract_skills(text)

print("Detected skills:")
print(skills)