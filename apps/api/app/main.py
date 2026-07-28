from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.security import hash_password
from app.db import session as session_module
from app.db.migrate import run_migrations
from app.models import CustomizationSettings, Profile, SkillTag, User  # noqa: F401
from app.routers import ai, auth, feed, media, profiles, social
from app.services.cloudinary_service import configure_cloudinary
from app.services.profile_service import slugify
from app.services.storage import ensure_upload_dir
from sqlalchemy.orm import joinedload

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

DEMO_EMAIL = "test@test.com"
DEMO_USERNAME = "test"
DEMO_PASSWORD = "123456Ab"
DEMO_DISPLAY_NAME = "Demo Talent"


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


def seed_demo_user() -> None:
    """Idempotent demo account for local/dev login prefill."""
    db = session_module.SessionLocal()
    try:
        existing = (
            db.query(User)
            .options(joinedload(User.profile))
            .filter(User.email == DEMO_EMAIL)
            .first()
        )
        if existing:
            if existing.profile and not existing.profile.onboarding_completed:
                existing.profile.onboarding_completed = True
                db.commit()
            return
        if db.query(User).filter(User.username == DEMO_USERNAME).first():
            logger.warning(
                "No se pudo crear usuario demo: username '%s' ya existe.",
                DEMO_USERNAME,
            )
            return
        user = User(
            email=DEMO_EMAIL,
            username=DEMO_USERNAME,
            hashed_password=hash_password(DEMO_PASSWORD),
        )
        db.add(user)
        db.flush()
        profile = Profile(
            user_id=user.id,
            display_name=DEMO_DISPLAY_NAME,
            onboarding_completed=True,
        )
        db.add(profile)
        db.flush()
        db.add(
            CustomizationSettings(
                profile_id=profile.id,
                font_family="Space Grotesk",
                bg_color="#ffffff",
            )
        )
        db.commit()
        logger.info("Usuario demo creado: %s / %s", DEMO_EMAIL, DEMO_USERNAME)
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
    if not settings.is_production:
        seed_demo_user()
    configure_cloudinary()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    if settings.sentry_dsn.strip():
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                environment=settings.environment,
                integrations=[FastApiIntegration()],
                traces_sample_rate=0.1 if settings.is_production else 0.0,
            )
        except Exception:
            logger.warning("Sentry no pudo inicializarse")

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
    app.include_router(ai.router)
    app.include_router(social.router)

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
