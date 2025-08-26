"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Shield, 
  Loader2, 
  AlertCircle,
  Chrome,
  Github,
  Linkedin
} from 'lucide-react'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
  tenantSlug?: string
  showSignUp?: boolean
  showForgotPassword?: boolean
  enableSSO?: boolean
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo,
  tenantSlug,
  showSignUp = true,
  showForgotPassword = true,
  enableSSO = true
}) => {
  const { login, verifyMFA, isLoading, error, mfa, clearError } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantSlug: tenantSlug || '',
    rememberMe: false
  })
  
  const [mfaCode, setMfaCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Clear errors when form data changes
  useEffect(() => {
    if (error) {
      clearError()
    }
    setValidationErrors({})
  }, [formData, clearError, error])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await login(formData)
      
      if (!mfa.required) {
        onSuccess?.()
        if (redirectTo) {
          window.location.href = redirectTo
        }
      }
    } catch (err) {
      // Error is handled by the auth context
    }
  }

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!mfaCode) {
      setValidationErrors({ mfa: 'Verification code is required' })
      return
    }

    try {
      await verifyMFA(mfaCode, 'totp') // Assuming TOTP for now
      onSuccess?.()
      if (redirectTo) {
        window.location.href = redirectTo
      }
    } catch (err) {
      // Error is handled by the auth context
    }
  }

  const handleSSOLogin = (provider: string) => {
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectTo || window.location.origin,
      ...(tenantSlug && { tenant: tenantSlug })
    })
    
    window.location.href = `/api/auth/sso?${params.toString()}`
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Show MFA form if required
  if (mfa.required) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the verification code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMFAVerification} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                error={!!validationErrors.mfa}
              />
              {validationErrors.mfa && (
                <p className="text-sm text-destructive">{validationErrors.mfa}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {/* Handle backup codes */}}
                className="text-sm text-muted-foreground hover:text-primary underline"
              >
                Use backup code instead
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10"
                error={!!validationErrors.email}
                autoComplete="email"
              />
            </div>
            {validationErrors.email && (
              <p className="text-sm text-destructive">{validationErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="pl-10 pr-10"
                error={!!validationErrors.password}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-sm text-destructive">{validationErrors.password}</p>
            )}
          </div>

          {!tenantSlug && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Organization (Optional)</Label>
              <Input
                id="tenant"
                type="text"
                placeholder="Enter organization name"
                value={formData.tenantSlug}
                onChange={(e) => handleInputChange('tenantSlug', e.target.value)}
                autoComplete="organization"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => handleInputChange('rememberMe', !!checked)}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>

            {showForgotPassword && (
              <button
                type="button"
                onClick={() => {/* Handle forgot password */}}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>

          {enableSSO && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSSOLogin('google')}
                  disabled={isLoading}
                >
                  <Chrome className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSSOLogin('github')}
                  disabled={isLoading}
                >
                  <Github className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSSOLogin('linkedin')}
                  disabled={isLoading}
                >
                  <Linkedin className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {showSignUp && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => {/* Handle navigation to sign up */}}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

// Standalone MFA verification component
export const MFAVerificationForm: React.FC<{
  onSuccess: () => void
  onBack: () => void
}> = ({ onSuccess, onBack }) => {
  const { verifyMFA, isLoading, error } = useAuth()
  const [code, setCode] = useState('')
  const [method, setMethod] = useState<'totp' | 'sms' | 'email'>('totp')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!code) return

    try {
      await verifyMFA(code, method)
      onSuccess()
    } catch (err) {
      // Error handled by context
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Please verify your identity to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading || !code}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}