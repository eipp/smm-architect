export interface TenantConfig {
  tenantId: string;
  tenantName: string;
  billingId: string;
  tier: 'starter' | 'professional' | 'enterprise';
  complianceLevel: 'standard' | 'gdpr' | 'hipaa' | 'sox';
  region: string;
  features: TenantFeatures;
  limits: TenantLimits;
  contact: TenantContact;
}

export interface TenantFeatures {
  agents: {
    research: boolean;
    creative: boolean;
    legal: boolean;
    analytics: boolean;
    coordinator: boolean;
    brand: boolean;
  };
  connectors: string[]; // linkedin, twitter, facebook, etc.
  simulation: {
    enabled: boolean;
    maxIterations: number;
    concurrentSimulations: number;
  };
  monitoring: {
    metrics: boolean;
    logging: boolean;
    alerts: boolean;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    retention: number; // days
  };
}

export interface TenantLimits {
  workspaces: number;
  usersPerWorkspace: number;
  monthlyBudget: number;
  apiRequestsPerMinute: number;
  storageQuotaGB: number;
  simulationTimeoutMinutes: number;
}

export interface TenantContact {
  adminEmail: string;
  billingEmail: string;
  technicalContact: string;
  supportLevel: 'basic' | 'premium' | 'enterprise';
}

export interface TenantResources {
  tenantId: string;
  namespace: any; // k8s.core.v1.Namespace
  rbac: any;
  secrets: any;
  networkPolicies: any;
  resourceQuotas: any;
  monitoring: any;
  databases: any;
  status: 'provisioning' | 'provisioned' | 'deprovisioning' | 'error';
  createdAt: string;
  updatedAt?: string;
  error?: string;
}

export interface TenantHealthCheck {
  tenantId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    namespace: HealthStatus;
    database: HealthStatus;
    secrets: HealthStatus;
    networking: HealthStatus;
    resources: HealthStatus;
    monitoring: HealthStatus;
  };
  lastChecked: string;
  recommendations?: string[];
}

export interface HealthStatus {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  lastChecked: string;
}

export interface TenantMetrics {
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  usage: {
    cpu: {
      requests: number;
      limits: number;
      utilization: number;
    };
    memory: {
      requests: number;
      limits: number;
      utilization: number;
    };
    storage: {
      used: number;
      available: number;
      utilization: number;
    };
    network: {
      ingressBytes: number;
      egressBytes: number;
    };
  };
  business: {
    activeWorkspaces: number;
    totalUsers: number;
    apiRequests: number;
    agentExecutions: number;
    simulationsRun: number;
    budgetSpent: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

export interface TenantBilling {
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  costs: {
    compute: number;
    storage: number;
    network: number;
    apiCalls: number;
    agents: number;
    connectors: number;
    support: number;
    total: number;
  };
  usage: {
    computeHours: number;
    storageGB: number;
    networkGB: number;
    apiCalls: number;
    agentExecutions: number;
    connectorCalls: number;
  };
  tier: string;
  discounts: {
    name: string;
    amount: number;
  }[];
}

export interface TenantAuditEvent {
  tenantId: string;
  eventId: string;
  timestamp: string;
  eventType: 'created' | 'updated' | 'deleted' | 'accessed' | 'failed';
  resource: string;
  actor: {
    type: 'user' | 'system' | 'api';
    id: string;
    ip?: string;
  };
  details: any;
  compliance: {
    gdpr?: boolean;
    hipaa?: boolean;
    sox?: boolean;
  };
}

export interface MultiTenantConfig {
  defaultTier: string;
  defaultRegion: string;
  enabledFeatures: string[];
  globalLimits: {
    maxTenantsPerCluster: number;
    maxNamespacesPerTenant: number;
  };
  compliance: {
    encryption: {
      atRest: boolean;
      inTransit: boolean;
    };
    audit: {
      enabled: boolean;
      retention: number; // days
    };
    dataResidency: {
      enforced: boolean;
      allowedRegions: string[];
    };
  };
  monitoring: {
    metricsRetention: number; // days
    alertingEnabled: boolean;
    dashboardsEnabled: boolean;
  };
}