from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import hiring, keywords, submissions

# Constants
ORIGINS = [
    "http://localhost:5173",
    "https://hn-trends.vercel.app"
]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=[],
)

app.include_router(hiring.router, prefix="/hiring")
app.include_router(keywords.router, prefix="/keywords")
app.include_router(submissions.router, prefix="/submissions")




