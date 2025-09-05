-- Migration: 005_enforce_tenant_rls.sql
-- Ensure RLS policies restrict rows by tenant_id

-- Workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_workspaces ON workspaces;
CREATE POLICY tenant_isolation_workspaces ON workspaces
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Workspace runs table
ALTER TABLE workspace_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_workspace_runs ON workspace_runs;
CREATE POLICY tenant_isolation_workspace_runs ON workspace_runs
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.workspace_id = workspace_runs.workspace_id
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.workspace_id = workspace_runs.workspace_id
            AND w.tenant_id = current_setting('app.current_tenant_id', true)
        )
    );
