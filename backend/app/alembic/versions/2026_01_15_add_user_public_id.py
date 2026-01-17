"""Add public_id to user

Revision ID: b2c3d4e5f6g7
Revises: 1a31ce608336
Create Date: 2026-01-15 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = '1a31ce608336'
branch_labels = None
depends_on = None


def upgrade():
    # Add public_id column to user table
    op.add_column('user', sa.Column('public_id', sa.String(length=8), nullable=True))
    op.create_index(op.f('ix_user_public_id'), 'user', ['public_id'], unique=True)


def downgrade():
    # Remove public_id column from user table
    op.drop_index(op.f('ix_user_public_id'), table_name='user')
    op.drop_column('user', 'public_id')