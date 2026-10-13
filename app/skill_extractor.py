
import spacy
from spacy.matcher import PhraseMatcher


nlp = spacy.blank("en")

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")


SKILLS = [
    "python",
    "sql",
    "fastapi",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data science",
    "data analysis",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "git",
    "github",
    "java",
    "c++",
    "c",
    "javascript",
    "react",
    "html",
    "css",
    "mysql",
    "postgresql",
    "mongodb",
    "rest api",
    "rest apis",
    "linux",
    "vlsi",
    "verilog",
    "arduino",
    "esp32"
]


patterns = [
    nlp.make_doc(skill)
    for skill in SKILLS
]

matcher.add("SKILLS", patterns)


def extract_skills(text):
    doc = nlp(text)
    matches = matcher(doc)

    found_skills = set()

    for match_id, start, end in matches:
        skill = doc[start:end].text.lower()

        # Normalize REST APIs to REST API
        if skill == "rest apis":
            skill = "rest api"

        found_skills.add(skill)

    return sorted(found_skills)
