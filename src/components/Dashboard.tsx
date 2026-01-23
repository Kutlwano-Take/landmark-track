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
  Bell,
  X
} from 'lucide-react'
import { supabase, roomsAPI, paymentsAPI, alertsAPI, tenantsAPI } from '@/lib/supabase'
import AddTenantModal from './AddTenantModal'
import LogPaymentModal from './LogPaymentModal'
import ReportDamageModal from './ReportDamageModal'
import ScheduleViewModal from './ScheduleViewModal'

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
  const [showAlertCenter, setShowAlertCenter] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [showAlertDetails, setShowAlertDetails] = useState(false)

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
      .channel('dashboard_payment_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        (payload) => {
          console.log('Dashboard - payment change detected:', payload)
          console.log('Dashboard - reloading data...')
          loadDashboardData()
        }
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
      
      // Load payments
      const { data: paymentsData } = await paymentsAPI.getAll()
      console.log('Dashboard payments data:', paymentsData)
      const payments = paymentsData || []
      
      // Load alerts data
      const { data: alertsData } = await alertsAPI.getAll()
      const alertsList = alertsData || []

      // Load tenants data
      const { data: tenants } = await tenantsAPI.getAll()
      const tenantsData = tenants || []

      // Calculate room stats
      const occupiedRooms = roomsData.filter(room => room.status === 'secured').length
      const availableRooms = roomsData.filter(room => room.status === 'available').length
      const damagedRooms = roomsData.filter(room => room.status === 'damaged').length
      
      // Calculate payment stats - filter for current month
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const currentMonthPayments = paymentsData.filter(payment => 
        payment.due_date.startsWith(currentMonth)
      )
      
      const paidPayments = currentMonthPayments.filter(payment => payment.status === 'paid')
      const overduePayments = currentMonthPayments.filter(payment => payment.status === 'overdue')
      const upcomingPayments = currentMonthPayments.filter(payment => payment.status === 'pending')
      
      // Monthly Revenue = sum of all paid payments for current month
      const monthlyRevenue = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
      
      // Active Alerts = all unread alerts
      const activeAlerts = alertsList.filter(alert => !alert.is_read)

      // Set stats
      setStats({
        totalRooms: roomsData.length,
        occupiedRooms,
        availableRooms,
        damagedRooms,
        totalRent: monthlyRevenue, // Changed to monthlyRevenue for clarity
        overduePayments: overduePayments.length,
        upcomingPayments: upcomingPayments.length,
        alerts: activeAlerts.length
      })

      // Set recent activity from real data
      const activity: any[] = []
      
      // Add recent tenants (last 3)
      const recentTenants = tenantsData
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3)
      
      recentTenants.forEach(tenant => {
        activity.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          message: `New tenant added: ${tenant.name}`,
          time: new Date(tenant.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      })
      
      // Add recent payments (last 5 payments of any status)
      const recentPayments = paymentsData
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
      
      recentPayments.forEach(payment => {
        let message = ''
        let type = 'payment'
        
        switch (payment.status) {
          case 'paid':
            message = `Payment received for ${payment.rooms?.name || 'Unknown room'} - $${payment.amount}`
            type = 'payment'
            break
          case 'pending':
            message = `Payment pending for ${payment.rooms?.name || 'Unknown room'} - $${payment.amount}`
            type = 'pending'
            break
          case 'overdue':
            message = `Payment overdue for ${payment.rooms?.name || 'Unknown room'} - $${payment.amount}`
            type = 'overdue'
            break
          default:
            message = `Payment updated for ${payment.rooms?.name || 'Unknown room'} - $${payment.amount}`
            type = 'payment'
        }
        
        activity.push({
          id: `payment-${payment.id}`,
          type: type,
          message: message,
          time: new Date(payment.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      })
      
      // Add recent damage reports (last 2)
      const damageAlerts = alertsList
        .filter(alert => alert.type === 'damage_report')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
      
      damageAlerts.forEach(alert => {
        activity.push({
          id: `damage-${alert.id}`,
          type: 'damage',
          message: alert.message,
          time: new Date(alert.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      })

      // Add recent payment overdue alerts (last 2)
      const paymentAlerts = alertsList
        .filter(alert => alert.type === 'late_payment')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2)
      
      paymentAlerts.forEach(alert => {
        activity.push({
          id: `payment-${alert.id}`,
          type: 'payment',
          message: alert.message,
          time: new Date(alert.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })
      })

      // Sort activity by most recent
      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      console.log('Recent activity generated (sorted):', activity.slice(0, 10)) // Show top 10
      setRecentActivity(activity)

      // Set alerts - show latest 5 unread alerts, or all alerts if less than 5 unread
      const alertsToShow = activeAlerts.length > 0 ? 
        activeAlerts.slice(0, 5) : 
        alertsList.slice(0, 5)
      setAlerts(alertsToShow)
      
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

  const handleViewAlertDetails = (alert: any) => {
    setSelectedAlert(alert)
    setShowAlertDetails(true)
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await alertsAPI.delete(alertId)
      loadDashboardData()
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  const handleViewAllAlerts = () => {
    // Navigate to alerts page - for now we'll use a simple approach
    window.location.href = '/alerts'
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
        <Card className="luxury-card hover:scale-105 transition-transform duration-300 cursor-pointer hover:shadow-lg hover:shadow-primary/20">
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

        <Card className="luxury-card hover:scale-105 transition-transform duration-300 cursor-pointer hover:shadow-lg hover:shadow-success/20">
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

        <Card className="luxury-card hover:scale-105 transition-transform duration-300 cursor-pointer hover:shadow-lg hover:shadow-error/20">
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

        <Card className="luxury-card hover:scale-105 transition-transform duration-300 cursor-pointer hover:shadow-lg hover:shadow-warning/20">
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
                        activity.type === 'pending' ? 'bg-primary' : 
                        activity.type === 'overdue' ? 'bg-danger' : 
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
                  alert.type === 'damage_report' ? 'damage' : 
                  alert.type === 'maintenance' ? 'maintenance' :
                  'available'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <p className="text-xs text-text-secondary mt-1">{alert.message}</p>
                    </div>
                    <Badge className={`${
                      alert.type === 'late_payment' ? 'bg-error/20 text-error' : 
                      alert.type === 'damage_report' ? 'bg-warning/20 text-warning' :
                      alert.type === 'maintenance' ? 'bg-info/20 text-info' :
                      'bg-success/20 text-success'
                    }`}>
                      {alert.type === 'late_payment' ? 'High' : 
                       alert.type === 'damage_report' ? 'Medium' :
                       alert.type === 'maintenance' ? 'Medium' :
                       'Low'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      className="luxury-button text-xs py-2 px-3"
                      onClick={() => handleViewAlertDetails(alert)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="luxury-button-secondary text-xs py-2 px-3"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              className="w-full mt-4 luxury-button"
              onClick={handleViewAllAlerts}
            >
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
            <Button className="luxury-button flex items-center gap-2" onClick={() => setShowAlertCenter(true)}>
              <AlertTriangle className="w-4 h-4" />
              Alert Center
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

      <ScheduleViewModal 
        isOpen={showAlertCenter} 
        onClose={() => setShowAlertCenter(false)}
        onSuccess={loadDashboardData}
      />

      {/* Alert Details Modal */}
      {showAlertDetails && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Alert Details</h3>
              <button
                onClick={() => setShowAlertDetails(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-muted mb-1">Type</p>
                <Badge className={`capitalize ${
                  selectedAlert.type === 'late_payment' ? 'bg-error/20 text-error' : 
                  selectedAlert.type === 'damage_report' ? 'bg-warning/20 text-warning' : 
                  'bg-primary/20 text-primary'
                }`}>
                  {selectedAlert.type.replace('_', ' ')}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-1">Title</p>
                <p className="text-text-primary font-medium">{selectedAlert.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-1">Message</p>
                <p className="text-text-primary">{selectedAlert.message}</p>
              </div>
              
              {selectedAlert.rooms && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Room</p>
                  <p className="text-text-primary">{selectedAlert.rooms.name}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-text-muted mb-1">Created</p>
                <p className="text-text-primary">
                  {new Date(selectedAlert.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-text-muted mb-1">Priority</p>
                <Badge className={
                  selectedAlert.type === 'late_payment' ? 'bg-error/20 text-error' : 
                  'bg-warning/20 text-warning'
                }>
                  {selectedAlert.type === 'late_payment' ? 'High' : 'Medium'}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button 
                className="flex-1 luxury-button"
                onClick={() => handleDeleteAlert(selectedAlert.id)}
              >
                Delete Alert
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 luxury-button-secondary"
                onClick={() => setShowAlertDetails(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
