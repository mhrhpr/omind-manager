"""initial OMIND persistence tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'analysis_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('raw_file_key', sa.String(length=512), nullable=False),
        sa.Column('rows', sa.Integer(), nullable=False),
        sa.Column('columns', sa.Integer(), nullable=False),
        sa.Column('health', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Integer(), nullable=False),
        sa.Column('result_json', JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        'decision_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('analysis_id', UUID(as_uuid=True), nullable=False),
        sa.Column('problem', sa.Text(), nullable=False),
        sa.Column('evidence', JSONB, nullable=False),
        sa.Column('assumptions', JSONB, nullable=False),
        sa.Column('hypotheses', JSONB, nullable=False),
        sa.Column('decision', sa.Text(), nullable=False),
        sa.Column('expected_outcome', sa.Text(), nullable=False),
        sa.Column('experiment', sa.Text(), nullable=False),
        sa.Column('actual_outcome', sa.Text(), nullable=True),
        sa.Column('lesson', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_decision_records_analysis_id', 'decision_records', ['analysis_id'])


def downgrade() -> None:
    op.drop_index('ix_decision_records_analysis_id', table_name='decision_records')
    op.drop_table('decision_records')
    op.drop_table('analysis_records')
