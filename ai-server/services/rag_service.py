import os
import chromadb
from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

COLLECTION_NAME = "travel_docs"

model = SentenceTransformer("jhgan/ko-sroberta-multitask")


def rag_search(query: str, top_k: int = 5):
    try:
        client = chromadb.PersistentClient(path=CHROMA_DIR)

        collection = client.get_or_create_collection(
            name=COLLECTION_NAME
        )

        query_embedding = model.encode(query).tolist()

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )

        docs = results.get("documents", [[]])[0]

        return docs

    except Exception as e:
        print("RAG Search Error:", e)
        return []