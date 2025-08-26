export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  emailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  preferences: UserPreferences
  tenantId: string
  roles: Role[]
  permissions: Permission[]
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    workflowUpdates: boolean
    campaignAlerts: boolean
    systemMaintenance: boolean
  }
  dashboard: {
    layout: 'grid' | 'list'
    defaultView: 'campaigns' | 'workflows' | 'analytics'
    widgetsEnabled: string[]
  }
}

export interface Role {
  id: string
  name: string
  description: string
  level: number // Higher numbers have more access
  tenantId: string
  permissions: Permission[]
  isSystemRole: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: string
  resource: string // e.g., 'campaigns', 'workflows', 'users', 'analytics'
  action: string // e.g., 'create', 'read', 'update', 'delete', 'approve', 'execute'
  conditions?: PermissionCondition[]
  description: string
}

export interface PermissionCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than'
  value: any
}

export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  logo?: string
  status: 'active' | 'suspended' | 'trial' | 'expired'
  plan: 'starter' | 'professional' | 'enterprise'
  settings: TenantSettings
  limits: TenantLimits
  createdAt: Date
  updatedAt: Date
  ownerId: string
}

export interface TenantSettings {
  allowSelfRegistration: boolean
  requireEmailVerification: boolean
  enableSSO: boolean
  ssoProviders: SSOProvider[]
  passwordPolicy: PasswordPolicy
  sessionTimeout: number // minutes
  maxConcurrentSessions: number
  auditLogRetention: number // days
  dataRetention: number // days
}

export interface TenantLimits {
  maxUsers: number
  maxCampaigns: number
  maxWorkflows: number
  storageQuota: number // bytes
  apiRateLimit: number // requests per minute
  customRoles: number
}

export interface SSOProvider {
  id: string
  type: 'saml' | 'oidc' | 'oauth2'
  name: string
  enabled: boolean
  config: Record<string, any>
  mapping: {
    email: string
    name: string
    roles?: string[]
  }
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  preventReuse: number // number of previous passwords to check
  maxAge: number // days before password expires
  complexity: 'low' | 'medium' | 'high'
}

export interface AuthSession {
  id: string
  userId: string
  tenantId: string
  deviceInfo: {
    userAgent: string
    ip: string
    location?: string
    deviceType: 'desktop' | 'mobile' | 'tablet'
  }
  createdAt: Date
  expiresAt: Date
  lastActivity: Date
  isActive: boolean
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
  scope?: string[]
}

export interface LoginRequest {
  email: string
  password: string
  tenantSlug?: string
  rememberMe?: boolean
  mfaCode?: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  tenantSlug?: string
  inviteToken?: string
}

export interface MFASetup {
  enabled: boolean
  methods: MFAMethod[]
  backupCodes: string[]
}

export interface MFAMethod {
  id: string
  type: 'totp' | 'sms' | 'email' | 'backup_codes'
  enabled: boolean
  verified: boolean
  createdAt: Date
  metadata?: Record<string, any>
}

export interface AuthError {
  code: string
  message: string
  field?: string
  details?: Record<string, any>
}

export interface AuthState {
  user: User | null
  tenant: Tenant | null
  session: AuthSession | null
  tokens: AuthTokens | null
  isLoading: boolean
  isAuthenticated: boolean
  error: AuthError | null
  mfa: {
    required: boolean
    methods: MFAMethod[]
    challenge?: string
  }
}

// Permission checking utilities
export type ResourceAction = `${string}:${string}` // e.g., 'campaigns:create', 'workflows:execute'

export interface PermissionCheck {
  resource: string
  action: string
  context?: Record<string, any>
}

// Auth event types
export type AuthEventType = 
  | 'login'
  | 'logout' 
  | 'register'
  | 'password_reset'
  | 'email_verification'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'role_changed'
  | 'permission_granted'
  | 'permission_revoked'
  | 'session_expired'
  | 'account_locked'
  | 'account_unlocked'

export interface AuthEvent {
  id: string
  type: AuthEventType
  userId: string
  tenantId: string
  metadata: Record<string, any>
  timestamp: Date
  ipAddress: string
  userAgent: string
}