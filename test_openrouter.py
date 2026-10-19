import os
from dotenv import load_dotenv
from openrouter import OpenRouter

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    print("OpenRouter API key not found!")
    exit()

client = OpenRouter(api_key=api_key)

response = client.chat.send(
    model="openrouter/free",
    messages=[
        {
            "role": "user",
            "content": "Explain in one sentence what an ATS resume analyzer does."
        }
    ]
)

print(response.choices[0].message.content)