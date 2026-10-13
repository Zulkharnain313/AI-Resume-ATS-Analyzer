
import app.main as main


def test_calculate_ats_score(monkeypatch):
    def fake_extract_skills(text):
        skills = {
            "resume": ["python", "sql"],
            "job": ["python", "sql", "docker", "aws"]
        }
        return skills[text]

    monkeypatch.setattr(main, "extract_skills", fake_extract_skills)
    monkeypatch.setattr(main, "calculate_similarity", lambda a, b: 0.5)

    result = main.calculate_ats_score("resume", "job")

    assert result["skill_match_score"] == 50
    assert result["semantic_similarity"] == 0.5
    assert result["semantic_score"] == 50
    assert result["ats_score"] == 50
    assert result["matched_skills"] == ["python", "sql"]
    assert result["missing_skills"] == ["aws", "docker"]


def test_calculate_ats_score_without_job_skills(monkeypatch):
    def fake_extract_skills(text):
        return ["python"] if text == "resume" else []

    monkeypatch.setattr(main, "extract_skills", fake_extract_skills)
    monkeypatch.setattr(main, "calculate_similarity", lambda a, b: 0.2)

    result = main.calculate_ats_score("resume", "job")

    assert result["skill_match_score"] == 0
    assert result["semantic_score"] == 20
    assert result["ats_score"] == 8
    assert result["missing_skills"] == []