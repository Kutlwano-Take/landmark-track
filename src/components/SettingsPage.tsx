'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Lock, Building, Bell, Palette } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setProfile({
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || '',
        })
      }
    })
  }, [])

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.name,
          phone: profile.phone,
        }
      })
      
      if (error) throw error
      
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    // This would typically open a password reset flow
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email)
    
    if (error) {
      alert('Error sending password reset email')
    } else {
      alert('Password reset email sent!')
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-serif text-gradient mb-8">Settings</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="luxury-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="mt-1"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="mt-1 bg-surface-light"
                    placeholder="Email cannot be changed"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="luxury-button"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="luxury-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Password</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Change your password to keep your account secure
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handlePasswordChange}
                    className="luxury-button-secondary"
                  >
                    Change Password
                  </Button>
                </div>
                
                <div className="pt-4 border-t border-border">
                  <h3 className="font-medium mb-2">Session</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Manage your active sessions
                  </p>
                  <div className="text-xs text-text-muted">
                    Last login: {session?.user?.last_sign_in_at ? 
                      new Date(session.user.last_sign_in_at).toLocaleDateString() : 
                      'Unknown'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="luxury-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Payment Reminders</div>
                      <div className="text-sm text-text-secondary">
                        Get notified about upcoming payments
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Late Payment Alerts</div>
                      <div className="text-sm text-text-secondary">
                        Immediate alerts for overdue payments
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Damage Reports</div>
                      <div className="text-sm text-text-secondary">
                        Notifications for room damage reports
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                  
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Room Availability</div>
                      <div className="text-sm text-text-secondary">
                        Alerts when rooms become available
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <Card className="luxury-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Account Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {session?.user?.created_at ? 
                      Math.floor((Date.now() - new Date(session.user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 
                      0
                    }
                  </div>
                  <p className="text-sm text-text-muted">Days Active</p>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Account Type</span>
                    <span className="text-text-primary">Landlord</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Member Since</span>
                    <span className="text-text-primary">
                      {session?.user?.created_at ? 
                        new Date(session.user.created_at).toLocaleDateString() : 
                        'Unknown'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="luxury-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Theme</h3>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between">
                      <span>Luxury Dark</span>
                      <input type="radio" name="theme" defaultChecked className="w-4 h-4" />
                    </label>
                    <label className="flex items-center justify-between">
                      <span>Light Mode</span>
                      <input type="radio" name="theme" className="w-4 h-4" />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
