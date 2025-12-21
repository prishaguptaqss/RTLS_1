"""Add organization scoping to entities, tags, and anchors

Revision ID: 004_org_scoping
Revises: 003_entities_orgs
Create Date: 2025-12-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_org_scoping'
down_revision = '003_entities_orgs'
branch_labels = None
depends_on = None


def upgrade():
    # Add organization_id to entities table
    op.add_column('entities',
        sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_entities_organization',
        'entities', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')

    # Add organization_id to tags table
    op.add_column('tags',
        sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_tags_organization',
        'tags', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')

    # Add organization_id to anchors table
    op.add_column('anchors',
        sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_anchors_organization',
        'anchors', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')

    # Add organization_id to buildings table (if not already present)
    # Check if column exists first
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('buildings')]

    if 'organization_id' not in columns:
        op.add_column('buildings',
            sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_buildings_organization',
            'buildings', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')

    # Create default organization if none exists
    op.execute("""
        INSERT INTO organizations (id, org_id, name, created_at)
        SELECT 1, 'default-org', 'Default Organization', NOW()
        WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE id = 1)
    """)

    # Migrate existing data to default organization
    op.execute("UPDATE entities SET organization_id = 1 WHERE organization_id IS NULL")
    op.execute("UPDATE tags SET organization_id = 1 WHERE organization_id IS NULL")
    op.execute("UPDATE anchors SET organization_id = 1 WHERE organization_id IS NULL")
    op.execute("UPDATE buildings SET organization_id = 1 WHERE organization_id IS NULL")

    # Make organization_id NOT NULL after data migration
    op.alter_column('entities', 'organization_id', nullable=False)
    op.alter_column('tags', 'organization_id', nullable=False)
    op.alter_column('anchors', 'organization_id', nullable=False)
    op.alter_column('buildings', 'organization_id', nullable=False)

    # Add indexes for performance
    op.create_index('idx_entities_org', 'entities', ['organization_id'])
    op.create_index('idx_tags_org', 'tags', ['organization_id'])
    op.create_index('idx_anchors_org', 'anchors', ['organization_id'])
    op.create_index('idx_buildings_org', 'buildings', ['organization_id'])

    # Update unique constraints to be scoped by organization
    # Drop old unique constraint on entity_id (if exists)
    try:
        op.drop_constraint('entities_entity_id_key', 'entities', type_='unique')
    except:
        pass

    # Create composite unique constraint: entity_id unique within organization
    op.create_unique_constraint('uq_entity_id_org', 'entities', ['entity_id', 'organization_id'])


def downgrade():
    # Remove unique constraint
    op.drop_constraint('uq_entity_id_org', 'entities', type_='unique')

    # Remove indexes
    op.drop_index('idx_entities_org', 'entities')
    op.drop_index('idx_tags_org', 'tags')
    op.drop_index('idx_anchors_org', 'anchors')
    op.drop_index('idx_buildings_org', 'buildings')

    # Remove foreign keys
    op.drop_constraint('fk_entities_organization', 'entities', type_='foreignkey')
    op.drop_constraint('fk_tags_organization', 'tags', type_='foreignkey')
    op.drop_constraint('fk_anchors_organization', 'anchors', type_='foreignkey')
    op.drop_constraint('fk_buildings_organization', 'buildings', type_='foreignkey')

    # Remove columns
    op.drop_column('entities', 'organization_id')
    op.drop_column('tags', 'organization_id')
    op.drop_column('anchors', 'organization_id')
    # Note: We don't drop organization_id from buildings as it might have been there before
