from app.database import engine, Base
from app.models import ResumeAnalysis


Base.metadata.create_all(
    bind=engine
)

print("Database tables created successfully!")