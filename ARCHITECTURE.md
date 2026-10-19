
# ResumeIQ — System Architecture

This diagram shows how ResumeIQ processes a resume and stores its analysis results.

```mermaid
flowchart TD
    A["User"] --> B["React + Vite Frontend"]
    B --> C["FastAPI REST API"]

    C --> D["PDF Text Extraction"]
    C --> E["Skill Extraction - spaCy"]
    C --> F["Semantic Similarity - Sentence Transformers"]

    D --> G["ATS Score Calculation"]
    E --> G
    F --> G

    G --> H["AI Feedback - OpenRouter"]
    G --> I["SQLAlchemy ORM"]

    I --> J[("SQLite - Local Development")]
    I --> K[("Neon PostgreSQL - Cloud Deployment")]

    H --> L["Analysis Results"]
    G --> L
    L --> B
```

## Main Components

- **Frontend:** React and Vite provide the user interface.
- **Backend:** FastAPI handles requests and coordinates resume analysis.
- **PDF processing:** Extracts text from uploaded PDF resumes.
- **NLP:** spaCy extracts skills from resumes and job descriptions.
- **Semantic similarity:** Sentence Transformers compares resume and job-description meaning.
- **Scoring:** Combines skill matching and semantic similarity.
- **AI feedback:** OpenRouter provides recommendations through an LLM.
- **Database:** SQLAlchemy connects the application to SQLite locally and Neon PostgreSQL in deployment.
