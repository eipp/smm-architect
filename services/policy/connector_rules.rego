package smm.connector

import rego.v1

# Main connector policy decision
allow if {
    not has_connector_violations
}

# Collect all connector violations
deny contains reason if {
    some reason in connector_violations
}

# Collect connector warnings
warnings contains warning if {
    some warning in connector_warnings
}

# Reasons for policy decisions
reasons contains reason if {
    some reason in connector_reasons
}

# Check for any connector violations
has_connector_violations if {
    count(connector_violations) > 0
}

# All connector violations
connector_violations := violations if {
    violations := (missing_connectors | revoked_connectors | 
                  unhealthy_connectors | authentication_failures)
}

# Missing required connectors
missing_connectors := missing if {
    required_channels := get_required_channels
    available_channels := get_available_channels
    missing := required_channels - available_channels
    count(missing) > 0
    missing = {sprintf("missing_connector_%s", [channel]) | some channel in missing}
}

# Revoked connector access
revoked_connectors := revoked if {
    revoked_platforms := {platform | 
        some connector in input.workspace.connectors
        connector.status == "revoked"
        platform := connector.platform
    }
    required_channels := get_required_channels
    revoked_required := revoked_platforms & required_channels
    count(revoked_required) > 0
    revoked := {sprintf("connector_revoked_%s", [platform]) | some platform in revoked_required}
}

# Unhealthy required connectors (hard failure)
unhealthy_connectors := unhealthy if {
    unhealthy_platforms := {platform |
        some connector in input.workspace.connectors
        connector.healthStatus == "unhealthy"
        connector.status != "revoked"  # Don't double-report revoked connectors
        platform := connector.platform
    }
    required_channels := get_required_channels
    unhealthy_required := unhealthy_platforms & required_channels
    count(unhealthy_required) > 0
    # Only deny if no fallback is available
    not can_use_fallbacks_for_unhealthy(unhealthy_required)
    unhealthy := {sprintf("connector_unhealthy_%s", [platform]) | some platform in unhealthy_required}
}

# Authentication failures
authentication_failures := auth_failures if {
    auth_failed_platforms := {platform |
        some connector in input.workspace.connectors
        connector.authStatus == "failed"
        platform := connector.platform
    }
    required_channels := get_required_channels
    auth_failed_required := auth_failed_platforms & required_channels
    count(auth_failed_required) > 0
    auth_failures := {sprintf("auth_failed_%s", [platform]) | some platform in auth_failed_required}
}

# Connector warnings
connector_warnings := warnings if {
    warnings := (degraded_connectors | stale_health_checks | 
                fallback_usage | rate_limited_connectors |
                expiring_tokens)
}

# Degraded connectors (performance issues but functional)
degraded_connectors := degraded if {
    degraded_platforms := {platform |
        some connector in input.workspace.connectors
        connector.healthStatus == "degraded"
        platform := connector.platform
    }
    required_channels := get_required_channels
    degraded_required := degraded_platforms & required_channels
    count(degraded_required) > 0
    degraded := {sprintf("connector_degraded_%s", [platform]) | some platform in degraded_required}
}

# Stale health checks
stale_health_checks := stale if {
    stale_platforms := {platform |
        some connector in input.workspace.connectors
        health_check_is_stale(connector)
        platform := connector.platform
    }
    required_channels := get_required_channels
    stale_required := stale_platforms & required_channels
    count(stale_required) > 0
    stale := {sprintf("stale_health_check_%s", [platform]) | some platform in stale_required}
}

# Fallback channel usage
fallback_usage := fallbacks if {
    using_fallbacks := get_fallback_channels_in_use
    count(using_fallbacks) > 0
    fallbacks := {sprintf("using_fallback_channel_%s", [channel]) | some channel in using_fallbacks}
}

# Rate limited connectors
rate_limited_connectors := rate_limited if {
    rate_limited_platforms := {platform |
        some connector in input.workspace.connectors
        connector.rateLimitStatus == "limited"
        platform := connector.platform
    }
    required_channels := get_required_channels
    rate_limited_required := rate_limited_platforms & required_channels
    count(rate_limited_required) > 0
    rate_limited := {sprintf("rate_limited_%s", [platform]) | some platform in rate_limited_required}
}

# Expiring authentication tokens
expiring_tokens := expiring if {
    expiring_platforms := {platform |
        some connector in input.workspace.connectors
        token_expiring_soon(connector)
        platform := connector.platform
    }
    required_channels := get_required_channels
    expiring_required := expiring_platforms & required_channels
    count(expiring_required) > 0
    expiring := {sprintf("token_expiring_%s", [platform]) | some platform in expiring_required}
}

# Connector decision reasons
connector_reasons := reasons if {
    reasons := (all_connectors_available | fallback_strategy_viable | 
               health_checks_recent)
}

all_connectors_available contains "all_required_connectors_available" if {
    required_channels := get_required_channels
    available_channels := get_available_channels
    count(required_channels - available_channels) == 0
}

fallback_strategy_viable contains "fallback_channels_available" if {
    count(get_fallback_channels_in_use) > 0
}

health_checks_recent contains "health_checks_up_to_date" if {
    all connector in input.workspace.connectors {
        not health_check_is_stale(connector)
    }
}

# Helper functions

# Get channels required by the workflow
get_required_channels := channels if {
    workflow_channels := {channel |
        some step in input.workflow
        step.type == "publish"
        some channel in step.config.channels
    }
    primary_channels := set(input.workspace.primaryChannels)
    channels := workflow_channels | primary_channels
}

# Get channels that are currently available (connected and healthy)
get_available_channels := channels if {
    channels := {connector.platform |
        some connector in input.workspace.connectors
        connector.status == "connected"
        connector.healthStatus in {"healthy", "degraded"}
    }
}

# Get fallback channels that would be used
get_fallback_channels_in_use := fallbacks if {
    required_channels := get_required_channels
    available_channels := get_available_channels
    missing_channels := required_channels - available_channels
    
    # Check if workflow allows fallbacks
    allows_fallback := some step in input.workflow
                      step.type == "publish"
                      step.config.allowFallback == true
    
    allows_fallback
    fallback_channels := set(input.workspace.fallbackChannels)
    available_fallbacks := fallback_channels & get_available_channels
    fallbacks := available_fallbacks
}

# Check if fallbacks can cover unhealthy connectors
can_use_fallbacks_for_unhealthy(unhealthy_platforms) if {
    fallback_channels := set(input.workspace.fallbackChannels)
    available_fallbacks := fallback_channels & get_available_channels
    count(available_fallbacks) >= count(unhealthy_platforms)
    
    # Workflow must allow fallbacks
    some step in input.workflow
    step.type == "publish"
    step.config.allowFallback == true
}

# Check if health check is stale (older than 4 hours)
health_check_is_stale(connector) if {
    connector.lastHealthCheck
    current_time := time.parse_rfc3339_ns(input.timestamp)
    health_check_time := time.parse_rfc3339_ns(connector.lastHealthCheck)
    stale_threshold := 4 * 60 * 60 * 1000000000  # 4 hours in nanoseconds
    (current_time - health_check_time) > stale_threshold
}

# Check if authentication token is expiring soon (within 7 days)
token_expiring_soon(connector) if {
    connector.tokenExpiresAt
    current_time := time.parse_rfc3339_ns(input.timestamp)
    token_expiry := time.parse_rfc3339_ns(connector.tokenExpiresAt)
    days_threshold := 7 * 24 * 60 * 60 * 1000000000  # 7 days in nanoseconds
    (token_expiry - current_time) <= days_threshold
    token_expiry > current_time  # Not already expired
}

# Get connector by platform
get_connector_by_platform(platform) := connector if {
    some connector in input.workspace.connectors
    connector.platform == platform
}

# Check if platform supports specific workflow features
platform_supports_feature(platform, feature) if {
    # Define platform capabilities
    linkedin_features := {"text_posts", "image_posts", "video_posts", "carousel", "polls"}
    x_features := {"text_posts", "image_posts", "video_posts", "threads", "polls"}
    instagram_features := {"image_posts", "video_posts", "stories", "reels", "carousel"}
    facebook_features := {"text_posts", "image_posts", "video_posts", "carousel", "events"}
    
    platform_capabilities := {
        "linkedin": linkedin_features,
        "x": x_features,
        "instagram": instagram_features,
        "facebook": facebook_features
    }
    
    feature in platform_capabilities[platform]
}

# Connector health score calculation
connector_health_score(connector) := score if {
    base_score := 100
    
    # Deduct points for various issues
    status_penalty := 0
    status_penalty := 50; connector.status == "degraded"
    status_penalty := 100; connector.status in {"error", "revoked"}
    
    health_penalty := 0  
    health_penalty := 20; connector.healthStatus == "degraded"
    health_penalty := 50; connector.healthStatus == "unhealthy"
    
    staleness_penalty := 0
    staleness_penalty := 10; health_check_is_stale(connector)
    
    rate_limit_penalty := 0
    rate_limit_penalty := 15; connector.rateLimitStatus == "limited"
    
    token_penalty := 0
    token_penalty := 5; token_expiring_soon(connector)
    
    total_penalty := status_penalty + health_penalty + staleness_penalty + rate_limit_penalty + token_penalty
    score := base_score - total_penalty
}

# Overall connector readiness score
connector_readiness_score := score if {
    required_channels := get_required_channels
    channel_scores := [connector_health_score(get_connector_by_platform(channel)) |
                      some channel in required_channels]
    count(channel_scores) > 0
    score := sum(channel_scores) / count(channel_scores)
}

# Default values
default has_connector_violations := false
default get_required_channels := set()
default get_available_channels := set()
default get_fallback_channels_in_use := set()
default connector_readiness_score := 0