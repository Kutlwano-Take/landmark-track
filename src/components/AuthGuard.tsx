'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: Session | null) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="luxury-card w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4">
              <h1 className="text-3xl font-serif text-gradient">Landmark Track</h1>
              <p className="text-text-secondary">Luxury Property Management</p>
            </div>
            <CardTitle className="text-xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#C9A96E',
                      brandAccent: '#B89B5F',
                      inputBackground: '#252836',
                      inputText: '#F8F9FA',
                      inputBorder: '#374151',
                      inputPlaceholder: '#6B7280',
                    }
                  }
                }
              }}
              providers={[]}
              redirectTo={`${window.location.origin}/`}
            />
            <div className="mt-4 text-center text-sm text-text-muted">
              Sign in to access your property portfolio
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
