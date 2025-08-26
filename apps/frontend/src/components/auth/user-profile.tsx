"use client"

import React, { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Settings, 
  Key, 
  Globe, 
  Monitor,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'

interface UserProfileProps {
  onUpdate?: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onUpdate }) => {
  const { 
    user, 
    tenant, 
    updateProfile, 
    changePassword, 
    getSessions, 
    revokeSession,
    isLoading 
  } = useAuth()

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'sessions'>('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [preferences, setPreferences] = useState({
    theme: user?.preferences.theme || 'system',
    language: user?.preferences.language || 'en',
    timezone: user?.preferences.timezone || 'UTC',
    notifications: user?.preferences.notifications || {
      email: true,
      push: true,
      sms: false,
      workflowUpdates: true,
      campaignAlerts: true,
      systemMaintenance: true
    }
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const handleProfileUpdate = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        name: profileData.name,
        avatar: profileData.avatar
      })
      setIsEditing(false)
      onUpdate?.()
    } catch (error) {
      console.error('Profile update failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setIsSaving(true)
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
      alert('Password changed successfully')
    } catch (error) {
      console.error('Password change failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreferencesUpdate = async () => {
    setIsSaving(true)
    try {
      await updateProfile({
        preferences: {
          ...user?.preferences,
          ...preferences
        }
      })
      onUpdate?.()
    } catch (error) {
      console.error('Preferences update failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const userSessions = await getSessions()
      setSessions(userSessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId)
      await loadSessions() // Refresh sessions list
    } catch (error) {
      console.error('Failed to revoke session:', error)
    }
  }

  React.useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions()
    }
  }, [activeTab])

  if (!user) {
    return null
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'sessions', label: 'Sessions', icon: Monitor }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold">{user.name}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          {tenant && (
            <Badge variant="secondary" className="mt-1">
              {tenant.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile picture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={profileData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  value={profileData.avatar}
                  onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleProfileUpdate} disabled={isSaving}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false)
                        setProfileData({
                          name: user.name,
                          email: user.email,
                          avatar: user.avatar || ''
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              {/* Account Status */}
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium">Account Status</h4>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Email verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {user.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Status: {user.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPasswordForm ? (
                  <Button onClick={() => setShowPasswordForm(true)}>
                    Change Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-3"
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-3"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-3"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handlePasswordChange} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                      </Button>
                      <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is currently disabled. Enable it to secure your account.
                  </AlertDescription>
                </Alert>
                <Button className="mt-4" variant="outline">
                  Enable 2FA
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the interface looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' },
                      { value: 'system', label: 'System' }
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={preferences.theme === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreferences(prev => ({ ...prev, theme: option.value as any }))}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={preferences.language}
                    onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value as any }))}
                    className="w-full p-2 border border-border rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                <Button onClick={handlePreferencesUpdate} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(preferences.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={key}
                      checked={value}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            [key]: !!checked
                          }
                        }))
                      }
                    />
                    <Label htmlFor={key} className="text-sm font-normal">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                  </div>
                ))}

                <Button onClick={handlePreferencesUpdate} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across different devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          {session.deviceInfo.deviceType === 'mobile' ? (
                            <Smartphone className="h-4 w-4" />
                          ) : (
                            <Monitor className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{session.deviceInfo.userAgent}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.deviceInfo.location} • Last active: {new Date(session.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                  
                  {sessions.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No active sessions found
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}