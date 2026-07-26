from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models import SkillTag  # noqa: F401
from app.models import User  # noqa: F401
from app.routers import auth, feed, media, profiles
from app.services.cloudinary_service import configure_cloudinary
from app.services.profile_service import slugify
from app.services.storage import ensure_upload_dir

SEED_SKILLS = [
    "Python",
    "TypeScript",
    "React",
    "Next.js",
    "FastAPI",
    "UI Design",
    "Product Design",
    "DevOps",
    "PostgreSQL",
    "Machine Learning",
]


def seed_skills() -> None:
    db = SessionLocal()
    try:
        for name in SEED_SKILLS:
            slug = slugify(name)
            exists = db.query(SkillTag).filter(SkillTag.slug == slug).first()
            if not exists:
                db.add(SkillTag(name=name, slug=slug))
        db.commit()
    finally:
        db.close()


def ensure_profile_contact_columns() -> None:
    """SQLite-friendly additive migration for contact fields."""
    inspector = inspect(engine)
    if "profiles" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("profiles")}
    alters = []
    if "linkedin_url" not in cols:
        alters.append("ALTER TABLE profiles ADD COLUMN linkedin_url VARCHAR(500)")
    if "github_url" not in cols:
        alters.append("ALTER TABLE profiles ADD COLUMN github_url VARCHAR(500)")
    if "contact_email" not in cols:
        alters.append("ALTER TABLE profiles ADD COLUMN contact_email VARCHAR(255)")
    if not alters:
        return
    with engine.begin() as conn:
        for stmt in alters:
            conn.execute(text(stmt))


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Skillz API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(profiles.router)
    app.include_router(media.router)
    app.include_router(feed.router)

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        ensure_profile_contact_columns()
        ensure_upload_dir()
        seed_skills()
        configure_cloudinary()

    @app.get("/health")
    def health() -> dict:
        return {
            "status": "ok",
            "service": "skillz-api",
            "cloudinary": bool(
                settings.cloudinary_cloud_name and settings.cloudinary_api_key
            ),
        }

    return app


app = create_app()
