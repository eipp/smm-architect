"use client"

import * as React from "react"
import { usePermissions, type User, type Role, type Permission } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card"
import { Input } from "./input"
import { Label } from "./label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { 
  Shield, 
  Users, 
  UserPlus, 
  Mail, 
  Edit, 
  Trash2, 
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal
} from "lucide-react"

// Permission Gate Component
export interface PermissionGateProps {
  resource: string
  action: string
  scope?: string
  fallback?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  resource,
  action,
  scope,
  fallback = null,
  children,
  className
}) => {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission(resource, action, scope)) {
    return <div className={className}>{fallback}</div>
  }
  
  return <div className={className}>{children}</div>
}

// Team Member Interface
export interface TeamMember {
  id: string
  email: string
  name: string
  roles: Role[]
  status: 'active' | 'invited' | 'suspended'
  lastActive: Date
  source: 'manual' | 'sso' | 'scim'
  avatar?: string
}

export interface Invitation {
  id: string
  email: string
  role: Role
  invitedBy: string
  invitedAt: Date
  expiresAt: Date
  status: 'pending' | 'expired' | 'revoked'
}

// Mock data for demo
const mockMembers: TeamMember[] = [
  {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin User",
    roles: [
      {
        id: "role-admin",
        name: "Administrator",
        permissions: [
          { resource: "workspace", action: "create" },
          { resource: "workspace", action: "read", scope: "all" },
          { resource: "team", action: "manage" },
          { resource: "settings", action: "manage" }
        ]
      }
    ],
    status: "active",
    lastActive: new Date(Date.now() - 1000 * 60 * 30),
    source: "manual"
  },
  {
    id: "user-2", 
    email: "manager@example.com",
    name: "Campaign Manager",
    roles: [
      {
        id: "role-manager",
        name: "Manager",
        permissions: [
          { resource: "campaign", action: "approve" },
          { resource: "workspace", action: "read", scope: "team" },
          { resource: "workspace", action: "create" }
        ]
      }
    ],
    status: "active",
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2),
    source: "sso"
  }
]

const mockRoles: Role[] = [
  {
    id: "role-admin",
    name: "Administrator", 
    permissions: [
      { resource: "workspace", action: "create" },
      { resource: "workspace", action: "read", scope: "all" },
      { resource: "workspace", action: "update", scope: "all" },
      { resource: "workspace", action: "delete", scope: "all" },
      { resource: "team", action: "manage" },
      { resource: "settings", action: "manage" },
      { resource: "audit", action: "read" }
    ]
  },
  {
    id: "role-manager",
    name: "Manager",
    permissions: [
      { resource: "workspace", action: "create" },
      { resource: "workspace", action: "read", scope: "team" },
      { resource: "workspace", action: "update", scope: "team" },
      { resource: "campaign", action: "approve" },
      { resource: "audit", action: "read" }
    ]
  },
  {
    id: "role-creator",
    name: "Content Creator", 
    permissions: [
      { resource: "workspace", action: "read", scope: "own" },
      { resource: "workspace", action: "update", scope: "own" },
      { resource: "campaign", action: "create" }
    ]
  }
]

const mockInvitations: Invitation[] = [
  {
    id: "inv-1",
    email: "newuser@example.com",
    role: mockRoles[2],
    invitedBy: "Admin User",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
    status: "pending"
  }
]

// Tenant Admin Panel Component
export const TenantAdminPanel: React.FC<{ className?: string }> = ({ className }) => {
  const [members, setMembers] = React.useState<TeamMember[]>(mockMembers)
  const [roles, setRoles] = React.useState<Role[]>(mockRoles)
  const [invitations, setInvitations] = React.useState<Invitation[]>(mockInvitations)
  const [activeTab, setActiveTab] = React.useState<'members' | 'roles' | 'invitations'>('members')
  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [showRoleModal, setShowRoleModal] = React.useState(false)

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invited':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'suspended':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'invited':
        return 'warning'
      case 'suspended':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatLastActive = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Active now'
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className={cn("tenant-admin space-y-6", className)}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
          <Button variant="outline" onClick={() => setShowRoleModal(true)}>
            <Shield className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending ({invitations.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="space-y-4">
          <div className="grid gap-4">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{member.name}</h3>
                          {getStatusIcon(member.status)}
                          <Badge variant={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                          {member.source === 'sso' && (
                            <Badge variant="outline" className="text-xs">SSO</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatLastActive(member.lastActive)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {member.roles.map((role) => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name === 'Administrator' && <Crown className="mr-1 h-3 w-3" />}
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {member.roles.reduce((sum, role) => sum + role.permissions.length, 0)} permissions
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {role.name === 'Administrator' && <Crown className="h-5 w-5" />}
                      {role.name}
                    </CardTitle>
                    <Badge variant="outline">
                      {role.permissions.length} permissions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Permissions</h4>
                    <div className="space-y-1 text-sm">
                      {role.permissions.slice(0, 4).map((permission, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="capitalize">{permission.resource}</span>
                          <span className="text-muted-foreground capitalize">
                            {permission.action}
                            {permission.scope && ` (${permission.scope})`}
                          </span>
                        </div>
                      ))}
                      {role.permissions.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{role.permissions.length - 4} more permissions
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" disabled={role.name === 'Administrator'}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="invitations" className="space-y-4">
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{invitation.email}</h3>
                        <p className="text-sm text-muted-foreground">
                          Invited by {invitation.invitedBy} • {invitation.role.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires in {Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Resend
                      </Button>
                      <Button variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Protected Route Component
export interface ProtectedRouteProps {
  requiredPermissions?: Array<{
    resource: string
    action: string
    scope?: string
  }>
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermissions = [],
  fallback = <div>Access denied</div>,
  children
}) => {
  const { hasPermission, user } = usePermissions()
  
  if (!user) {
    return <div>Please log in to access this page</div>
  }
  
  const hasAllPermissions = requiredPermissions.every(({ resource, action, scope }) =>
    hasPermission(resource, action, scope)
  )
  
  if (!hasAllPermissions) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

export type { TeamMember, Invitation }