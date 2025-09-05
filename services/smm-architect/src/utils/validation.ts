import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import path from "path";
import { WorkspaceContract } from "../types";

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load workspace contract schema
const schemaPath = path.join(__dirname, "../../../schemas/workspace-contract.json");
let workspaceSchema: any;

try {
  workspaceSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
} catch (error) {
  console.error("Could not load workspace schema");
  workspaceSchema = null;
}

const validateContract = workspaceSchema ? ajv.compile(workspaceSchema) : null;

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export async function validateWorkspaceContract(contract: WorkspaceContract): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!validateContract) {
    throw new Error("Workspace schema is missing");
  }

  // Schema validation
  const valid = validateContract(contract);
  if (!valid && validateContract.errors) {
    errors.push(...validateContract.errors.map(err => 
      `${err.instancePath} ${err.message}`
    ));
  }

  // Business logic validation
  const businessValidation = await validateBusinessLogic(contract);
  if (!businessValidation.valid) {
    errors.push(...(businessValidation.errors || []));
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function validateBusinessLogic(contract: WorkspaceContract): Promise<ValidationResult> {
  const errors: string[] = [];

  // Budget validation
  if (contract.budget) {
    const { breakdown, weeklyCap, hardCap } = contract.budget;
    
    if (breakdown) {
      const totalBreakdown = breakdown.paidAds + breakdown.llmModelSpend + 
                           breakdown.rendering + breakdown.thirdPartyServices;
      
      if (totalBreakdown > weeklyCap) {
        errors.push("Budget breakdown total exceeds weekly cap");
      }
    }

    if (weeklyCap * 4 > hardCap) {
      errors.push("Weekly cap * 4 exceeds hard cap - unsustainable");
    }
  }

  // Lifecycle validation
  if (contract.lifecycle === 'signed' && !contract.signedBy) {
    errors.push("Signed lifecycle requires signedBy information");
  }

  if (contract.lifecycle === 'active' && (!contract.effectiveFrom || new Date(contract.effectiveFrom) > new Date())) {
    errors.push("Active lifecycle requires effectiveFrom to be in the past");
  }

  // Connector validation
  if (contract.connectors) {
    const connectedChannels = contract.connectors
      .filter(c => c.status === 'connected')
      .map(c => c.platform);
    
    const missingConnectors = contract.primaryChannels.filter(
      channel => !connectedChannels.includes(channel)
    );

    if (missingConnectors.length > 0) {
      errors.push(`Missing connected platforms: ${missingConnectors.join(', ')}`);
    }
  }

  // Consent validation
  if (contract.consentRecords) {
    const now = new Date();
    const expiredConsents = contract.consentRecords.filter(
      consent => new Date(consent.expiresAt) <= now
    );

    if (expiredConsents.length > 0) {
      errors.push(`Expired consent records: ${expiredConsents.map(c => c.type).join(', ')}`);
    }
  }

  // Approval policy validation
  if (contract.approvalPolicy) {
    const { autoApproveReadinessThreshold, canaryInitialPct } = contract.approvalPolicy;
    
    if (autoApproveReadinessThreshold < 0 || autoApproveReadinessThreshold > 1) {
      errors.push("Auto-approve readiness threshold must be between 0 and 1");
    }

    if (canaryInitialPct < 0 || canaryInitialPct > 1) {
      errors.push("Canary initial percentage must be between 0 and 1");
    }
  }

  // TTL validation
  if (contract.ttlHours && contract.ttlHours < 24) {
    errors.push("TTL must be at least 24 hours");
  }

  // Emergency flags validation
  if (contract.emergencyFlags?.pauseAll && !contract.emergencyFlags.reason) {
    errors.push("Emergency pause requires a reason");
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function validateGoals(goals: WorkspaceContract['goals']): ValidationResult {
  const errors: string[] = [];

  if (!goals || goals.length === 0) {
    errors.push("At least one goal is required");
    return { valid: false, errors };
  }

  goals.forEach((goal, index) => {
    if (!goal.key) errors.push(`Goal ${index}: key is required`);
    if (typeof goal.target !== 'number' || goal.target <= 0) {
      errors.push(`Goal ${index}: target must be a positive number`);
    }
    if (!goal.unit) errors.push(`Goal ${index}: unit is required`);
  });

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export function validateBudget(budget: WorkspaceContract['budget']): ValidationResult {
  const errors: string[] = [];

  if (!budget) {
    errors.push("Budget is required");
    return { valid: false, errors };
  }

  if (!budget.currency || budget.currency.length !== 3) {
    errors.push("Valid 3-letter currency code is required");
  }

  if (budget.weeklyCap <= 0) {
    errors.push("Weekly cap must be positive");
  }

  if (budget.hardCap <= 0) {
    errors.push("Hard cap must be positive");
  }

  if (budget.weeklyCap > budget.hardCap) {
    errors.push("Weekly cap cannot exceed hard cap");
  }

  if (budget.breakdown) {
    const { paidAds, llmModelSpend, rendering, thirdPartyServices } = budget.breakdown;
    
    if (paidAds < 0 || llmModelSpend < 0 || rendering < 0 || thirdPartyServices < 0) {
      errors.push("All budget breakdown values must be non-negative");
    }

    const total = paidAds + llmModelSpend + rendering + thirdPartyServices;
    if (total > budget.weeklyCap) {
      errors.push("Budget breakdown total exceeds weekly cap");
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}