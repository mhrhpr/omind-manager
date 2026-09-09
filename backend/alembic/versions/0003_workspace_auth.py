"""workspace bearer credential"""

from alembic import op
import sqlalchemy as sa

revision = '0003_workspace_auth'
down_revision = '0002_workspace'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workspace_records', sa.Column('auth_token_hash', sa.String(length=64), nullable=True))
    op.create_unique_constraint('uq_workspace_records_auth_token_hash', 'workspace_records', ['auth_token_hash'])


def downgrade() -> None:
    op.drop_constraint('uq_workspace_records_auth_token_hash', 'workspace_records', type_='unique')
    op.drop_column('workspace_records', 'auth_token_hash')
