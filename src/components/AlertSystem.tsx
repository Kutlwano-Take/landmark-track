'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Home,
  CreditCard,
  User,
  X,
  Eye,
  Mail,
  Phone
} from 'lucide-react'
import { supabase, alertsAPI } from '@/lib/supabase'

interface Alert {
  id: string
  type: 'late_payment' | 'damage_report' | 'room_available' | 'maintenance'
  title: string
  message: string
  room_id?: string
  tenant_id?: string
  severity?: 'high' | 'medium' | 'low'
  is_read: boolean
  created_at: string
  action_required?: boolean
  rooms?: {
    name: string
  }
  tenants?: {
    name: string
  }
}

export default function AlertSystem() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'late_payment' | 'damage_report' | 'room_available' | 'maintenance'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all')

  useEffect(() => {
    loadAlerts()
    
    // Set up real-time subscription
    const alertSubscription = supabase
      .channel('alert_system_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        () => loadAlerts()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(alertSubscription)
    }
  }, [])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const { data } = await alertsAPI.getAll()
      setAlerts(data || [])
    } catch (error) {
      console.error('Error loading alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      await alertsAPI.markAsRead(alertId)
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      // For now, just mark as read instead of deleting
      await alertsAPI.markAsRead(alertId)
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = filterType === 'all' || alert.type === filterType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'read' && alert.is_read) || 
                         (filterStatus === 'unread' && !alert.is_read)
    return matchesType && matchesStatus
  })

  const getStatusColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-danger/20 text-danger border border-danger/30'
      case 'medium': return 'bg-warning/20 text-warning border border-warning/30'
      case 'low': return 'bg-info/20 text-info border border-info/30'
      default: return 'bg-warning/20 text-warning border border-warning/30'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'late_payment': return <CreditCard className="w-3 h-3" />
      case 'damage_report': return <AlertTriangle className="w-3 h-3" />
      case 'maintenance': return <Home className="w-3 h-3" />
      case 'room_available': return <Home className="w-3 h-3" />
      default: return <Bell className="w-3 h-3" />
    }
  }

  const unreadCount = alerts.filter(alert => !alert.is_read).length
  const highPriorityCount = alerts.filter(alert => alert.severity === 'high').length
  const actionRequiredCount = alerts.filter(alert => alert.action_required).length

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gradient mb-2">Alert Center</h1>
        <p className="text-text-secondary">Stay informed about important property events</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-text-muted text-xs mt-1">Last 30 days</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <Bell className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Unread</p>
                <p className="text-2xl font-bold text-warning">{unreadCount}</p>
                <p className="text-warning text-xs mt-1">Requires attention</p>
              </div>
              <div className="bg-warning/20 p-3 rounded-xl">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">High Priority</p>
                <p className="text-2xl font-bold text-error">{highPriorityCount}</p>
                <p className="text-error text-xs mt-1">Immediate action</p>
              </div>
              <div className="bg-error/20 p-3 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Action Required</p>
                <p className="text-2xl font-bold text-primary">{actionRequiredCount}</p>
                <p className="text-text-muted text-xs mt-1">Pending tasks</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="luxury-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <SelectTrigger className="luxury-select">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="late_payment">Late Payments</SelectItem>
                  <SelectItem value="damage_report">Damage Reports</SelectItem>
                  <SelectItem value="room_available">Available Rooms</SelectItem>
                  <SelectItem value="payment_due">Payment Due</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                <SelectTrigger className="luxury-select">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="luxury-button-secondary"
                onClick={() => alerts.filter(alert => !alert.is_read).forEach(alert => markAsRead(alert.id))}
                disabled={unreadCount === 0}
              >
                Mark All Read
              </Button>
              <Button className="luxury-button">
                Configure Alerts
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alerts ({filteredAlerts.length})</span>
            <Button variant="outline" className="luxury-button-secondary flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View History
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`luxury-card p-4 hover:bg-surface-light transition-colors ${!alert.is_read ? 'border-l-4 border-primary' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-text-primary">{alert.title}</h3>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(alert.severity || 'medium')}`}>
                        {getAlertIcon(alert.type)}
                        {alert.severity ? alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1) : 'Medium'}
                      </Badge>
                      {!alert.is_read && (
                        <Badge className="bg-primary/20 text-primary border border-primary/30">
                          New
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-text-secondary mb-3">{alert.message}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Room:</span>
                        <span className="ml-2 text-text-primary">{alert.rooms?.name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Created:</span>
                        <span className="ml-2 text-text-primary">{new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Action Required:</span>
                        <span className="ml-2 text-text-primary">{alert.action_required ? 'Yes' : 'No'}</span>
                      </div>
                    </div>

                    {alert.action_required && (
                      <div className="flex gap-2 mt-3">
                        {alert.type === 'late_payment' && (
                          <>
                            <Button size="sm" className="luxury-button flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Send Reminder
                            </Button>
                            <Button size="sm" variant="outline" className="luxury-button-secondary flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              Call Tenant
                            </Button>
                          </>
                        )}
                        {alert.type === 'damage_report' && (
                          <>
                            <Button size="sm" className="luxury-button flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              View Damage
                            </Button>
                            <Button size="sm" variant="outline" className="luxury-button-secondary">
                              Schedule Repair
                            </Button>
                          </>
                        )}
                        {alert.type === 'room_available' && (
                          <>
                            <Button size="sm" className="luxury-button flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Find Tenant
                            </Button>
                            <Button size="sm" variant="outline" className="luxury-button-secondary">
                              List Property
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {!alert.is_read && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="luxury-button-secondary"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-text-muted hover:text-text-primary"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
