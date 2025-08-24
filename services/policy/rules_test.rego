# OPA Policy Tests for SMM Architect
# Test cases covering various policy scenarios

package smm.policy

import future.keywords.if

# ============================================================================
# VOICE LIKENESS TESTS
# ============================================================================

test_voice_likeness_denied_without_consent if {
    deny[_] with input as {
        "workflow": {"uses_synthetic_voice": true},
        "workspace": {"consentRecords": []},
        "simulation": {"policyPassPct": 0.95}
    }
}

test_voice_likeness_allowed_with_valid_consent if {
    not deny[_] with input as voice_likeness_valid_input
    allow with input as voice_likeness_valid_input
}

voice_likeness_valid_input := {
    "workspace": {
        "consentRecords": [{
            "type": "voice_likeness",
            "expiresAt": "2026-12-31T23:59:59Z"
        }],
        "emergencyFlags": {"pauseAll": false},
        "lifecycle": "active"
    },
    "workflow": {"uses_synthetic_voice": true},
    "simulation": {
        "policyPassPct": 0.95,
        "citationCoverage": 0.95,
        "duplicationRisk": 0.05,
        "technicalReadiness": 0.9
    }
}

test_voice_likeness_denied_with_expired_consent if {
    deny[_] with input as {
        "workflow": {"uses_synthetic_voice": true},
        "workspace": {
            "consentRecords": [{
                "type": "voice_likeness",
                "expiresAt": "2020-01-01T00:00:00Z"  # Expired
            }]
        },
        "simulation": {"policyPassPct": 0.95}
    }
}

# ============================================================================
# CONNECTOR TESTS
# ============================================================================

test_connector_denied_with_unhealthy_connection if {
    deny[_] with input as {
        "action": {"role": "publisher"},
        "workflow": {"target_channels": ["linkedin"]},
        "workspace": {
            "connectors": [{
                "platform": "linkedin",
                "status": "degraded"
            }]
        },
        "simulation": {"policyPassPct": 0.95}
    }
}

test_connector_allowed_with_healthy_connection if {
    not deny[_] with input as connector_healthy_input
}

connector_healthy_input := {
    "workspace": {
        "connectors": [{
            "platform": "linkedin",
            "status": "connected",
            "lastConnectedAt": "2025-08-24T10:00:00Z"
        }],
        "emergencyFlags": {"pauseAll": false},
        "lifecycle": "active"
    },
    "workflow": {"target_channels": ["linkedin"]},
    "action": {"role": "publisher"},
    "simulation": {
        "policyPassPct": 0.95,
        "citationCoverage": 0.95,
        "duplicationRisk": 0.05,
        "technicalReadiness": 0.9
    }
}

test_connector_denied_with_missing_platform if {
    deny[_] with input as {
        "workflow": {"target_channels": ["instagram"]},
        "workspace": {
            "connectors": [{
                "platform": "linkedin",
                "status": "connected"
            }]
        },
        "simulation": {"policyPassPct": 0.95}
    }
}

# ============================================================================
# BUDGET TESTS
# ============================================================================

test_budget_denied_exceeds_hard_cap if {
    deny[_] with input as {
        "simulation": {"costEstimateUSD": 5000},
        "workspace": {
            "budget": {"hardCap": 4000}
        }
    }
}

test_budget_denied_exceeds_weekly_cap if {
    deny[_] with input as {
        "simulation": {"costEstimateUSD": 1500},
        "workspace": {
            "budget": {"weeklyCap": 1000, "hardCap": 4000}
        }
    }
}

test_budget_allowed_within_limits if {
    not deny[_] with input as budget_valid_input
}

budget_valid_input := {
    "workspace": {
        "budget": {
            "weeklyCap": 1000,
            "hardCap": 4000,
            "breakdown": {
                "paidAds": 600,
                "llmModelSpend": 200,
                "rendering": 150,
                "thirdPartyServices": 50
            }
        },
        "emergencyFlags": {"pauseAll": false},
        "lifecycle": "active"
    },
    "simulation": {
        "costEstimateUSD": 850,
        "policyPassPct": 0.95,
        "citationCoverage": 0.95,
        "duplicationRisk": 0.05,
        "technicalReadiness": 0.9
    }
}

test_budget_denied_breakdown_exceeds_weekly if {
    deny[_] with input as {
        "workspace": {
            "budget": {
                "weeklyCap": 1000,
                "breakdown": {
                    "paidAds": 800,
                    "llmModelSpend": 300,  # Total = 1100 > 1000
                    "rendering": 0,
                    "thirdPartyServices": 0
                }
            }
        },
        "simulation": {"costEstimateUSD": 500}
    }
}

# ============================================================================
# CONSENT TESTS
# ============================================================================

test_ugc_denied_without_consent if {
    deny[_] with input as {
        "workflow": {"uses_ugc_content": true},
        "workspace": {"consentRecords": []},
        "simulation": {"policyPassPct": 0.95}
    }
}

test_ugc_allowed_with_valid_consent if {
    not deny[_] with input as {
        "workflow": {"uses_ugc_content": true},
        "workspace": {
            "consentRecords": [{
                "type": "ugc_license",
                "expiresAt": "2026-12-31T23:59:59Z"
            }],
            "emergencyFlags": {"pauseAll": false},
            "lifecycle": "active"
        },
        "simulation": {
            "policyPassPct": 0.95,
            "citationCoverage": 0.95,
            "duplicationRisk": 0.05,
            "technicalReadiness": 0.9
        }
    }
}

test_celebrity_denied_without_consent if {
    deny[_] with input as {
        "workflow": {"uses_celebrity_likeness": true},
        "workspace": {"consentRecords": []},
        "simulation": {"policyPassPct": 0.95}
    }
}

# ============================================================================
# CONTENT POLICY TESTS
# ============================================================================

test_content_denied_low_citation_coverage if {
    deny[_] with input as {
        "simulation": {"citationCoverage": 0.8},  # Below 90% threshold
        "workspace": {"emergencyFlags": {"pauseAll": false}}
    }
}

test_content_denied_high_duplication_risk if {
    deny[_] with input as {
        "simulation": {"duplicationRisk": 0.25},  # Above 20% threshold
        "workspace": {"emergencyFlags": {"pauseAll": false}}
    }
}

test_content_denied_forbidden_topics if {
    deny[_] with input as {
        "workflow": {"content_topics": ["violence", "sports"]},
        "simulation": {"policyPassPct": 0.95}
    }
}

test_content_allowed_good_metrics if {
    not deny[_] with input as content_valid_input
}

content_valid_input := {
    "workspace": {
        "emergencyFlags": {"pauseAll": false},
        "lifecycle": "active"
    },
    "workflow": {"content_topics": ["technology", "business"]},
    "simulation": {
        "policyPassPct": 0.95,
        "citationCoverage": 0.95,
        "duplicationRisk": 0.05,
        "technicalReadiness": 0.9
    }
}

# ============================================================================
# TECHNICAL POLICY TESTS
# ============================================================================

test_technical_denied_low_readiness if {
    deny[_] with input as {
        "simulation": {"technicalReadiness": 0.7},  # Below 80% threshold
        "workspace": {"emergencyFlags": {"pauseAll": false}}
    }
}

test_technical_allowed_good_readiness if {
    not deny[_] with input as {
        "workspace": {
            "emergencyFlags": {"pauseAll": false},
            "lifecycle": "active"
        },
        "simulation": {
            "policyPassPct": 0.95,
            "citationCoverage": 0.95,
            "duplicationRisk": 0.05,
            "technicalReadiness": 0.9
        }
    }
}

# ============================================================================
# EMERGENCY CONTROL TESTS
# ============================================================================

test_emergency_pause_denies_all if {
    deny[_] with input as {
        "workspace": {
            "emergencyFlags": {
                "pauseAll": true,
                "reason": "Security incident"
            }
        },
        "simulation": {"policyPassPct": 1.0}  # Even perfect score denied
    }
}

test_lifecycle_draft_denies_action if {
    deny[_] with input as {
        "workspace": {"lifecycle": "draft"},
        "simulation": {"policyPassPct": 0.95}
    }
}

test_lifecycle_decommissioned_denies_action if {
    deny[_] with input as {
        "workspace": {"lifecycle": "decommissioned"},
        "simulation": {"policyPassPct": 0.95}
    }
}

test_lifecycle_active_allows_action if {
    not deny[_] with input as {
        "workspace": {
            "lifecycle": "active",
            "emergencyFlags": {"pauseAll": false}
        },
        "simulation": {
            "policyPassPct": 0.95,
            "citationCoverage": 0.95,
            "duplicationRisk": 0.05,
            "technicalReadiness": 0.9
        }
    }
}

# ============================================================================
# APPROVAL THRESHOLD TESTS
# ============================================================================

test_policy_pass_threshold_enterprise if {
    minimum_policy_pass_threshold == 0.95 with input as {
        "workspace": {"riskProfile": "enterprise"}
    }
}

test_policy_pass_threshold_high if {
    minimum_policy_pass_threshold == 0.9 with input as {
        "workspace": {"riskProfile": "high"}
    }
}

test_policy_pass_threshold_medium if {
    minimum_policy_pass_threshold == 0.85 with input as {
        "workspace": {"riskProfile": "medium"}
    }
}

test_policy_pass_threshold_low if {
    minimum_policy_pass_threshold == 0.8 with input as {
        "workspace": {"riskProfile": "low"}
    }
}

# ============================================================================
# AUTO-APPROVAL TESTS
# ============================================================================

test_auto_approve_eligible_good_conditions if {
    auto_approve_eligible with input as {
        "workspace": {
            "approvalPolicy": {
                "autoApproveReadinessThreshold": 0.85,
                "manualApprovalForPaid": false,
                "legalManualApproval": false
            }
        },
        "simulation": {"readinessScore": 0.9, "duplicationRisk": 0.05},
        "workflow": {"uses_synthetic_voice": false}
    }
}

test_auto_approve_denied_manual_approval_required if {
    not auto_approve_eligible with input as {
        "workspace": {
            "approvalPolicy": {
                "autoApproveReadinessThreshold": 0.85,
                "manualApprovalForPaid": true  # Manual approval required
            }
        },
        "simulation": {"readinessScore": 0.9}
    }
}

test_auto_approve_denied_legal_approval_required if {
    not auto_approve_eligible with input as {
        "workspace": {
            "approvalPolicy": {
                "autoApproveReadinessThreshold": 0.85,
                "manualApprovalForPaid": false,
                "legalManualApproval": true
            }
        },
        "simulation": {"readinessScore": 0.9},
        "workflow": {"uses_synthetic_voice": true}  # Triggers legal approval
    }
}

# ============================================================================
# INTEGRATION TEST - FULL VALID SCENARIO
# ============================================================================

test_full_valid_scenario_allows if {
    allow with input as full_valid_scenario
}

full_valid_scenario := {
    "workspace": {
        "lifecycle": "active",
        "riskProfile": "medium",
        "emergencyFlags": {"pauseAll": false},
        "budget": {
            "weeklyCap": 1000,
            "hardCap": 4000,
            "breakdown": {
                "paidAds": 600,
                "llmModelSpend": 200,
                "rendering": 150,
                "thirdPartyServices": 50
            }
        },
        "connectors": [{
            "platform": "linkedin",
            "status": "connected",
            "lastConnectedAt": "2025-08-24T10:00:00Z"
        }],
        "consentRecords": [{
            "type": "voice_likeness",
            "expiresAt": "2026-12-31T23:59:59Z"
        }],
        "approvalPolicy": {
            "autoApproveReadinessThreshold": 0.85,
            "manualApprovalForPaid": false,
            "legalManualApproval": false
        }
    },
    "workflow": {
        "target_channels": ["linkedin"],
        "uses_synthetic_voice": true,
        "content_topics": ["technology", "business"]
    },
    "action": {"role": "publisher"},
    "simulation": {
        "readinessScore": 0.92,
        "policyPassPct": 0.96,
        "citationCoverage": 0.94,
        "duplicationRisk": 0.06,
        "costEstimateUSD": 850,
        "technicalReadiness": 0.88
    }
}