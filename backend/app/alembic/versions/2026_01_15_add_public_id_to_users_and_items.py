"""add public_id to users and items

Revision ID: a1b2c3d4e5f6
Revises: 1a31ce608336
Create Date: 2026-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '1a31ce608336'
branch_labels = None
depends_on = None


def upgrade():
    # Add public_id column to user table
    op.add_column('user', sa.Column('public_id', sa.String(length=8), nullable=True))
    op.create_index(op.f('ix_user_public_id'), 'user', ['public_id'], unique=True)

    # Add public_id column to item table
    op.add_column('item', sa.Column('public_id', sa.String(length=8), nullable=True))
    op.create_index(op.f('ix_item_public_id'), 'item', ['public_id'], unique=True)

    # Generate unique IDs for existing records
    # Note: This will need to be done manually or via a data migration script
    # For now, we'll allow nullable until IDs are generated

    # After data migration, make columns non-nullable
    # op.alter_column('user', 'public_id', nullable=False)
    # op.alter_column('item', 'public_id', nullable=False)


def downgrade():
    # Drop indexes and columns
    op.drop_index(op.f('ix_item_public_id'), table_name='item')
    op.drop_column('item', 'public_id')

    op.drop_index(op.f('ix_user_public_id'), table_name='user')
    op.drop_column('user', 'public_id')
