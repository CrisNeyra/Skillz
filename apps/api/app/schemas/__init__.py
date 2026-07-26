from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EnterRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool

    model_config = {"from_attributes": True}


# ---- Profile ----
class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = None
    avatar_url: str | None = None
    location: str | None = Field(default=None, max_length=120)
    linkedin_url: str | None = None
    github_url: str | None = None
    contact_email: str | None = None


class CustomizationUpdate(BaseModel):
    bg_color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    bg_image_url: str | None = None
    font_family: str | None = None
    flyer_url: str | None = None
    flyer_public_id: str | None = None


class CustomizationOut(BaseModel):
    bg_color: str | None
    bg_image_url: str | None
    font_family: str
    flyer_url: str | None
    flyer_public_id: str | None

    model_config = {"from_attributes": True}


class MediaOut(BaseModel):
    id: int
    url: str
    media_type: str
    slot: str
    caption: str | None
    cloudinary_public_id: str

    model_config = {"from_attributes": True}


class MediaConfirm(BaseModel):
    cloudinary_public_id: str
    url: str
    media_type: str = Field(pattern=r"^(image|video)$")
    slot: str
    caption: str | None = None


class LayoutUpdate(BaseModel):
    slots: dict[str, int | None]


class SkillOut(BaseModel):
    id: int
    name: str
    slug: str
    level: int
    is_verified: bool
    endorsement_count: int = 0

    model_config = {"from_attributes": True}


class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    level: int = Field(default=3, ge=1, le=5)


class DiplomaIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    issuer: str | None = None
    issued_at: datetime | None = None
    credential_url: str | None = None
    media_url: str | None = None


class DiplomaOut(DiplomaIn):
    id: int

    model_config = {"from_attributes": True}


class ExperienceIn(BaseModel):
    company: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=160)
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None


class ExperienceOut(ExperienceIn):
    id: int

    model_config = {"from_attributes": True}


class LinkIn(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    url: str
    sort_order: int = 0


class LinkOut(LinkIn):
    id: int

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    body: str
    author_username: str
    author_id: int
    parent_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfilePublic(BaseModel):
    id: int
    display_name: str
    headline: str | None
    bio: str | None
    avatar_url: str | None
    location: str | None
    username: str
    linkedin_url: str | None = None
    github_url: str | None = None
    contact_email: str | None = None


class LayoutSlots(BaseModel):
    hero: MediaOut | None = None
    left: list[MediaOut | None]
    right: list[MediaOut | None]


class ProfileBundle(BaseModel):
    profile: ProfilePublic
    customization: CustomizationOut
    layout: LayoutSlots
    skills: list[SkillOut]
    diplomas: list[DiplomaOut]
    experiences: list[ExperienceOut]
    links: list[LinkOut]
    comments: list[CommentOut]
    is_owner: bool = False
