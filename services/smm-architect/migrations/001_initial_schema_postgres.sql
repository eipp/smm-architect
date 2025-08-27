-- Migration: 001_initial_schema.sql (PostgreSQL version)
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
    contract_data JSONB NOT NULL
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
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
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(workspace_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_workspace_tenant ON workspaces (tenant_id);
CREATE INDEX idx_workspace_lifecycle ON workspaces (lifecycle);
CREATE INDEX idx_workspace_created ON workspaces (created_at);
CREATE INDEX idx_workspace_ttl ON workspaces (created_at, ttl_hours);

CREATE INDEX idx_run_workspace ON workspace_runs (workspace_id);
CREATE INDEX idx_run_status ON workspace_runs (status);
CREATE INDEX idx_run_started ON workspace_runs (started_at);

CREATE INDEX idx_bundle_workspace ON audit_bundles (workspace_id);
CREATE INDEX idx_bundle_signed ON audit_bundles (signed_at);

CREATE INDEX idx_connector_workspace ON connectors (workspace_id);
CREATE INDEX idx_connector_platform ON connectors (platform);
CREATE INDEX idx_connector_status ON connectors (status);
CREATE UNIQUE INDEX idx_workspace_platform ON connectors (workspace_id, platform, account_id);

CREATE INDEX idx_consent_workspace ON consent_records (workspace_id);
CREATE INDEX idx_consent_type ON consent_records (consent_type);
CREATE INDEX idx_consent_expires ON consent_records (expires_at);
CREATE INDEX idx_consent_granted_by ON consent_records (granted_by);

CREATE INDEX idx_brand_workspace ON brand_twins (workspace_id);
CREATE INDEX idx_brand_snapshot ON brand_twins (snapshot_at);
CREATE INDEX idx_brand_quality ON brand_twins (quality_score);

CREATE INDEX idx_decision_workspace ON decision_cards (workspace_id);
CREATE INDEX idx_decision_status ON decision_cards (status);
CREATE INDEX idx_decision_expires ON decision_cards (expires_at);
CREATE INDEX idx_decision_readiness ON decision_cards (readiness_score);

CREATE INDEX idx_simulation_workspace ON simulation_results (workspace_id);
CREATE INDEX idx_simulation_score ON simulation_results (readiness_score);
CREATE INDEX idx_simulation_created ON simulation_results (created_at);

CREATE INDEX idx_asset_workspace ON asset_fingerprints (workspace_id);
CREATE INDEX idx_asset_type ON asset_fingerprints (asset_type);
CREATE INDEX idx_asset_fingerprint ON asset_fingerprints (fingerprint);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update triggers for updated_at timestamps
CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_connectors_updated_at 
    BEFORE UPDATE ON connectors 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();