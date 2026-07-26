from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models import Comment, Diploma, Endorsement, ExternalLink, ProfileSkill, User, WorkExperience
from app.schemas import (
    CommentCreate,
    CommentOut,
    DiplomaIn,
    DiplomaOut,
    ExperienceIn,
    ExperienceOut,
    LinkIn,
    LinkOut,
    SkillCreate,
    SkillOut,
)
from app.services.profile_service import get_or_create_skill_tag, get_profile_by_username

router = APIRouter(tags=["feed"])


@router.post("/profiles/me/skills", response_model=SkillOut)
def add_skill(
    payload: SkillCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SkillOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    tag = get_or_create_skill_tag(db, payload.name)
    existing = (
        db.query(ProfileSkill)
        .filter(ProfileSkill.profile_id == profile.id, ProfileSkill.skill_tag_id == tag.id)
        .first()
    )
    if existing:
        existing.level = payload.level
        db.commit()
        db.refresh(existing)
        return SkillOut(
            id=existing.id,
            name=tag.name,
            slug=tag.slug,
            level=existing.level,
            is_verified=existing.is_verified,
            endorsement_count=len(existing.endorsements),
        )
    ps = ProfileSkill(profile_id=profile.id, skill_tag_id=tag.id, level=payload.level)
    db.add(ps)
    db.commit()
    db.refresh(ps)
    return SkillOut(
        id=ps.id,
        name=tag.name,
        slug=tag.slug,
        level=ps.level,
        is_verified=ps.is_verified,
        endorsement_count=0,
    )


@router.delete("/profiles/me/skills/{skill_id}")
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    ps = db.get(ProfileSkill, skill_id)
    if not ps or ps.profile_id != profile.id:
        raise HTTPException(status_code=404, detail="Skill no encontrada")
    db.delete(ps)
    db.commit()
    return {"ok": True}


@router.post("/skills/{skill_id}/endorse")
def endorse_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    ps = db.get(ProfileSkill, skill_id)
    if not ps:
        raise HTTPException(status_code=404, detail="Skill no encontrada")
    owner_profile = get_profile_by_username(db, user.username)
    if owner_profile and ps.profile_id == owner_profile.id:
        raise HTTPException(status_code=400, detail="No podés endosar tu propia skill")
    existing = (
        db.query(Endorsement)
        .filter(Endorsement.profile_skill_id == skill_id, Endorsement.endorser_id == user.id)
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(Endorsement(profile_skill_id=skill_id, endorser_id=user.id))
    db.commit()
    return {"ok": True}


@router.post("/profiles/me/diplomas", response_model=DiplomaOut)
def add_diploma(
    payload: DiplomaIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DiplomaOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = Diploma(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return DiplomaOut.model_validate(item)


@router.post("/profiles/me/experiences", response_model=ExperienceOut)
def add_experience(
    payload: ExperienceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExperienceOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = WorkExperience(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return ExperienceOut.model_validate(item)


@router.post("/profiles/me/links", response_model=LinkOut)
def add_link(
    payload: LinkIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LinkOut:
    profile = get_profile_by_username(db, user.username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    item = ExternalLink(profile_id=profile.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return LinkOut.model_validate(item)


@router.get("/profiles/{username}/comments", response_model=list[CommentOut])
def list_comments(username: str, db: Session = Depends(get_db)) -> list[CommentOut]:
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    comments = (
        db.query(Comment)
        .filter(Comment.profile_id == profile.id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [
        CommentOut(
            id=c.id,
            body=c.body,
            author_username=c.author.username,
            author_id=c.author_id,
            parent_id=c.parent_id,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/profiles/{username}/comments", response_model=CommentOut)
def add_comment(
    username: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CommentOut:
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    comment = Comment(
        profile_id=profile.id,
        author_id=user.id,
        body=payload.body,
        parent_id=payload.parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentOut(
        id=comment.id,
        body=comment.body,
        author_username=user.username,
        author_id=user.id,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
    )
