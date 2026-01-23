'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  DollarSign,
  Plus,
  Filter
} from 'lucide-react'
import { supabase, paymentsAPI } from '@/lib/supabase'
import LogPaymentModal from './LogPaymentModal'

interface Payment {
  id: string
  tenant_id: string
  room_id: string
  amount: number
  payment_date: string
  due_date: string
  status: 'paid' | 'pending' | 'overdue'
  payment_method?: string
  created_at: string
  tenants?: {
    name: string
  }
  rooms?: {
    name: string
  }
}

export default function PaymentTracking() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [showLogPayment, setShowLogPayment] = useState(false)

  useEffect(() => {
    loadPayments()
    
    // Set up real-time subscription
    const paymentSubscription = supabase
      .channel('payment_tracking_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'payments' },
        () => loadPayments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(paymentSubscription)
    }
  }, [])

  const loadPayments = async () => {
    try {
      setLoading(true)
      const { data } = await paymentsAPI.getAll()
      setPayments(data || [])
    } catch (error) {
      console.error('Error loading payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesFilter = filterStatus === 'all' || payment.status === filterStatus
    const matchesMonth = payment.due_date.startsWith(selectedMonth)
    return matchesFilter && matchesMonth
  })

  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const pendingRevenue = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
  const overdueRevenue = payments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-success/20 text-success border border-success/30'
      case 'pending': return 'bg-warning/20 text-warning border border-warning/30'
      case 'overdue': return 'bg-error/20 text-error border border-error/30'
      default: return ''
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      case 'overdue': return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  const getPaymentDayColor = (dueDate: string) => {
    const day = new Date(dueDate).getDate()
    if (day === 15) return 'text-primary'
    if (day === 25) return 'text-warning'
    if (day > 25) return 'text-success'
    return 'text-text-secondary'
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gradient mb-2">Payment Tracking</h1>
        <p className="text-text-secondary">Monitor rent payments and manage payment schedules</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-success">R{totalRevenue.toLocaleString()}</p>
                <p className="text-success text-xs mt-1">This month</p>
              </div>
              <div className="bg-success/20 p-3 rounded-xl">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Pending</p>
                <p className="text-2xl font-bold text-warning">R{pendingRevenue.toLocaleString()}</p>
                <p className="text-text-muted text-xs mt-1">{payments.filter(p => p.status === 'pending').length} payments</p>
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
                <p className="text-text-secondary text-sm mb-1">Overdue</p>
                <p className="text-2xl font-bold text-error">R{overdueRevenue.toLocaleString()}</p>
                <p className="text-error text-xs mt-1">{payments.filter(p => p.status === 'overdue').length} overdue</p>
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
                <p className="text-text-secondary text-sm mb-1">Collection Rate</p>
                <p className="text-2xl font-bold text-primary">
                  {payments.length > 0 ? Math.round((payments.filter(p => p.status === 'paid').length / payments.length) * 100) : 0}%
                </p>
                <p className="text-success text-xs mt-1">+5% from last month</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule Overview */}
      <Card className="luxury-card mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-white" />
            Payment Schedule Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-2xl font-bold text-primary">15th</p>
              <p className="text-sm text-primary">Mid-month payments</p>
              <p className="text-xs text-text-muted mt-1">{payments.filter(p => new Date(p.due_date).getDate() === 15).length} tenants</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-warning/10 border border-warning/20">
              <p className="text-2xl font-bold text-warning">25th</p>
              <p className="text-sm text-warning">Late-month payments</p>
              <p className="text-xs text-text-muted mt-1">{payments.filter(p => new Date(p.due_date).getDate() === 25).length} tenants</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-success/10 border border-success/20">
              <p className="text-2xl font-bold text-success">Month End</p>
              <p className="text-sm text-success">End-of-month payments</p>
              <p className="text-xs text-text-muted mt-1">{payments.filter(p => new Date(p.due_date).getDate() > 25).length} tenants</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="luxury-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <Button onClick={() => setShowLogPayment(true)} className="luxury-button flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Log Payment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payments ({filteredPayments.length})</span>
            <Button variant="outline" className="luxury-button-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Export Report
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="luxury-card p-4 hover:bg-surface-light transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-text-primary">{payment.tenants?.name || 'Unknown Tenant'}</h3>
                      <Badge className={`flex items-center gap-1 ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                      <span className={`text-sm font-medium ${getPaymentDayColor(payment.due_date)}`}>
                        {new Date(payment.due_date).getDate() === 15 ? '15th' : 
                         new Date(payment.due_date).getDate() === 25 ? '25th' : 'Month End'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Room:</span>
                        <span className="ml-2 text-text-primary">{payment.rooms?.name || 'Unknown Room'}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Amount:</span>
                        <span className="ml-2 text-text-primary font-medium">R{payment.amount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Due Date:</span>
                        <span className="ml-2 text-text-primary">{new Date(payment.due_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Payment:</span>
                        <span className="ml-2 text-text-primary">
                          {payment.payment_method || 'Not received'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {payment.status === 'pending' && (
                      <Button size="sm" className="luxury-button">
                        Mark Paid
                      </Button>
                    )}
                    {payment.status === 'overdue' && (
                      <Button size="sm" className="luxury-button">
                        Send Reminder
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="luxury-button-secondary">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Log Payment Modal */}
      {showLogPayment && (
        <LogPaymentModal
          isOpen={showLogPayment}
          onClose={() => setShowLogPayment(false)}
          onSuccess={() => {
            setShowLogPayment(false)
            loadPayments()
          }}
        />
      )}
    </div>
  )
}
