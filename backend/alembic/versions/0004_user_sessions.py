"""durable user authentication and workspace ownership"""

from alembic import op
import sqlalchemy as sa

revision = '0004_user_sessions'
down_revision = '0003_workspace_auth'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=512), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_user_records_email', 'user_records', ['email'], unique=False)
    op.add_column('workspace_records', sa.Column('owner_user_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_workspace_records_owner_user_id', 'workspace_records', 'user_records', ['owner_user_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_workspace_records_owner_user_id', 'workspace_records', ['owner_user_id'], unique=False)
    op.create_table(
        'session_records',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('workspace_id', sa.Uuid(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user_records.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspace_records.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash'),
    )
    op.create_index('ix_session_records_user_id', 'session_records', ['user_id'], unique=False)
    op.create_index('ix_session_records_workspace_id', 'session_records', ['workspace_id'], unique=False)
    op.create_index('ix_session_records_token_hash', 'session_records', ['token_hash'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_session_records_token_hash', table_name='session_records')
    op.drop_index('ix_session_records_workspace_id', table_name='session_records')
    op.drop_index('ix_session_records_user_id', table_name='session_records')
    op.drop_table('session_records')
    op.drop_index('ix_workspace_records_owner_user_id', table_name='workspace_records')
    op.drop_constraint('fk_workspace_records_owner_user_id', 'workspace_records', type_='foreignkey')
    op.drop_column('workspace_records', 'owner_user_id')
    op.drop_index('ix_user_records_email', table_name='user_records')
    op.drop_table('user_records')
