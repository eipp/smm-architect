-- ===================================================================
-- RLS Performance Optimization Indexes
-- 
-- This migration adds composite indexes to optimize Row Level Security
-- policy performance and reduce N+1 query patterns in RLS policies.
-- ===================================================================

-- Add composite index for workspace tenant/ID lookups (used in all RLS policies)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_workspace 
ON workspaces(tenant_id, workspace_id)
WHERE tenant_id IS NOT NULL;

-- Add covering index for workspace lookups with commonly selected columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_covering
ON workspaces(tenant_id) 
INCLUDE (workspace_id, lifecycle, created_at)
WHERE tenant_id IS NOT NULL;

-- Optimize connectors RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connectors_workspace
ON connectors(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize consent_records RLS policy lookups  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_records_workspace
ON consent_records(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize brand_twins RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_twins_workspace
ON brand_twins(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize decision_cards RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_decision_cards_workspace
ON decision_cards(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize simulation_results RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulation_results_workspace
ON simulation_results(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize asset_fingerprints RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_fingerprints_workspace
ON asset_fingerprints(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize workspace_runs RLS policy lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_runs_workspace
ON workspace_runs(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Optimize audit_bundles RLS policy lookups  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_bundles_workspace
ON audit_bundles(workspace_id)
WHERE workspace_id IS NOT NULL;

-- Add indexes for simulation_reports table (from migration 003)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulation_reports_tenant
ON simulation_reports(tenant_id)
WHERE tenant_id IS NOT NULL;

-- Add indexes for agent_runs table (from migration 003)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_runs_tenant
ON agent_runs(tenant_id)
WHERE tenant_id IS NOT NULL;

-- Optimize queries that filter by created_at (common in time-based queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_tenant_created
ON workspaces(tenant_id, created_at DESC)
WHERE tenant_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_runs_workspace_created
ON workspace_runs(workspace_id, created_at DESC)
WHERE workspace_id IS NOT NULL;

-- Add partial indexes for active/non-deleted records to improve query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspaces_active_tenant
ON workspaces(tenant_id, lifecycle)
WHERE tenant_id IS NOT NULL AND lifecycle != 'deleted';

-- ===================================================================
-- Query Performance Analysis
-- ===================================================================

-- Create view to analyze RLS policy performance
CREATE OR REPLACE VIEW rls_performance_analysis AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    ROUND((idx_tup_fetch::numeric / NULLIF(idx_tup_read, 0)) * 100, 2) as selectivity_pct
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'workspaces', 'workspace_runs', 'audit_bundles', 'connectors',
    'consent_records', 'brand_twins', 'decision_cards', 
    'simulation_results', 'asset_fingerprints', 'simulation_reports', 
    'agent_runs'
)
ORDER BY idx_scan DESC, selectivity_pct DESC;

-- ===================================================================
-- Index Maintenance and Monitoring
-- ===================================================================

-- Function to check index usage and recommend optimization
CREATE OR REPLACE FUNCTION check_rls_index_usage()
RETURNS TABLE(
    table_name text,
    index_name text,
    scans bigint,
    tuples_read bigint,
    usage_recommendation text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.tablename::text,
        i.indexname::text,
        i.idx_scan,
        i.idx_tup_read,
        CASE 
            WHEN i.idx_scan = 0 THEN 'UNUSED - Consider dropping'
            WHEN i.idx_scan < 100 THEN 'LOW USAGE - Monitor'
            WHEN i.idx_scan > 10000 THEN 'HIGH USAGE - Critical for performance'
            ELSE 'MODERATE USAGE - Keep'
        END::text
    FROM pg_stat_user_indexes i
    WHERE i.schemaname = 'public'
    AND i.tablename IN (
        'workspaces', 'workspace_runs', 'audit_bundles', 'connectors',
        'consent_records', 'brand_twins', 'decision_cards', 
        'simulation_results', 'asset_fingerprints', 'simulation_reports', 
        'agent_runs'
    )
    ORDER BY i.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- Comments for documentation
-- ===================================================================

COMMENT ON INDEX idx_workspaces_tenant_workspace IS 'Composite index for RLS policy performance - tenant_id + workspace_id lookups';
COMMENT ON INDEX idx_workspaces_tenant_covering IS 'Covering index for workspace queries - includes commonly selected columns';
COMMENT ON INDEX idx_connectors_workspace IS 'Optimize connectors RLS policy performance';
COMMENT ON INDEX idx_consent_records_workspace IS 'Optimize consent_records RLS policy performance';
COMMENT ON INDEX idx_brand_twins_workspace IS 'Optimize brand_twins RLS policy performance';
COMMENT ON INDEX idx_decision_cards_workspace IS 'Optimize decision_cards RLS policy performance';
COMMENT ON INDEX idx_simulation_results_workspace IS 'Optimize simulation_results RLS policy performance';
COMMENT ON INDEX idx_asset_fingerprints_workspace IS 'Optimize asset_fingerprints RLS policy performance';

-- Add comments about index strategy
COMMENT ON FUNCTION check_rls_index_usage() IS 'Analyzes RLS-related index usage and provides optimization recommendations';
COMMENT ON VIEW rls_performance_analysis IS 'Real-time view of RLS policy index performance metrics';

-- ===================================================================
-- Verification queries (for DBA use)
-- ===================================================================

-- Check that all indexes were created successfully
-- SELECT schemaname, tablename, indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%_workspace%' OR indexname LIKE 'idx_%_tenant%';

-- Monitor index sizes  
-- SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY pg_relation_size(indexrelid) DESC;