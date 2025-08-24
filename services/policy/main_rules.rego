package smm

import rego.v1
import data.smm.consent
import data.smm.budget  
import data.smm.connector

# Main policy decision - all sub-policies must allow
allow if {
    consent.allow
    budget.allow
    connector.allow
    security.allow
    not has_critical_violations
}

# Aggregate all deny reasons from sub-policies
deny := all_denials if {
    consent_denials := consent.deny
    budget_denials := budget.deny
    connector_denials := connector.deny
    security_denials := security.deny
    critical_denials := critical_violations
    
    all_denials := consent_denials | budget_denials | connector_denials | security_denials | critical_denials
}

# Aggregate all warnings from sub-policies
warnings := all_warnings if {
    consent_warnings := consent.warnings
    budget_warnings := budget.warnings
    connector_warnings := connector.warnings
    security_warnings := security.warnings
    integration_warnings := integration_warnings_set
    
    all_warnings := consent_warnings | budget_warnings | connector_warnings | security_warnings | integration_warnings
}

# Aggregate all reasons from sub-policies
reasons := all_reasons if {
    consent_reasons := consent.reasons
    budget_reasons := budget.reasons
    connector_reasons := connector.reasons
    security_reasons := security.reasons
    integration_reasons := integration_reasons_set
    
    all_reasons := consent_reasons | budget_reasons | connector_reasons | security_reasons | integration_reasons
}

# Security policy module
security := {
    "allow": security_allow,
    "deny": security_denials,
    "warnings": security_warnings_set,
    "reasons": security_reasons_set
}

# Security policy decisions
security_allow if {
    not has_security_violations
}

has_security_violations if {
    count(security_violations) > 0
}

security_violations := violations if {
    violations := (data_classification_violations | 
                  public_confidential_data | 
                  unauthorized_data_access |
                  compliance_violations)
}

# Data classification violations
data_classification_violations contains "data_classification_violation" if {
    input.workspace.dataClassification == "confidential"
    some step in input.workflow
    step.type == "publish"
    step.config.publicVisibility == true
}

# Public confidential data violations
public_confidential_data contains "security_violation_public_confidential_data" if {
    input.workspace.securityLevel == "high"
    some step in input.workflow
    step.config.includeCustomerData == true
    step.config.publicVisibility == true
}

# Unauthorized data access
unauthorized_data_access contains "unauthorized_data_access" if {
    some step in input.workflow
    step.config.accessPersonalData == true
    not has_valid_data_access_consent
}

# Compliance violations (GDPR, CCPA, etc.)
compliance_violations contains violation if {
    some step in input.workflow
    step.type == "legal"
    required_compliance := step.config.compliance_checks
    some compliance_type in required_compliance
    not workspace_compliant_with(compliance_type)
    violation := sprintf("compliance_violation_%s", [compliance_type])
}

# Security warnings
security_warnings_set := warnings if {
    warnings := (elevated_permissions_warning | 
                sensitive_data_warning |
                external_integrations_warning)
}

elevated_permissions_warning contains "elevated_permissions_in_use" if {
    some step in input.workflow
    step.config.requiresElevatedPermissions == true
}

sensitive_data_warning contains "sensitive_data_processing" if {
    some step in input.workflow
    step.config.processesSensitiveData == true
}

external_integrations_warning contains "external_api_calls" if {
    some step in input.workflow
    step.config.callsExternalAPIs == true
    not step.config.apiCallsApproved == true
}

# Security reasons
security_reasons_set := reasons if {
    reasons := (security_clearance_validated | 
               data_handling_compliant |
               access_controls_verified)
}

security_clearance_validated contains "security_clearance_validated" if {
    input.workspace.securityLevel
    workspace_security_compliant
}

data_handling_compliant contains "data_handling_policies_followed" if {
    all step in input.workflow {
        not step.config.includeCustomerData
        or (step.config.includeCustomerData and step.config.dataHandlingApproved)
    }
}

access_controls_verified contains "access_controls_verified" if {
    all step in input.workflow {
        not step.config.accessPersonalData
        or has_valid_data_access_consent
    }
}

# Security denials
security_denials := security_violations

# Critical violations that override other policies
has_critical_violations if {
    count(critical_violations) > 0
}

critical_violations := violations if {
    violations := (regulatory_violations | 
                  legal_compliance_failures |
                  security_breach_risks)
}

regulatory_violations contains "regulatory_violation_gdpr" if {
    input.workspace.region == "EU"
    some step in input.workflow
    step.config.processesPII == true
    not has_gdpr_consent
}

legal_compliance_failures contains "legal_compliance_failure" if {
    some step in input.workflow
    step.type == "legal"
    step.config.requiresLegalReview == true
    not step.config.legalReviewCompleted == true
}

security_breach_risks contains "security_breach_risk" if {
    input.workspace.securityLevel == "critical"
    some step in input.workflow
    step.config.riskyOperation == true
    not step.config.securityApproved == true
}

# Integration warnings for cross-policy concerns
integration_warnings_set := warnings if {
    warnings := (policy_conflict_warnings | 
                performance_impact_warnings |
                cost_risk_warnings)
}

policy_conflict_warnings contains "consent_budget_conflict" if {
    consent.allow
    not budget.allow
    # High value consent that's expensive
    some step in input.workflow
    step.config.uses_synthetic_voice == true
    step.estimatedCost > 500
}

performance_impact_warnings contains "high_connector_load" if {
    required_channels := connector.get_required_channels
    count(required_channels) >= 4
    total_workflow_cost > 1000
}

cost_risk_warnings contains "cost_escalation_risk" if {
    budget.weekly_utilization > 0.8
    connector_degraded_count > 1
}

# Integration reasons
integration_reasons_set := reasons if {
    reasons := (policy_coordination_successful |
               risk_assessment_completed |
               compliance_verification_passed)
}

policy_coordination_successful contains "all_policies_aligned" if {
    consent.allow
    budget.allow
    connector.allow
    security.allow
}

risk_assessment_completed contains "comprehensive_risk_assessment" if {
    risk_score <= acceptable_risk_threshold
}

compliance_verification_passed contains "compliance_verification_complete" if {
    all_compliance_checks_passed
}

# Helper functions for security module

# Check if workspace has valid data access consent
has_valid_data_access_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "data_access"
    not consent_expired(consent)
}

# Check if workspace has GDPR consent
has_gdpr_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "gdpr_consent"
    not consent_expired(consent)
}

# Check if workspace is compliant with specific compliance framework
workspace_compliant_with(compliance_type) if {
    compliance_status := input.workspace.complianceStatus[compliance_type]
    compliance_status.status == "compliant"
    not compliance_status_expired(compliance_status)
}

# Check if workspace meets security requirements
workspace_security_compliant if {
    input.workspace.securityLevel
    security_controls := input.workspace.securityControls
    required_controls_implemented(security_controls)
}

# Check if required security controls are implemented
required_controls_implemented(controls) if {
    required := {"encryption", "access_logging", "audit_trail"}
    implemented := {control | some control in controls; control.enabled == true; control.name}
    count(required - implemented) == 0
}

# Consent expiration check (reused from consent module)
consent_expired(consent) if {
    current_time := time.parse_rfc3339_ns(input.timestamp)
    expiry_time := time.parse_rfc3339_ns(consent.expiresAt)
    current_time >= expiry_time
}

# Compliance status expiration check
compliance_status_expired(status) if {
    current_time := time.parse_rfc3339_ns(input.timestamp)
    expiry_time := time.parse_rfc3339_ns(status.expiresAt)
    current_time >= expiry_time
}

# Risk scoring
risk_score := score if {
    # Base risk factors
    consent_risk := 10; not consent.allow
    consent_risk := 0; consent.allow
    
    budget_risk := 5; budget.weekly_utilization > 0.9
    budget_risk := 0; budget.weekly_utilization <= 0.9
    
    connector_risk := 15; connector_degraded_count > 2
    connector_risk := 5; connector_degraded_count > 0; connector_degraded_count <= 2
    connector_risk := 0; connector_degraded_count == 0
    
    security_risk := 20; not security.allow
    security_risk := 0; security.allow
    
    complexity_risk := workflow_complexity * 2
    
    score := consent_risk + budget_risk + connector_risk + security_risk + complexity_risk
}

# Workflow complexity calculation
workflow_complexity := complexity if {
    base_complexity := count(input.workflow)
    
    # Add complexity for special features
    voice_complexity := count([step | some step in input.workflow; step.config.uses_synthetic_voice == true])
    ugc_complexity := count([step | some step in input.workflow; step.config.requires_ugc == true])
    integration_complexity := count([step | some step in input.workflow; step.config.callsExternalAPIs == true])
    
    complexity := base_complexity + voice_complexity + ugc_complexity + integration_complexity
}

# Count degraded connectors
connector_degraded_count := count([connector |
    some connector in input.workspace.connectors
    connector.healthStatus == "degraded"
])

# Risk thresholds
acceptable_risk_threshold := 25

# Compliance check aggregation
all_compliance_checks_passed if {
    required_frameworks := {"gdpr", "ccpa", "soc2"}
    all framework in required_frameworks {
        workspace_compliant_with(framework)
    }
}

# Policy evaluation metadata
evaluation_metadata := {
    "timestamp": input.timestamp,
    "policy_version": "v1.0.0",
    "evaluation_duration_ms": evaluation_duration,
    "policies_evaluated": ["consent", "budget", "connector", "security"],
    "risk_score": risk_score,
    "complexity_score": workflow_complexity,
    "overall_status": overall_policy_status
}

# Evaluation duration (placeholder - would be set by policy engine)
evaluation_duration := 150

# Overall policy status
overall_policy_status := status if {
    status := "approved"; allow
    status := "denied"; not allow
}

# Default values
default has_critical_violations := false
default has_security_violations := false
default risk_score := 0
default workflow_complexity := 0
default connector_degraded_count := 0
default acceptable_risk_threshold := 25
default all_compliance_checks_passed := false