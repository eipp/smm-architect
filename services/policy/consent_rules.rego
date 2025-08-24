package smm.consent

import rego.v1

# Main consent policy decision
allow if {
    not has_consent_violations
}

# Collect all consent violations
deny contains reason if {
    some reason in consent_violations
}

# Collect consent warnings
warnings contains warning if {
    some warning in consent_warnings
}

# Reasons for policy decisions
reasons contains reason if {
    some reason in consent_reasons
}

# Check for any consent violations
has_consent_violations if {
    count(consent_violations) > 0
}

# All consent violations
consent_violations := violations if {
    violations := (missing_voice_consent | expired_voice_consent | 
                  missing_ugc_consent | expired_ugc_consent |
                  invalid_consent_scope)
}

# Missing voice consent violations
missing_voice_consent contains "missing_voice_consent" if {
    requires_voice_consent
    not has_valid_voice_consent
}

# Expired voice consent violations  
expired_voice_consent contains "expired_voice_consent" if {
    requires_voice_consent
    has_voice_consent
    voice_consent_expired
}

# Missing UGC consent violations
missing_ugc_consent contains "missing_ugc_license" if {
    requires_ugc_consent
    not has_valid_ugc_consent
}

# Expired UGC consent violations
expired_ugc_consent contains "expired_ugc_license" if {
    requires_ugc_consent  
    has_ugc_consent
    ugc_consent_expired
}

# Invalid consent scope violations
invalid_consent_scope contains "invalid_consent_scope" if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
    some step in input.workflow
    step.config.voice_model
    not consent_covers_voice_model(consent, step.config.voice_model)
}

# Consent warnings
consent_warnings := warnings if {
    warnings := (expiring_voice_consent | expiring_ugc_consent)
}

# Voice consent expiring soon
expiring_voice_consent contains "consent_expiring_soon" if {
    has_valid_voice_consent
    voice_consent_expiring_soon
}

# UGC consent expiring soon  
expiring_ugc_consent contains "ugc_consent_expiring_soon" if {
    has_valid_ugc_consent
    ugc_consent_expiring_soon
}

# Consent decision reasons
consent_reasons := reasons if {
    reasons := (voice_consent_reasons | ugc_consent_reasons)
}

voice_consent_reasons contains "voice_consent_validated" if {
    requires_voice_consent
    has_valid_voice_consent
}

ugc_consent_reasons contains "ugc_consent_validated" if {
    requires_ugc_consent
    has_valid_ugc_consent
}

# Helper functions

# Check if workflow requires voice consent
requires_voice_consent if {
    some step in input.workflow
    step.config.uses_synthetic_voice == true
}

# Check if workflow requires UGC consent
requires_ugc_consent if {
    some step in input.workflow
    step.config.requires_ugc == true
}

# Check if workspace has valid voice consent
has_valid_voice_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
    not consent_expired(consent)
}

# Check if workspace has any voice consent (even if expired)
has_voice_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
}

# Check if voice consent is expired
voice_consent_expired if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
    consent_expired(consent)
}

# Check if workspace has valid UGC consent
has_valid_ugc_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "ugc_license"
    not consent_expired(consent)
}

# Check if workspace has any UGC consent (even if expired)  
has_ugc_consent if {
    some consent in input.workspace.consentRecords
    consent.type == "ugc_license"
}

# Check if UGC consent is expired
ugc_consent_expired if {
    some consent in input.workspace.consentRecords
    consent.type == "ugc_license"
    consent_expired(consent)
}

# Check if voice consent is expiring soon (within 30 days)
voice_consent_expiring_soon if {
    some consent in input.workspace.consentRecords
    consent.type == "voice_likeness"
    not consent_expired(consent)
    consent_expiring_within_days(consent, 30)
}

# Check if UGC consent is expiring soon (within 30 days)
ugc_consent_expiring_soon if {
    some consent in input.workspace.consentRecords
    consent.type == "ugc_license"
    not consent_expired(consent)
    consent_expiring_within_days(consent, 30)
}

# Utility functions

# Check if a consent record is expired
consent_expired(consent) if {
    current_time := time.parse_rfc3339_ns(input.timestamp)
    expiry_time := time.parse_rfc3339_ns(consent.expiresAt)
    current_time >= expiry_time
}

# Check if consent expires within specified days
consent_expiring_within_days(consent, days) if {
    current_time := time.parse_rfc3339_ns(input.timestamp)
    expiry_time := time.parse_rfc3339_ns(consent.expiresAt)
    days_in_ns := days * 24 * 60 * 60 * 1000000000
    expiry_time <= (current_time + days_in_ns)
}

# Check if consent covers specific voice model
consent_covers_voice_model(consent, voice_model) if {
    # Extract user ID from voice model name (e.g., "user-123-voice-v1" -> "user-123")
    voice_user_id := split(voice_model, "-")[1]
    consent.grantedBy == voice_user_id
}

# Default to false for optional fields
default has_consent_violations := false
default requires_voice_consent := false  
default requires_ugc_consent := false
default has_valid_voice_consent := false
default has_valid_ugc_consent := false