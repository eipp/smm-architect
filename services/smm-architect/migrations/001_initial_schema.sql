-- Migration: 001_initial_schema.sql
-- Create initial tables for SMM Architect workspace management

-- Workspaces table
CREATE TABLE workspaces (
    workspace_id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lifecycle VARCHAR(50) NOT NULL DEFAULT 'draft',
    contract_version VARCHAR(50) NOT NULL,
    goals JSONB NOT NULL,
    primary_channels JSONB NOT NULL,
    budget JSONB NOT NULL,
    approval_policy JSONB NOT NULL,
    risk_profile VARCHAR(50) NOT NULL,
    data_retention JSONB NOT NULL,
    ttl_hours INTEGER NOT NULL,
    policy_bundle_ref VARCHAR(255) NOT NULL,
    policy_bundle_checksum VARCHAR(64) NOT NULL,
    contract_data JSONB NOT NULL,
    
    INDEX idx_workspace_tenant (tenant_id),
    INDEX idx_workspace_lifecycle (lifecycle),
    INDEX idx_workspace_created (created_at),
    INDEX idx_workspace_ttl (created_at, ttl_hours)
);

-- Workspace runs table for tracking execution history
CREATE TABLE workspace_runs (
    run_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP NULL,
    cost_usd DECIMAL(10,2) NULL,
    readiness_score DECIMAL(3,2) NULL,
    results JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_run_workspace (workspace_id),
    INDEX idx_run_status (status),
    INDEX idx_run_started (started_at)
);

-- Audit bundles table for compliance tracking
CREATE TABLE audit_bundles (
    bundle_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    bundle_data JSONB NOT NULL,
    signature_key_id VARCHAR(255) NOT NULL,
    signature VARCHAR(1024) NOT NULL,
    signed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_bundle_workspace (workspace_id),
    INDEX idx_bundle_signed (signed_at)
);

-- Connectors table for platform integrations
CREATE TABLE connectors (
    connector_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unconnected',
    scopes JSONB NULL,
    last_connected_at TIMESTAMP NULL,
    owner_contact VARCHAR(255) NULL,
    credentials_ref VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_connector_workspace (workspace_id),
    INDEX idx_connector_platform (platform),
    INDEX idx_connector_status (status),
    UNIQUE INDEX idx_workspace_platform (workspace_id, platform, account_id)
);

-- Consent records table for legal compliance
CREATE TABLE consent_records (
    consent_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    consent_type VARCHAR(50) NOT NULL,
    granted_by VARCHAR(255) NOT NULL,
    granted_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    document_ref VARCHAR(500) NULL,
    verifier_signature VARCHAR(1024) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_consent_workspace (workspace_id),
    INDEX idx_consent_type (consent_type),
    INDEX idx_consent_expires (expires_at),
    INDEX idx_consent_granted_by (granted_by)
);

-- Brand twins table for research agent outputs
CREATE TABLE brand_twins (
    brand_id VARCHAR(255) NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    snapshot_at TIMESTAMP NOT NULL,
    brand_data JSONB NOT NULL,
    quality_score DECIMAL(3,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (brand_id, snapshot_at),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_brand_workspace (workspace_id),
    INDEX idx_brand_snapshot (snapshot_at),
    INDEX idx_brand_quality (quality_score)
);

-- Decision cards table for approval workflows
CREATE TABLE decision_cards (
    action_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    one_line TEXT NOT NULL,
    readiness_score DECIMAL(3,2) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by VARCHAR(255) NULL,
    approved_at TIMESTAMP NULL,
    card_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_decision_workspace (workspace_id),
    INDEX idx_decision_status (status),
    INDEX idx_decision_expires (expires_at),
    INDEX idx_decision_readiness (readiness_score)
);

-- Simulation results table
CREATE TABLE simulation_results (
    simulation_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    readiness_score DECIMAL(3,2) NOT NULL,
    policy_pass_pct DECIMAL(3,2) NOT NULL,
    citation_coverage DECIMAL(3,2) NOT NULL,
    duplication_risk DECIMAL(3,2) NOT NULL,
    cost_estimate_usd DECIMAL(10,2) NOT NULL,
    traces JSONB NULL,
    simulation_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_simulation_workspace (workspace_id),
    INDEX idx_simulation_score (readiness_score),
    INDEX idx_simulation_created (created_at)
);

-- Asset fingerprints table for content tracking
CREATE TABLE asset_fingerprints (
    asset_id VARCHAR(255) PRIMARY KEY,
    workspace_id VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    fingerprint VARCHAR(64) NOT NULL,
    license VARCHAR(50) NOT NULL,
    url VARCHAR(1000) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    INDEX idx_asset_workspace (workspace_id),
    INDEX idx_asset_type (asset_type),
    INDEX idx_asset_fingerprint (fingerprint)
);

-- Update triggers for updated_at timestamps
CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_connectors_updated_at 
    BEFORE UPDATE ON connectors 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';