'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building, 
  Users, 
  Calendar, 
  AlertTriangle, 
  TrendingUp,
  Home,
  CreditCard,
  Bell
} from 'lucide-react'
import { supabase, roomsAPI, paymentsAPI, alertsAPI, tenantsAPI } from '@/lib/supabase'
import AddTenantModal from './AddTenantModal'
import LogPaymentModal from './LogPaymentModal'
import ReportDamageModal from './ReportDamageModal'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    damagedRooms: 0,
    totalRent: 0,
    overduePayments: 0,
    upcomingPayments: 0,
    alerts: 0
  })

  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [showLogPayment, setShowLogPayment] = useState(false)
  const [showReportDamage, setShowReportDamage] = useState(false)

  useEffect(() => {
    loadDashboardData()
    
    // Set up real-time subscriptions
    const roomSubscription = supabase
      .channel('room_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' },
        () => loadDashboardData()
      )
      .subscribe()

    const paymentSubscription = supabase
      .channel('payment_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => loadDashboardData()
      )
      .subscribe()

    const alertSubscription = supabase
      .channel('alert_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        () => loadDashboardData()
      )
      .subscribe()

    const tenantSubscription = supabase
      .channel('tenant_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tenants' },
        () => loadDashboardData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomSubscription)
      supabase.removeChannel(paymentSubscription)
      supabase.removeChannel(alertSubscription)
      supabase.removeChannel(tenantSubscription)
    }
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load rooms data
      const { data: rooms } = await roomsAPI.getAll()
      const roomsData = rooms || []
      
      // Load payments data
      const { data: payments } = await paymentsAPI.getAll()
      const paymentsData = payments || []
      
      // Load alerts data
      const { data: alertsData } = await alertsAPI.getAll()
      const alertsList = alertsData || []

      // Load tenants data
      const { data: tenants } = await tenantsAPI.getAll()
      const tenantsData = tenants || []

      // Calculate stats
      const occupiedRooms = roomsData.filter(room => room.status === 'secured').length
      const availableRooms = roomsData.filter(room => room.status === 'available').length
      const damagedRooms = roomsData.filter(room => room.status === 'damaged').length
      
      const paidPayments = paymentsData.filter(payment => payment.status === 'paid')
      const overduePayments = paymentsData.filter(payment => payment.status === 'overdue')
      const upcomingPayments = paymentsData.filter(payment => payment.status === 'pending')
      
      const totalRent = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)

      // Set stats
      setStats({
        totalRooms: roomsData.length,
        occupiedRooms,
        availableRooms,
        damagedRooms,
        totalRent,
        overduePayments: overduePayments.length,
        upcomingPayments: upcomingPayments.length,
        alerts: alertsList.filter(alert => !alert.is_read).length
      })

      // Set recent activity from real data
      const activity: any[] = []
      
      // Add recent tenants
      tenantsData.slice(0, 3).forEach(tenant => {
        activity.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          message: `New tenant added: ${tenant.name}`,
          time: new Date(tenant.created_at).toLocaleDateString()
        })
      })
      
      // Add recent payments
      paidPayments.slice(0, 3).forEach(payment => {
        activity.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          message: `Payment received for ${payment.rooms?.name || 'Unknown room'}`,
          time: new Date(payment.created_at).toLocaleDateString()
        })
      })
      
      // Add recent damage reports
      const damageAlerts = alertsList.filter(alert => alert.type === 'damage_report').slice(0, 2)
      damageAlerts.forEach(alert => {
        activity.push({
          id: `damage-${alert.id}`,
          type: 'damage',
          message: alert.message,
          time: new Date(alert.created_at).toLocaleDateString()
        })
      })

      setRecentActivity(activity)

      // Set alerts
      setAlerts(alertsList.slice(0, 5)) // Show latest 5 alerts
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const occupancyRate = stats.totalRooms > 0 ? (stats.occupiedRooms / stats.totalRooms * 100).toFixed(1) : '0'

  const handleAddTenantSuccess = () => {
    loadDashboardData()
  }

  const handleLogPaymentSuccess = () => {
    loadDashboardData()
  }

  const handleReportDamageSuccess = () => {
    loadDashboardData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-gradient mb-2">Landmark Track</h1>
        <p className="text-text-secondary">Good morning, Kutlwano. Your portfolio is secure.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Occupancy Rate</p>
                <p className="text-3xl font-bold text-primary">{occupancyRate}%</p>
                <p className="text-text-muted text-xs mt-1">{stats.occupiedRooms} of {stats.totalRooms} rooms</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <Building className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-success">R{stats.totalRent.toLocaleString()}</p>
                <p className="text-success text-xs mt-1">+2.3% from last month</p>
              </div>
              <div className="bg-success/20 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Overdue Payments</p>
                <p className="text-3xl font-bold text-error">{stats.overduePayments}</p>
                <p className="text-text-muted text-xs mt-1">Requires attention</p>
              </div>
              <div className="bg-error/20 p-3 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-error" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Active Alerts</p>
                <p className="text-3xl font-bold text-warning">{stats.alerts}</p>
                <p className="text-text-muted text-xs mt-1">2 high priority</p>
              </div>
              <div className="bg-warning/20 p-3 rounded-xl">
                <Bell className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status Overview */}
        <Card className="luxury-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Room Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-success/10 border border-success/20">
                <p className="text-2xl font-bold text-success">{stats.availableRooms}</p>
                <p className="text-sm text-success">Available</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-2xl font-bold text-primary">{stats.occupiedRooms}</p>
                <p className="text-sm text-primary">Secured</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-2xl font-bold text-warning">{stats.damagedRooms}</p>
                <p className="text-sm text-warning">Damaged</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-3">Recent Activity</h4>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'payment' ? 'bg-success' : 
                        activity.type === 'damage' ? 'bg-warning' : 'bg-primary'
                      }`} />
                      <span className="text-sm">{activity.message}</span>
                    </div>
                    <span className="text-xs text-text-muted">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`alert-card alert-${
                  alert.type === 'late_payment' ? 'late-payment' : 
                  alert.type === 'damage' ? 'damage' : 'available'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-xs text-text-secondary mt-1">{alert.message}</p>
                    </div>
                    <Badge className={`${
                      alert.type === 'late_payment' ? 'bg-error/20 text-error' : 
                      'bg-warning/20 text-warning'
                    }`}>
                      {alert.type === 'late_payment' ? 'High' : 'Medium'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="luxury-button text-xs py-2 px-3">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="luxury-button-secondary text-xs py-2 px-3">
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button className="w-full mt-4 luxury-button">
              View All Alerts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="luxury-card mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="luxury-button flex items-center gap-2" onClick={() => setShowAddTenant(true)}>
              <Users className="w-4 h-4" />
              Add Tenant
            </Button>
            <Button className="luxury-button flex items-center gap-2" onClick={() => setShowLogPayment(true)}>
              <CreditCard className="w-4 h-4" />
              Log Payment
            </Button>
            <Button className="luxury-button flex items-center gap-2" onClick={() => setShowReportDamage(true)}>
              <AlertTriangle className="w-4 h-4" />
              Report Damage
            </Button>
            <Button className="luxury-button flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTenantModal 
        isOpen={showAddTenant} 
        onClose={() => setShowAddTenant(false)}
        onSuccess={handleAddTenantSuccess}
      />
      
      <LogPaymentModal 
        isOpen={showLogPayment} 
        onClose={() => setShowLogPayment(false)}
        onSuccess={handleLogPaymentSuccess}
      />
      
      <ReportDamageModal 
        isOpen={showReportDamage} 
        onClose={() => setShowReportDamage(false)}
        onSuccess={handleReportDamageSuccess}
      />
    </div>
  )
}
