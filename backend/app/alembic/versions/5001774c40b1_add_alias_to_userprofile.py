"""add alias to userprofile

Revision ID: 5001774c40b1
Revises: 5ad46be3404a
Create Date: 2026-01-22 19:16:37.189056

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '5001774c40b1'
down_revision = '5ad46be3404a'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('userprofile', sa.Column('alias', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('userprofile', 'alias')
