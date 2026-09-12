import glob
import json
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(override=True)

MODEL = "gpt-4.1-nano"
openai_client = OpenAI()

SYSTEM_PREFIX = """
You represent Insurellm, the Insurance Tech company.
You are an expert in answering questions about Insurellm; its employees and its products.
You are provided with additional context that might be relevant to the user's question.
Give brief, accurate answers. If you don't know the answer, say so.

Relevant context:
"""

knowledge: dict[str, str] = {}


def load_knowledge() -> None:
    knowledge.clear()
    for filename in glob.glob("../knowledge-base/employees/*"):
        name = Path(filename).stem.split(" ")[-1]
        with open(filename, "r", encoding="utf-8") as f:
            knowledge[name.lower()] = f.read()
    for filename in glob.glob("../knowledge-base/products/*"):
        name = Path(filename).stem
        with open(filename, "r", encoding="utf-8") as f:
            knowledge[name.lower()] = f.read()


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_knowledge()
    yield


app = FastAPI(title="Insurellm Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_relevant_context_simple(message: str) -> list[str]:
    text = "".join(ch for ch in message if ch.isalpha() or ch.isspace())
    words = text.lower().split()
    return [knowledge[word] for word in words if word in knowledge]


def additional_context(message: str) -> str:
    relevant_context = get_relevant_context_simple(message)
    if not relevant_context:
        return "There is no additional context relevant to the user's question."
    result = "The following additional context might be relevant in answering the user's question:\n\n"
    result += "\n\n".join(relevant_context)
    return result

 

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


def build_messages(request: ChatRequest) -> list[dict]:
    system_message = SYSTEM_PREFIX + additional_context(request.message)
    messages = [{"role": "system", "content": system_message}]
    messages += [m.model_dump() for m in request.history]
    messages.append({"role": "user", "content": request.message})
    return messages


@app.get("/health")
def health():
    return {"status": "ok", "knowledge_entries": len(knowledge)}

@app.get("/")
def root():
    return {"message": "Welcome to Insurellm!"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    messages = build_messages(request)
    response = openai_client.chat.completions.create(model=MODEL, messages=messages)
    return ChatResponse(reply=response.choices[0].message.content)


def stream_chat_events(request: ChatRequest):
    messages = build_messages(request)
    stream = openai_client.chat.completions.create(model=MODEL, messages=messages, stream=True)
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield f"data: {json.dumps({'content': delta})}\n\n"
    yield "data: [DONE]\n\n"


@app.post("/chat/stream")
def chat_stream(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    return StreamingResponse(stream_chat_events(request), media_type="text/event-stream")
