import os
from dotenv import load_dotenv

load_dotenv()

if os.getenv("OPENAI_API_KEY"):
    print("API key loaded successfully!")
else:
    print("API key not found!")