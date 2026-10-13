
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "AI Resume ATS Analyzer API is running"
    }


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy"
    }


def test_get_all_analyses():
    response = client.get("/analyses")

    assert response.status_code == 200

    data = response.json()

    assert "total" in data
    assert "analyses" in data
    assert isinstance(data["analyses"], list)


def test_analysis_not_found():
    response = client.get("/analyses/999999999")

    assert response.status_code == 404


def test_upload_resume_rejects_non_pdf():
    response = client.post(
        "/upload-resume",
        files={
            "file": (
                "resume.txt",
                b"This is not a PDF file.",
                "text/plain"
            )
        }
    )

    assert response.status_code == 400


def test_update_analysis_not_found():
    response = client.put(
        "/analyses/999999999",
        json={"filename": "Updated_Resume.pdf"}
    )

    assert response.status_code == 404


def test_delete_analysis_not_found():
    response = client.delete("/analyses/999999999")

    assert response.status_code == 404