"""reshape users table for auth assignment

Revision ID: 0002_user_auth_assignment
Revises: 0001_initial_schema
Create Date: 2026-04-10 23:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_user_auth_assignment"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("first_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=50), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("type", sa.String(length=50), nullable=True))

    op.execute("UPDATE users SET first_name = COALESCE(name, 'User')")
    op.execute("UPDATE users SET last_name = 'Account'")
    op.execute("UPDATE users SET phone_number = '+10000000000'")
    op.execute("UPDATE users SET city = 'Unknown'")
    op.execute("UPDATE users SET age = 18")
    op.execute(
        "UPDATE users SET type = CASE WHEN role = 'admin' THEN 'admin' ELSE 'client' END"
    )

    op.alter_column("users", "first_name", nullable=False)
    op.alter_column("users", "last_name", nullable=False)
    op.alter_column("users", "phone_number", nullable=False)
    op.alter_column("users", "city", nullable=False)
    op.alter_column("users", "age", nullable=False)
    op.alter_column("users", "type", nullable=False)

    op.drop_column("users", "name")
    op.drop_column("users", "role")
    op.drop_column("users", "deleted_at")


def downgrade() -> None:
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("role", sa.String(length=50), nullable=False, server_default="admin"))
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=False, server_default="User"))

    op.execute("UPDATE users SET name = first_name || ' ' || last_name")
    op.execute("UPDATE users SET role = CASE WHEN type = 'admin' THEN 'admin' ELSE 'super_admin' END")

    op.drop_column("users", "type")
    op.drop_column("users", "age")
    op.drop_column("users", "city")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
