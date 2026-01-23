'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Home, 
  CreditCard, 
  Bell, 
  Settings, 
  User,
  Menu,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Dashboard from './Dashboard'
import RoomManagement from './RoomManagement'
import PaymentTracking from './PaymentTracking'
import AlertSystem from './AlertSystem'
import SettingsPage from './SettingsPage'

export default function Navigation() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms', icon: Home },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'rooms':
        return <RoomManagement />
      case 'payments':
        return <PaymentTracking />
      case 'alerts':
        return <AlertSystem />
      case 'settings':
        return <SettingsPage />
      default:
        return <Dashboard />
    }
  }

  const SettingsPage = () => null

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-text-primary hover:bg-surface"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-serif text-gradient">Landmark Track</h1>
              <p className="text-xs text-text-muted">Luxury Property Management</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    setSidebarOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/10' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-light hover:border hover:border-primary/20 hover:shadow-md hover:shadow-primary/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-8 p-4 rounded-xl bg-surface-light border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Kutlwano</p>
                <p className="text-xs text-text-muted">Landlord</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-text-muted hover:text-primary" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {renderContent()}
      </div>
    </div>
  )
}
