-- Migration: 002_enable_rls.sql
-- Enable Row Level Security (RLS) for multi-tenant data isolation
-- This migration ensures complete tenant data separation by preventing cross-tenant access

-- =============================================================================
-- STEP 1: Enable RLS on all tenant-scoped tables
-- =============================================================================

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Enable RLS on workspace_runs table
ALTER TABLE workspace_runs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_bundles table  
ALTER TABLE audit_bundles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on connectors table
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;

-- Enable RLS on consent_records table
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- Enable RLS on brand_twins table
ALTER TABLE brand_twins ENABLE ROW LEVEL SECURITY;

-- Enable RLS on decision_cards table
ALTER TABLE decision_cards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on simulation_results table
ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;

-- Enable RLS on asset_fingerprints table
ALTER TABLE asset_fingerprints ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: Create tenant isolation policies for each table
-- =============================================================================

-- Workspaces table - core tenant isolation
CREATE POLICY tenant_isolation_workspaces ON workspaces
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Workspace runs table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_workspace_runs ON workspace_runs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = workspace_runs.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Audit bundles table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_audit_bundles ON audit_bundles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = audit_bundles.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Connectors table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_connectors ON connectors
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = connectors.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Consent records table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_consent_records ON consent_records
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = consent_records.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Brand twins table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_brand_twins ON brand_twins
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = brand_twins.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Decision cards table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_decision_cards ON decision_cards
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = decision_cards.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Simulation results table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_simulation_results ON simulation_results
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = simulation_results.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- Asset fingerprints table - inherits from workspace tenant_id via FK
CREATE POLICY tenant_isolation_asset_fingerprints ON asset_fingerprints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.workspace_id = asset_fingerprints.workspace_id 
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );

-- =============================================================================
-- STEP 3: Create helper function for tenant context validation
-- =============================================================================

-- Function to validate tenant context is set
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure tenant context is always set for authenticated operations
    IF current_setting('app.current_tenant_id', true) IS NULL OR 
       current_setting('app.current_tenant_id', true) = '' THEN
        RAISE EXCEPTION 'Tenant context not set. All operations must specify tenant_id.';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 4: Create system user role for migrations and admin operations
-- =============================================================================

-- Create system role that can bypass RLS for admin operations
-- This is used for migrations, monitoring, and system maintenance
CREATE ROLE smm_system;
GRANT USAGE ON SCHEMA public TO smm_system;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smm_system;

-- System role can bypass RLS when needed
ALTER ROLE smm_system SET row_security = off;

-- =============================================================================
-- STEP 5: Create authenticated role for application connections
-- =============================================================================

-- Create authenticated role for normal application operations
-- This role must respect RLS policies
CREATE ROLE smm_authenticated;
GRANT USAGE ON SCHEMA public TO smm_authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smm_authenticated;

-- Authenticated role must always respect RLS
ALTER ROLE smm_authenticated SET row_security = on;

-- =============================================================================
-- STEP 6: Add indexes to optimize RLS policy performance
-- =============================================================================

-- Optimize tenant_id lookups on workspaces table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_id_optimized 
ON workspaces (tenant_id) WHERE tenant_id IS NOT NULL;

-- Optimize workspace_id foreign key lookups for RLS policies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_runs_workspace_fk 
ON workspace_runs (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_bundles_workspace_fk 
ON audit_bundles (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connectors_workspace_fk 
ON connectors (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_records_workspace_fk 
ON consent_records (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_twins_workspace_fk 
ON brand_twins (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decision_cards_workspace_fk 
ON decision_cards (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulation_results_workspace_fk 
ON simulation_results (workspace_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_fingerprints_workspace_fk 
ON asset_fingerprints (workspace_id);

-- =============================================================================
-- STEP 7: Create monitoring views for RLS policy compliance
-- =============================================================================

-- View to monitor RLS policy effectiveness
CREATE VIEW rls_policy_status AS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'workspaces', 'workspace_runs', 'audit_bundles', 'connectors', 
    'consent_records', 'brand_twins', 'decision_cards', 
    'simulation_results', 'asset_fingerprints'
);

-- View to audit tenant context usage
CREATE VIEW tenant_context_audit AS
SELECT 
    current_setting('app.current_tenant_id', true) as current_tenant,
    current_user as db_user,
    inet_client_addr() as client_ip,
    now() as access_time;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'workspaces', 'workspace_runs', 'audit_bundles', 'connectors',
    'consent_records', 'brand_twins', 'decision_cards', 
    'simulation_results', 'asset_fingerprints'
);

-- Verify all policies are created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test tenant isolation (should return 0 rows when tenant context not set)
-- SELECT count(*) FROM workspaces; -- Should fail without tenant context

COMMENT ON TABLE workspaces IS 'RLS enabled for tenant isolation';
COMMENT ON TABLE workspace_runs IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE audit_bundles IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE connectors IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE consent_records IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE brand_twins IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE decision_cards IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE simulation_results IS 'RLS enabled - inherits from workspace tenant_id';
COMMENT ON TABLE asset_fingerprints IS 'RLS enabled - inherits from workspace tenant_id';