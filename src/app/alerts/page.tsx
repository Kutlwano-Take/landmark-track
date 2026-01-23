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
  Filter
} from 'lucide-react'
import { supabase, alertsAPI } from '@/lib/supabase'

interface Alert {
  id: string
  type: 'late_payment' | 'damage_report' | 'maintenance'
  title: string
  message: string
  room_id?: string
  tenant_id?: string
  is_read: boolean
  created_at: string
  rooms?: {
    name: string
  }
  tenants?: {
    name: string
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'late_payment' | 'damage_report' | 'maintenance'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showAlertDetails, setShowAlertDetails] = useState(false)

  useEffect(() => {
    loadAlerts()
    
    // Set up real-time subscription
    const alertSubscription = supabase
      .channel('alerts_page_changes')
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

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await alertsAPI.delete(alertId)
      loadAlerts()
      if (showAlertDetails && selectedAlert?.id === alertId) {
        setShowAlertDetails(false)
      }
    } catch (error) {
      console.error('Error deleting alert:', error)
    }
  }

  const handleViewAlertDetails = (alert: Alert) => {
    setSelectedAlert(alert)
    setShowAlertDetails(true)
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadAlerts = alerts.filter(alert => !alert.is_read)
      await Promise.all(unreadAlerts.map(alert => alertsAPI.markAsRead(alert.id)))
      loadAlerts()
    } catch (error) {
      console.error('Error marking all alerts as read:', error)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = filterType === 'all' || alert.type === filterType
    return matchesType
  })

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'late_payment': return 'bg-error/20 text-error border border-error/30'
      case 'damage_report': return 'bg-warning/20 text-warning border border-warning/30'
      case 'maintenance': return 'bg-info/20 text-info border border-info/30'
      default: return ''
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'late_payment': return <CreditCard className="w-4 h-4" />
      case 'damage_report': return <AlertTriangle className="w-4 h-4" />
      case 'maintenance': return <Home className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const unreadCount = alerts.filter(alert => !alert.is_read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">Loading alerts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-serif text-gradient mb-2">Alert Center</h1>
          <p className="text-text-secondary">Manage all your property alerts and notifications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
                <p className="text-text-muted text-xs mt-1">All time</p>
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
                <p className="text-text-secondary text-sm mb-1">Maintenance</p>
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
                <p className="text-text-secondary text-sm mb-1">Late Payments</p>
                <p className="text-2xl font-bold text-error">{alerts.filter(a => a.type === 'late_payment').length}</p>
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
                <p className="text-text-secondary text-sm mb-1">Damage Reports</p>
                <p className="text-2xl font-bold text-warning">{alerts.filter(a => a.type === 'damage_report').length}</p>
                <p className="text-warning text-xs mt-1">Maintenance needed</p>
              </div>
              <div className="bg-warning/20 p-3 rounded-xl">
                <Home className="w-5 h-5 text-warning" />
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
                  <SelectItem value="late_payment">Payment Overdue</SelectItem>
                  <SelectItem value="damage_report">Damage Reports</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button className="luxury-button flex items-center gap-2" onClick={() => alert('Configure Alerts functionality coming soon!')}>
                <Filter className="w-4 h-4" />
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
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Filter className="w-4 h-4" />
              {filterType === 'all' ? 'All Types' : filterType.replace('_', ' ')}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className={`luxury-card p-4 hover:bg-surface-light transition-colors ${!alert.is_read ? 'border-l-4 border-primary' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {getAlertIcon(alert.type)}
                        <h3 className="font-medium text-text-primary">{alert.title}</h3>
                      </div>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(alert.type)}`}>
                        {alert.type.replace('_', ' ')}
                      </Badge>
                      {!alert.is_read && (
                        <Badge className="bg-primary/20 text-primary border border-primary/30">
                          New
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-text-secondary mb-3">{alert.message}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {alert.rooms && (
                        <div>
                          <span className="text-text-muted">Room:</span>
                          <span className="ml-2 text-text-primary">{alert.rooms.name}</span>
                        </div>
                      )}
                      {alert.tenants && (
                        <div>
                          <span className="text-text-muted">Tenant:</span>
                          <span className="ml-2 text-text-primary">{alert.tenants.name}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-text-muted">Created:</span>
                        <span className="ml-2 text-text-primary">
                          {new Date(alert.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="luxury-button-secondary"
                      onClick={() => handleViewAlertDetails(alert)}
                    >
                      View Details
                    </Button>
                    {!alert.is_read && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="luxury-button-secondary"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <p className="text-text-muted">No alerts found</p>
                <p className="text-text-muted text-sm mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <Badge className={`capitalize ${getStatusColor(selectedAlert.type)}`}>
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
              
              {selectedAlert.tenants && (
                <div>
                  <p className="text-sm text-text-muted mb-1">Tenant</p>
                  <p className="text-text-primary">{selectedAlert.tenants.name}</p>
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
                <p className="text-sm text-text-muted mb-1">Status</p>
                <Badge className={selectedAlert.is_read ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                  {selectedAlert.is_read ? 'Read' : 'Unread'}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              {!selectedAlert.is_read && (
                <Button 
                  className="flex-1 luxury-button"
                  onClick={() => handleDeleteAlert(selectedAlert.id)}
                >
                  Delete Alert
                </Button>
              )}
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
