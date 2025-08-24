# SMM Architect Policy Rules
# Open Policy Agent (OPA) rules for workspace governance

package smm.policy

import future.keywords.if
import future.keywords.in

# Default deny all actions unless explicitly allowed
default allow := false

# Main authorization decision
allow if {
    not deny[_]
    all_required_policies_pass
}

# Collect all denial reasons
deny[msg] if {
    voice_likeness_violation[msg]
}

deny[msg] if {
    connector_violation[msg]
}

deny[msg] if {
    budget_violation[msg]
}

deny[msg] if {
    consent_violation[msg]
}

deny[msg] if {
    content_policy_violation[msg]
}

deny[msg] if {
    technical_violation[msg]
}

# ============================================================================
# VOICE LIKENESS POLICIES
# ============================================================================

voice_likeness_violation[msg] if {
    input.workflow.uses_synthetic_voice
    not has_valid_voice_consent
    msg := "Synthetic voice requires valid voice likeness consent"
}

has_valid_voice_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
    not consent_expired(consent)
}

# ============================================================================
# CONNECTOR POLICIES
# ============================================================================

connector_violation[msg] if {
    some channel in input.workflow.target_channels
    not has_healthy_connector(channel)
    msg := sprintf("No healthy connector for channel: %s", [channel])
}

connector_violation[msg] if {
    input.action.role == "publisher"
    some channel in input.workflow.target_channels
    connector := input.workspace.connectors[_]
    connector.platform == channel
    connector.status != "connected"
    msg := sprintf("Connector for %s is %s, cannot publish", [channel, connector.status])
}

has_healthy_connector(channel) if {
    some connector in input.workspace.connectors
    connector.platform == channel
    connector.status == "connected"
    not connector_expired(connector)
}

connector_expired(connector) if {
    last_connected := time.parse_rfc3339_ns(connector.lastConnectedAt)
    now := time.now_ns()
    # Consider stale if no connection in 7 days
    (now - last_connected) > (7 * 24 * 60 * 60 * 1000000000)
}

# ============================================================================
# BUDGET POLICIES
# ============================================================================

budget_violation[msg] if {
    input.simulation.costEstimateUSD > input.workspace.budget.hardCap
    msg := sprintf("Estimated cost $%.2f exceeds hard cap $%.2f", 
        [input.simulation.costEstimateUSD, input.workspace.budget.hardCap])
}

budget_violation[msg] if {
    input.simulation.costEstimateUSD > input.workspace.budget.weeklyCap
    msg := sprintf("Estimated cost $%.2f exceeds weekly cap $%.2f", 
        [input.simulation.costEstimateUSD, input.workspace.budget.weeklyCap])
}

budget_violation[msg] if {
    breakdown := input.workspace.budget.breakdown
    total_breakdown := breakdown.paidAds + breakdown.llmModelSpend + 
                      breakdown.rendering + breakdown.thirdPartyServices
    total_breakdown > input.workspace.budget.weeklyCap
    msg := sprintf("Budget breakdown total $%.2f exceeds weekly cap $%.2f", 
        [total_breakdown, input.workspace.budget.weeklyCap])
}

# ============================================================================
# CONSENT POLICIES
# ============================================================================

consent_violation[msg] if {
    input.workflow.uses_ugc_content
    not has_valid_ugc_consent
    msg := "User-generated content requires valid UGC license consent"
}

consent_violation[msg] if {
    input.workflow.uses_celebrity_likeness
    not has_valid_celebrity_consent
    msg := "Celebrity likeness requires valid celebrity release consent"
}

has_valid_ugc_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "ugc_license"
    not consent_expired(consent)
}

has_valid_celebrity_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "celebrity_release"
    not consent_expired(consent)
}

consent_expired(consent) if {
    expires := time.parse_rfc3339_ns(consent.expiresAt)
    expires < time.now_ns()
}

# ============================================================================
# CONTENT POLICY
# ============================================================================

content_policy_violation[msg] if {
    input.simulation.citationCoverage < 0.9
    msg := sprintf("Citation coverage %.2f%% below required 90%%", 
        [input.simulation.citationCoverage * 100])
}

content_policy_violation[msg] if {
    input.simulation.duplicationRisk > 0.2
    msg := sprintf("Duplication risk %.2f%% exceeds maximum 20%%", 
        [input.simulation.duplicationRisk * 100])
}

content_policy_violation[msg] if {
    contains_forbidden_content
    msg := "Content contains forbidden topics or language"
}

contains_forbidden_content if {
    some topic in input.workflow.content_topics
    topic in forbidden_topics
}

forbidden_topics := [
    "violence",
    "hate_speech", 
    "misinformation",
    "adult_content",
    "gambling",
    "illegal_substances"
]

# ============================================================================
# TECHNICAL POLICIES
# ============================================================================

technical_violation[msg] if {
    input.simulation.technicalReadiness < 0.8
    msg := sprintf("Technical readiness %.2f%% below required 80%%", 
        [input.simulation.technicalReadiness * 100])
}

technical_violation[msg] if {
    input.workflow.estimated_posts_per_hour > rate_limit_for_channel(channel)
    msg := sprintf("Post rate exceeds platform limits for %s", [channel])
}

rate_limit_for_channel(channel) = limit if {
    limits := {
        "linkedin": 5,  # posts per hour
        "x": 300,       # posts per hour (higher for X)
        "instagram": 10,
        "facebook": 25,
        "youtube": 5,
        "tiktok": 10
    }
    limit := limits[channel]
}

# ============================================================================
# EMERGENCY CONTROLS
# ============================================================================

deny[msg] if {
    input.workspace.emergencyFlags.pauseAll
    msg := sprintf("Workspace paused: %s", [input.workspace.emergencyFlags.reason])
}

deny[msg] if {
    workspace_lifecycle_blocks_action
    msg := sprintf("Workspace lifecycle '%s' does not allow this action", 
        [input.workspace.lifecycle])
}

workspace_lifecycle_blocks_action if {
    input.workspace.lifecycle in ["draft", "decommissioned", "paused"]
}

# ============================================================================
# READINESS AND APPROVAL THRESHOLDS
# ============================================================================

all_required_policies_pass if {
    input.simulation.policyPassPct >= minimum_policy_pass_threshold
}

minimum_policy_pass_threshold := 0.95 if {
    input.workspace.riskProfile == "enterprise"
} else := 0.9 if {
    input.workspace.riskProfile == "high"
} else := 0.85 if {
    input.workspace.riskProfile == "medium"
} else := 0.8

# Auto-approval eligibility
auto_approve_eligible if {
    input.simulation.readinessScore >= input.workspace.approvalPolicy.autoApproveReadinessThreshold
    not input.workspace.approvalPolicy.manualApprovalForPaid
    not requires_legal_approval
    not high_risk_content
}

requires_legal_approval if {
    input.workspace.approvalPolicy.legalManualApproval
    (
        input.workflow.uses_synthetic_voice or
        input.workflow.uses_celebrity_likeness or
        input.workflow.contains_legal_claims
    )
}

high_risk_content if {
    input.simulation.duplicationRisk > 0.15
    input.simulation.costEstimateUSD > (input.workspace.budget.weeklyCap * 0.8)
}

# ============================================================================
# POLICY METADATA AND VERSIONING
# ============================================================================

policy_info := {
    "version": "1.0.0",
    "lastUpdated": "2025-08-24T10:00:00Z",
    "description": "SMM Architect governance policies for autonomous marketing",
    "rules": {
        "voice_likeness": "Require consent for synthetic voice",
        "connectors": "Require healthy platform connections",
        "budget": "Enforce spending limits and caps",
        "content": "Ensure citation coverage and prevent duplication",
        "technical": "Validate technical readiness and rate limits",
        "emergency": "Honor emergency controls and lifecycle states"
    }
}

# Helper functions for time calculations
time_diff_hours(time1, time2) := diff if {
    t1 := time.parse_rfc3339_ns(time1)
    t2 := time.parse_rfc3339_ns(time2)
    diff := (t2 - t1) / (60 * 60 * 1000000000)  # Convert to hours
}

# Utility function to check if workspace TTL has expired
workspace_expired if {
    created := time.parse_rfc3339_ns(input.workspace.createdAt)
    ttl_ns := input.workspace.ttlHours * 60 * 60 * 1000000000
    (time.now_ns() - created) > ttl_ns
}