"""Community updates

Revision ID: 539fed9ccb15
Revises: 438fed9ccb14
Create Date: 2026-01-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '539fed9ccb15'
down_revision = '438fed9ccb14'
branch_labels = None
depends_on = None


def upgrade():
    # Add is_closed to community
    op.add_column('community', sa.Column('is_closed', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    
    # Add status to communitymember
    # Create the enum type
    communitymemberstatus = sa.Enum('PENDING', 'ACCEPTED', 'REJECTED', name='communitymemberstatus')
    communitymemberstatus.create(op.get_bind())
    
    op.add_column('communitymember', sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'REJECTED', name='communitymemberstatus'), nullable=False, server_default='ACCEPTED'))


def downgrade():
    op.drop_column('communitymember', 'status')
    # Drop enum
    sa.Enum(name='communitymemberstatus').drop(op.get_bind())
    
    op.drop_column('community', 'is_closed')
