import os
import chromadb
from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "travel_docs.txt")
CHROMA_DIR = os.path.join(BASE_DIR, "chroma_db")

COLLECTION_NAME = "travel_docs"


def load_documents():
    if not os.path.exists(DATA_FILE):
        return []

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        docs = [line.strip() for line in f if line.strip()]

    return docs


def ingest_documents():
    docs = load_documents()

    if not docs:
        print("문서가 없습니다.")
        return

    model = SentenceTransformer("jhgan/ko-sroberta-multitask")

    client = chromadb.PersistentClient(path=CHROMA_DIR)

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME
    )

    ids = []
    embeddings = []
    metadatas = []

    for idx, doc in enumerate(docs):
        ids.append(f"doc_{idx}")
        embeddings.append(model.encode(doc).tolist())
        metadatas.append({
            "source": "travel_docs.txt"
        })

    collection.upsert(
        ids=ids,
        documents=docs,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"{len(docs)}개 문서 ChromaDB 저장 완료")


if __name__ == "__main__":
    ingest_documents()