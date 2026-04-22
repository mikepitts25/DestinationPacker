"""Add missing enum values: wellness, shopping, souvenirs to activitytype

Revision ID: 001
Revises:
Create Date: 2026-04-21
"""
from alembic import op

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL ALTER TYPE ... ADD VALUE is the only way to extend an enum.
    # IF NOT EXISTS prevents errors if the value already exists (PG 9.6+).
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'wellness'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'shopping'")
    op.execute("ALTER TYPE activitytype ADD VALUE IF NOT EXISTS 'souvenirs'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values without recreating the type.
    pass
