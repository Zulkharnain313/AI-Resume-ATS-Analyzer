
import os

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

model = None


def calculate_similarity(text1, text2):
    mode = os.getenv("SIMILARITY_MODE", "transformer").lower()

    if mode == "tfidf":
        vectorizer = TfidfVectorizer()

        try:
            vectors = vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
            return round(float(similarity), 4)
        except ValueError:
            return 0.0

    from sentence_transformers import SentenceTransformer

    global model

    if model is None:
        model = SentenceTransformer("all-MiniLM-L6-v2")

    embeddings = model.encode([text1, text2])
    similarity = cosine_similarity(
        embeddings[0:1],
        embeddings[1:2]
    )[0][0]

    return round(float(similarity), 4)
