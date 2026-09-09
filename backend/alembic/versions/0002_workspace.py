"""workspace quota and workspace-scoped analyses"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = '0002_workspace'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'workspace_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('plan', sa.String(length=32), nullable=False),
        sa.Column('analysis_limit', sa.Integer(), nullable=False),
        sa.Column('analyses_used', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column('analysis_records', sa.Column('workspace_id', UUID(as_uuid=True), nullable=True))
    op.create_index('ix_analysis_records_workspace_id', 'analysis_records', ['workspace_id'])
    op.alter_column('analysis_records', 'workspace_id', nullable=False)


def downgrade() -> None:
    op.drop_index('ix_analysis_records_workspace_id', table_name='analysis_records')
    op.drop_column('analysis_records', 'workspace_id')
    op.drop_table('workspace_records')
