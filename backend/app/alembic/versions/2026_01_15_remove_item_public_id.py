"""remove item public_id

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-15 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Drop index and column from item table
    op.drop_index(op.f('ix_item_public_id'), table_name='item')
    op.drop_column('item', 'public_id')


def downgrade():
    # Re-add public_id column to item table
    op.add_column('item', sa.Column('public_id', sa.String(length=8), nullable=True))
    op.create_index(op.f('ix_item_public_id'), 'item', ['public_id'], unique=True)
