-- Migration: Create simulation_reports table for persisting Monte Carlo simulation results
-- This migration creates the table for storing deterministic simulation results with full reproducibility metadata

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

-- Add comments for documentation
COMMENT ON TABLE simulation_reports IS 'Stores Monte Carlo simulation results with full reproducibility metadata for campaign readiness assessment';
COMMENT ON COLUMN simulation_reports.random_seed IS 'Seed used for deterministic pseudo-random number generation';
COMMENT ON COLUMN simulation_reports.rng_algorithm IS 'Algorithm used for random number generation (e.g., seedrandom, mersenne-twister)';
COMMENT ON COLUMN simulation_reports.readiness_score IS 'Overall campaign readiness score (0-1)';
COMMENT ON COLUMN simulation_reports.confidence_bounds IS 'Statistical confidence intervals for readiness score';
COMMENT ON COLUMN simulation_reports.convergence_metadata IS 'Information about simulation convergence and stability';
COMMENT ON COLUMN simulation_reports.workspace_context IS 'Immutable snapshot of workspace state during simulation';
COMMENT ON COLUMN simulation_reports.workflow_manifest IS 'Complete workflow configuration used for simulation';