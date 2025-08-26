"use client"

import React from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PermissionCheck, ResourceAction } from '@/types/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, ShieldX, Lock, AlertTriangle } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

// Protect routes that require authentication
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback,
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be signed in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = redirectTo}
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

interface PermissionGuardProps {
  children: React.ReactNode
  permission: PermissionCheck
  fallback?: React.ReactNode
  showError?: boolean
}

// Protect components/routes that require specific permissions
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback,
  showError = true
}) => {
  const { hasPermission, user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  if (!hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showError) {
      return null
    }

    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </div>
          <CardDescription>
            You don't have permission to access this resource.
            Required: {permission.resource}:{permission.action}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <>{children}</>
}

interface RoleGuardProps {
  children: React.ReactNode
  roles: string | string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  showError?: boolean
}

// Protect components/routes that require specific roles
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  roles,
  requireAll = false,
  fallback,
  showError = true
}) => {
  const { hasRole, hasAnyRole, user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  const roleArray = Array.isArray(roles) ? roles : [roles]
  const hasAccess = requireAll 
    ? roleArray.every(role => hasRole(role))
    : hasAnyRole(roleArray)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showError) {
      return null
    }

    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Insufficient Role</CardTitle>
          </div>
          <CardDescription>
            You don't have the required role to access this resource.
            Required: {roleArray.join(requireAll ? ' and ' : ' or ')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <>{children}</>
}

interface ResourceGuardProps {
  children: React.ReactNode
  resource: ResourceAction
  fallback?: React.ReactNode
  showError?: boolean
}

// Protect components/routes using resource:action format
export const ResourceGuard: React.FC<ResourceGuardProps> = ({
  children,
  resource,
  fallback,
  showError = true
}) => {
  const { canAccess, user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  if (!canAccess(resource)) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (!showError) {
      return null
    }

    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </div>
          <CardDescription>
            You don't have permission to {resource}.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return <>{children}</>
}

interface TenantGuardProps {
  children: React.ReactNode
  requiredStatus?: 'active' | 'trial' | 'suspended'
  requiredPlan?: 'starter' | 'professional' | 'enterprise'
  fallback?: React.ReactNode
}

// Protect components/routes based on tenant status or plan
export const TenantGuard: React.FC<TenantGuardProps> = ({
  children,
  requiredStatus,
  requiredPlan,
  fallback
}) => {
  const { tenant, isAuthenticated } = useAuth()

  if (!isAuthenticated || !tenant) {
    return null
  }

  let hasAccess = true

  if (requiredStatus && tenant.status !== requiredStatus) {
    hasAccess = false
  }

  if (requiredPlan) {
    const planLevels = { starter: 1, professional: 2, enterprise: 3 }
    const currentLevel = planLevels[tenant.plan]
    const requiredLevel = planLevels[requiredPlan]
    
    if (currentLevel < requiredLevel) {
      hasAccess = false
    }
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Card className="border-yellow-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-yellow-700">Upgrade Required</CardTitle>
          </div>
          <CardDescription>
            {requiredPlan && (
              <>This feature requires a {requiredPlan} plan or higher.</>
            )}
            {requiredStatus && (
              <>Your account status must be {requiredStatus} to access this feature.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full">
            Upgrade Account
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

// Higher-order component for easy route protection
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Higher-order component for permission-based protection
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionCheck,
  options?: Omit<PermissionGuardProps, 'children' | 'permission'>
) {
  return function PermissionGuardedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} {...options}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// Higher-order component for role-based protection
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  roles: string | string[],
  options?: Omit<RoleGuardProps, 'children' | 'roles'>
) {
  return function RoleGuardedComponent(props: P) {
    return (
      <RoleGuard roles={roles} {...options}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}

// Utility component for showing user info with permissions
export const UserPermissionDebug: React.FC = () => {
  const { user, tenant, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Debug: User Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">User Info</h4>
          <p className="text-sm text-muted-foreground">
            {user.name} ({user.email})
          </p>
          <p className="text-sm text-muted-foreground">
            Tenant: {tenant?.name}
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">Roles</h4>
          <div className="flex flex-wrap gap-1">
            {user.roles.map(role => (
              <span 
                key={role.id}
                className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Permissions</h4>
          <div className="max-h-32 overflow-y-auto">
            {user.permissions.map(permission => (
              <div 
                key={permission.id}
                className="text-xs text-muted-foreground py-1"
              >
                {permission.resource}:{permission.action}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}