-- Migration: Create simulation_reports table for persisting Monte Carlo simulation results
-- This migration creates the table for storing deterministic simulation results with full reproducibility metadata

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE simulation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id VARCHAR(255) UNIQUE NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    
    -- Simulation configuration for reproducibility
    iterations INTEGER NOT NULL,
    random_seed INTEGER NOT NULL,
    rng_algorithm VARCHAR(50) NOT NULL DEFAULT 'seedrandom',
    rng_library_version VARCHAR(20) NOT NULL,
    nodejs_version VARCHAR(20) NOT NULL,
    engine_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- Core simulation results
    readiness_score DECIMAL(5,4) NOT NULL CHECK (readiness_score >= 0 AND readiness_score <= 1),
    policy_pass_pct DECIMAL(5,4) NOT NULL CHECK (policy_pass_pct >= 0 AND policy_pass_pct <= 1),
    citation_coverage DECIMAL(5,4) NOT NULL CHECK (citation_coverage >= 0 AND citation_coverage <= 1),
    duplication_risk DECIMAL(5,4) NOT NULL CHECK (duplication_risk >= 0 AND duplication_risk <= 1),
    cost_estimate_usd DECIMAL(10,2) NOT NULL CHECK (cost_estimate_usd >= 0),
    technical_readiness DECIMAL(5,4) NOT NULL CHECK (technical_readiness >= 0 AND technical_readiness <= 1),
    
    -- Statistical metadata
    confidence_bounds JSONB, -- {lower, upper, level}
    percentiles JSONB, -- p5, p25, p50, p75, p95 for all metrics
    convergence_metadata JSONB, -- {converged, requiredIterations, stabilityThreshold}
    
    -- Execution metadata
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    
    -- Simulation input context (for reproducibility)
    workspace_context JSONB NOT NULL, -- Snapshot of workspace state at simulation time
    workflow_manifest JSONB NOT NULL, -- Workflow configuration used
    simulation_config JSONB NOT NULL, -- Full simulation configuration
    
    -- Simulation traces and debugging
    traces JSONB, -- Detailed execution traces
    error_log JSONB, -- Any errors or warnings during simulation
    
    -- Audit and lineage
    created_by VARCHAR(255) NOT NULL, -- Service or user that triggered simulation
    correlation_id VARCHAR(255), -- For tracing across services
    parent_simulation_id VARCHAR(255), -- For simulation chains/comparisons
    tags JSONB, -- For categorization and filtering
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_runs table for tracking agent execution with model usage
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    agent_version VARCHAR(50) NOT NULL,
    
    -- Execution status and timing
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Input and output data
    input_data JSONB NOT NULL,
    output_data JSONB,
    error_message TEXT,
    
    -- Model usage tracking for cost attribution
    model_usage JSONB, -- {modelId, promptHash, totalTokens, costEstimateUsd, timestamp}
    
    -- Agent execution metadata
    execution_context JSONB, -- Environment, resources, configuration
    vault_token_ref VARCHAR(255), -- Reference to Vault token used
    execution_node VARCHAR(255), -- Node/container where agent ran
    
    -- Quality and performance metrics
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    output_confidence DECIMAL(3,2) CHECK (output_confidence >= 0 AND output_confidence <= 1),
    tools_used JSONB, -- List of tools/services called during execution
    
    -- Audit and compliance
    created_by VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(255),
    parent_job_id VARCHAR(255), -- For job chains
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_simulation_reports_workspace_id ON simulation_reports (workspace_id);
CREATE INDEX idx_simulation_reports_tenant_id ON simulation_reports (tenant_id);
CREATE INDEX idx_simulation_reports_created_at ON simulation_reports (created_at);
CREATE INDEX idx_simulation_reports_readiness_score ON simulation_reports (readiness_score);
CREATE INDEX idx_simulation_reports_seed ON simulation_reports (random_seed);
CREATE INDEX idx_simulation_reports_correlation_id ON simulation_reports (correlation_id) WHERE correlation_id IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_simulation_reports_workspace_created ON simulation_reports (workspace_id, created_at DESC);
CREATE INDEX idx_simulation_reports_baseline_lookup ON simulation_reports (workspace_id, random_seed, engine_version);

-- Agent runs indexes for performance
CREATE INDEX idx_agent_runs_workspace_id ON agent_runs (workspace_id);
CREATE INDEX idx_agent_runs_tenant_id ON agent_runs (tenant_id);
CREATE INDEX idx_agent_runs_created_at ON agent_runs (created_at);
CREATE INDEX idx_agent_runs_status ON agent_runs (status);
CREATE INDEX idx_agent_runs_agent_type ON agent_runs (agent_type);
CREATE INDEX idx_agent_runs_correlation_id ON agent_runs (correlation_id) WHERE correlation_id IS NOT NULL;

-- Composite indexes for tenant filtering (RLS performance)
CREATE INDEX idx_agent_runs_tenant_created ON agent_runs (tenant_id, created_at DESC);
CREATE INDEX idx_simulation_reports_tenant_created ON simulation_reports (tenant_id, created_at DESC);

-- Partial indexes for common filters
CREATE INDEX idx_agent_runs_active ON agent_runs (tenant_id, workspace_id) WHERE status IN ('pending', 'running');
CREATE INDEX idx_simulation_reports_recent ON simulation_reports (tenant_id, workspace_id, created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- Foreign key constraints (add after data if needed)
ALTER TABLE agent_runs ADD CONSTRAINT fk_agent_runs_workspace 
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

-- Optional: Link agent runs to simulation reports if desired
-- ALTER TABLE agent_runs ADD COLUMN simulation_report_id UUID;
-- ALTER TABLE agent_runs ADD CONSTRAINT fk_agent_runs_simulation 
--     FOREIGN KEY (simulation_report_id) REFERENCES simulation_reports(id) ON DELETE SET NULL;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_simulation_reports_updated_at 
    BEFORE UPDATE ON simulation_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at 
    BEFORE UPDATE ON agent_runs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 2: Enable Row Level Security (RLS) for multi-tenant data isolation
-- =============================================================================

-- Enable RLS on simulation_reports table
ALTER TABLE simulation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_reports FORCE ROW LEVEL SECURITY;

-- Enable RLS on agent_runs table
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 3: Create tenant isolation policies for each table
-- =============================================================================

-- Simulation reports table - direct tenant isolation
CREATE POLICY tenant_isolation_simulation_reports ON simulation_reports
    FOR ALL TO smm_authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Agent runs table - direct tenant isolation
CREATE POLICY tenant_isolation_agent_runs ON agent_runs
    FOR ALL TO smm_authenticated
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- =============================================================================
-- STEP 4: Add indexes to optimize RLS policy performance
-- =============================================================================

-- Optimize tenant_id lookups on simulation_reports table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_simulation_reports_tenant_id_rls 
ON simulation_reports (tenant_id) WHERE tenant_id IS NOT NULL;

-- Optimize tenant_id lookups on agent_runs table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_runs_tenant_id_rls 
ON agent_runs (tenant_id) WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- STEP 5: Verify RLS configuration
-- =============================================================================

-- Verify tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('simulation_reports', 'agent_runs');

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('simulation_reports', 'agent_runs')
ORDER BY tablename, policyname;

-- Add comments for documentation
COMMENT ON TABLE simulation_reports IS 'Stores Monte Carlo simulation results with full reproducibility metadata for campaign readiness assessment - RLS enabled for tenant isolation';
COMMENT ON TABLE agent_runs IS 'Tracks agent execution with model usage and quality metrics - RLS enabled for tenant isolation';
COMMENT ON COLUMN simulation_reports.random_seed IS 'Seed used for deterministic pseudo-random number generation';
COMMENT ON COLUMN simulation_reports.rng_algorithm IS 'Algorithm used for random number generation (e.g., seedrandom, mersenne-twister)';
COMMENT ON COLUMN simulation_reports.readiness_score IS 'Overall campaign readiness score (0-1)';
COMMENT ON COLUMN simulation_reports.confidence_bounds IS 'Statistical confidence intervals for readiness score';
COMMENT ON COLUMN simulation_reports.convergence_metadata IS 'Information about simulation convergence and stability';
COMMENT ON COLUMN simulation_reports.workspace_context IS 'Immutable snapshot of workspace state during simulation';
COMMENT ON COLUMN simulation_reports.workflow_manifest IS 'Complete workflow configuration used for simulation';