package smm.budget

import rego.v1

# Main budget policy decision
allow if {
    not has_budget_violations
}

# Collect all budget violations
deny contains reason if {
    some reason in budget_violations
}

# Collect budget warnings
warnings contains warning if {
    some warning in budget_warnings
}

# Reasons for policy decisions
reasons contains reason if {
    some reason in budget_reasons
}

# Check for any budget violations
has_budget_violations if {
    count(budget_violations) > 0
}

# All budget violations
budget_violations := violations if {
    violations := (weekly_budget_exceeded | hard_budget_exceeded | 
                  currency_mismatch | negative_budget)
}

# Weekly budget cap exceeded
weekly_budget_exceeded contains "weekly_budget_exceeded" if {
    total_workflow_cost > remaining_weekly_budget
}

# Hard budget cap exceeded
hard_budget_exceeded contains "hard_budget_exceeded" if {
    total_workflow_cost > remaining_hard_budget
}

# Currency mismatch violation
currency_mismatch contains "currency_mismatch" if {
    workflow_has_currency_mismatch
}

# Negative budget violation
negative_budget contains "negative_budget_amount" if {
    some step in input.workflow
    step.estimatedCost < 0
}

# Budget warnings
budget_warnings := warnings if {
    warnings := (approaching_weekly_limit | approaching_hard_limit | 
                high_cost_workflow | budget_burn_rate_high)
}

# Approaching weekly budget limit (80% threshold)
approaching_weekly_limit contains "approaching_weekly_limit" if {
    weekly_utilization >= 0.8
    weekly_utilization < 1.0
}

# Approaching hard budget limit (90% threshold)
approaching_hard_limit contains "approaching_hard_limit" if {
    hard_utilization >= 0.9
    hard_utilization < 1.0
}

# High cost workflow warning (>50% of weekly budget)
high_cost_workflow contains "high_cost_workflow" if {
    total_workflow_cost > (input.workspace.budget.weeklyCap * 0.5)
}

# High budget burn rate warning
budget_burn_rate_high contains "high_budget_burn_rate" if {
    current_burn_rate > expected_burn_rate * 1.5
}

# Budget decision reasons
budget_reasons := reasons if {
    reasons := (weekly_budget_ok | hard_budget_ok | cost_estimates_valid)
}

weekly_budget_ok contains "weekly_budget_within_limits" if {
    total_workflow_cost <= remaining_weekly_budget
}

hard_budget_ok contains "hard_budget_within_limits" if {
    total_workflow_cost <= remaining_hard_budget
}

cost_estimates_valid contains "cost_estimates_validated" if {
    all_costs_positive
    no_currency_mismatches
}

# Helper functions and calculations

# Total estimated cost of the workflow
total_workflow_cost := cost if {
    costs := [step.estimatedCost | some step in input.workflow; step.estimatedCost]
    cost := sum(costs)
}

# Remaining weekly budget
remaining_weekly_budget := remaining if {
    remaining := input.workspace.budget.weeklyCap - input.currentSpend.thisWeek
}

# Remaining hard budget cap
remaining_hard_budget := remaining if {
    remaining := input.workspace.budget.hardCap - input.currentSpend.total
}

# Weekly budget utilization after workflow
weekly_utilization := utilization if {
    projected_weekly_spend := input.currentSpend.thisWeek + total_workflow_cost
    utilization := projected_weekly_spend / input.workspace.budget.weeklyCap
}

# Hard budget utilization after workflow
hard_utilization := utilization if {
    projected_total_spend := input.currentSpend.total + total_workflow_cost
    utilization := projected_total_spend / input.workspace.budget.hardCap
}

# Current budget burn rate (spend per day)
current_burn_rate := rate if {
    # Calculate days since start of week
    current_time := time.parse_rfc3339_ns(input.timestamp)
    weekday := time.weekday(current_time)
    days_into_week := weekday + 1
    rate := input.currentSpend.thisWeek / days_into_week
}

# Expected budget burn rate (weekly budget / 7 days)
expected_burn_rate := input.workspace.budget.weeklyCap / 7

# Check for currency mismatches
workflow_has_currency_mismatch if {
    workspace_currency := input.workspace.budget.currency
    some step in input.workflow
    step.currency
    step.currency != workspace_currency
}

# Check if spend currency matches workspace currency
spend_currency_matches if {
    workspace_currency := input.workspace.budget.currency
    spend_currency := input.currentSpend.currency
    workspace_currency == spend_currency
}

# Check if all workflow costs are positive
all_costs_positive if {
    all step in input.workflow {
        step.estimatedCost >= 0
    }
}

# Check for no currency mismatches in workflow
no_currency_mismatches if {
    workspace_currency := input.workspace.budget.currency
    all step in input.workflow {
        not step.currency
        or step.currency == workspace_currency
    }
}

# Budget efficiency metrics
budget_efficiency := efficiency if {
    total_allocated := input.workspace.budget.weeklyCap
    actual_usage := input.currentSpend.thisWeek + total_workflow_cost
    efficiency := actual_usage / total_allocated
}

# Cost per workflow step
average_step_cost := avg_cost if {
    step_count := count(input.workflow)
    step_count > 0
    avg_cost := total_workflow_cost / step_count
}

# Budget forecasting
projected_weekly_end_spend := projection if {
    current_time := time.parse_rfc3339_ns(input.timestamp)
    weekday := time.weekday(current_time)
    days_remaining := 7 - (weekday + 1)
    
    days_remaining > 0
    daily_rate := current_burn_rate
    projection := input.currentSpend.thisWeek + total_workflow_cost + (daily_rate * days_remaining)
}

# Risk assessment
budget_risk_level := risk if {
    risk := "low"; weekly_utilization < 0.7
    risk := "medium"; weekly_utilization >= 0.7; weekly_utilization < 0.9  
    risk := "high"; weekly_utilization >= 0.9
}

# Default values
default has_budget_violations := false
default total_workflow_cost := 0
default remaining_weekly_budget := 0
default remaining_hard_budget := 0
default weekly_utilization := 0
default hard_utilization := 0
default current_burn_rate := 0
default workflow_has_currency_mismatch := false
default all_costs_positive := true
default no_currency_mismatches := true