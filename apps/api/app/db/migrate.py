from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

from app.core.config import get_settings
from app.db import session as session_module

API_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = API_ROOT / "alembic.ini"
INITIAL_REVISION = "20260726_0001"


def _alembic_config() -> Config:
    cfg = Config(str(ALEMBIC_INI))
    cfg.set_main_option("sqlalchemy.url", get_settings().database_url)
    return cfg


def run_migrations() -> None:
    """Upgrade to head. Legacy DBs created via create_all get stamped first."""
    cfg = _alembic_config()
    inspector = inspect(session_module.engine)
    tables = set(inspector.get_table_names())

    if "users" in tables and "alembic_version" not in tables:
        # Legacy DBs created with create_all already match current schema.
        head = ScriptDirectory.from_config(cfg).get_current_head()
        command.stamp(cfg, head or INITIAL_REVISION)

    with session_module.engine.connect() as conn:
        current = MigrationContext.configure(conn).get_current_revision()
    head = ScriptDirectory.from_config(cfg).get_current_head()
    if current == head:
        return

    command.upgrade(cfg, "head")
