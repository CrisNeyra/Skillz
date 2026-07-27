from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db import session as session_module
from app.db.migrate import run_migrations
from app.models import SkillTag  # noqa: F401
from app.models import User  # noqa: F401
from app.routers import auth, feed, media, profiles
from app.services.cloudinary_service import configure_cloudinary
from app.services.profile_service import slugify
from app.services.storage import ensure_upload_dir

logger = logging.getLogger("skillz")

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
    db = session_module.SessionLocal()
    try:
        for name in SEED_SKILLS:
            slug = slugify(name)
            exists = db.query(SkillTag).filter(SkillTag.slug == slug).first()
            if not exists:
                db.add(SkillTag(name=name, slug=slug))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    settings.validate_security()
    if settings.has_insecure_jwt_secret and not settings.is_production:
        logger.warning(
            "JWT_SECRET débil o por defecto. Generá uno fuerte antes de exponer el API."
        )
    run_migrations()
    ensure_upload_dir()
    seed_skills()
    configure_cloudinary()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Skillz API", version="0.1.0", lifespan=lifespan)
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
