"""Activity events + notifications helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ActivityEvent, Notification, Profile, User


def record_activity(
    db: Session,
    *,
    actor: User,
    event_type: str,
    summary: str,
    profile: Profile | None = None,
    ref_id: int | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        actor_user_id=actor.id,
        profile_id=profile.id if profile else None,
        event_type=event_type,
        ref_id=ref_id,
        summary=summary[:280],
    )
    db.add(event)
    return event


def notify(
    db: Session,
    *,
    user_id: int,
    actor: User | None,
    notif_type: str,
    body: str,
    ref_id: int | None = None,
) -> Notification | None:
    if actor and actor.id == user_id:
        return None
    item = Notification(
        user_id=user_id,
        actor_user_id=actor.id if actor else None,
        notif_type=notif_type,
        body=body[:280],
        ref_id=ref_id,
    )
    db.add(item)
    return item
