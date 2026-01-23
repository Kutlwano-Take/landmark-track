'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X, AlertTriangle, CreditCard, Home, Users } from 'lucide-react'
import { supabase, tenantsAPI, roomsAPI, paymentsAPI, alertsAPI } from '@/lib/supabase'

interface AlertCenterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AlertCenterModal({ isOpen, onClose, onSuccess }: AlertCenterModalProps) {
  const [loading, setLoading] = useState(false)
  const [alertType, setAlertType] = useState<'payment_overdue' | 'maintenance'>('payment_overdue')
  const [tenants, setTenants] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [formData, setFormData] = useState({
    tenant_id: '',
    room_id: '',
    title: '',
    message: '',
    urgency: 'medium',
    amount: '',
    due_date: '',
    damage_type: '',
    maintenance_type: 'plumbing'
  })

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [tenantsRes, roomsRes] = await Promise.all([
        tenantsAPI.getAll(),
        roomsAPI.getAll()
      ])
      
      setTenants(tenantsRes.data || [])
      setRooms(roomsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleTenantChange = (tenantId: string) => {
    setFormData({ ...formData, tenant_id: tenantId })
    
    // Auto-select room if tenant has one
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant?.room_id) {
      setFormData(prev => ({ ...prev, room_id: tenant.room_id }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (alertType === 'payment_overdue') {
        if (!formData.tenant_id) {
          throw new Error('Please select a tenant for payment overdue alert')
        }
        if (!formData.amount) {
          throw new Error('Please enter an amount for the payment overdue alert')
        }
      }
      
      if (alertType === 'maintenance' && !formData.room_id) {
        throw new Error('Please select a room for maintenance alert')
      }

      console.log('Creating alert with type:', alertType)
      console.log('Form data:', formData)

      let alertData: any = {
        type: alertType === 'payment_overdue' ? 'late_payment' : 
             alertType === 'maintenance' ? 'damage_report' : alertType, // Map maintenance to damage_report temporarily
        title: formData.title,
        message: formData.message,
        is_read: false,
      }

      // Set room_id if provided
      if (formData.room_id) {
        alertData.room_id = formData.room_id
      }

      // Set tenant_id if provided
      if (formData.tenant_id) {
        alertData.tenant_id = formData.tenant_id
      }

      // Type-specific data
      if (alertType === 'payment_overdue') {
        alertData.title = formData.title || 'Payment Overdue Alert'
        alertData.message = formData.message || `Payment overdue alert for ${tenants.find(t => t.id === formData.tenant_id)?.name || 'tenant'}`
        
        // Include amount and due date in message since they're not separate columns
        let message = alertData.message
        if (formData.amount) {
          message += ` (Amount: R${formData.amount})`
        }
        if (formData.due_date) {
          message += ` (Due: ${formData.due_date})`
        }
        alertData.message = message

        // Also create a payment record with overdue status
        if (formData.tenant_id && formData.amount) {
          const paymentData: any = {
            tenant_id: formData.tenant_id,
            room_id: tenants.find(t => t.id === formData.tenant_id)?.room_id || '',
            amount: parseFloat(formData.amount),
            due_date: formData.due_date || new Date().toISOString().split('T')[0],
            status: 'overdue',
            payment_method: null
          }

          console.log('Creating payment record:', paymentData)
          const { error: paymentError } = await paymentsAPI.create(paymentData)
          
          if (paymentError) {
            console.error('Error creating payment record:', paymentError)
            // Continue with alert creation even if payment creation fails
          } else {
            console.log('Payment record created successfully')
          }
        }
      } else if (alertType === 'maintenance') {
        alertData.title = formData.title || 'Maintenance Alert'
        alertData.message = formData.message || `Maintenance required for room ${rooms.find(r => r.id === formData.room_id)?.name || 'selected'}`
      }

      console.log('Final alert data before creation:', alertData)
      console.log('Alert data keys:', Object.keys(alertData))
      console.log('Alert data values:', Object.values(alertData))

      const { error } = await alertsAPI.create(alertData)
      
      if (error) {
        console.error('Database error:', error)
        console.error('Alert data being sent:', alertData)
        console.error('Form data:', formData)
        throw error
      }

      console.log('Alert created successfully')
      console.log('Alert data:', alertData)
      console.log('Current time:', new Date().toISOString())

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        tenant_id: '',
        room_id: '',
        title: '',
        message: '',
        urgency: 'medium',
        amount: '',
        due_date: '',
        damage_type: '',
        maintenance_type: 'plumbing'
      })
    } catch (error) {
      console.error('Error creating alert:', error)
      console.error('Error details:', {
        alertType,
        formData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // More detailed error message for user
      let errorMessage = 'Error creating alert. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('tenant')) {
          errorMessage = 'Please select a tenant for the payment overdue alert.'
        } else if (error.message.includes('amount')) {
          errorMessage = 'Please enter an amount for the payment overdue alert.'
        } else if (error.message.includes('room')) {
          errorMessage = 'Please select a room for the maintenance alert.'
        } else if (error.message.includes('constraint')) {
          errorMessage = 'Invalid alert type. Please contact support.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      tenant_id: '',
      room_id: '',
      title: '',
      message: '',
      urgency: 'medium',
      amount: '',
      due_date: '',
      damage_type: '',
      maintenance_type: 'plumbing'
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="luxury-card w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Alert Center
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="alert_type" className="text-sm">Alert Type *</Label>
              <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select alert type" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="payment_overdue" className="luxury-select-item">Payment Overdue</SelectItem>
                  <SelectItem value="maintenance" className="luxury-select-item">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {alertType === 'payment_overdue' && (
              <>
                <div>
                  <Label htmlFor="tenant_id" className="text-sm">Tenant *</Label>
                  <Select value={formData.tenant_id} onValueChange={handleTenantChange}>
                    <SelectTrigger className="luxury-select h-9">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent className="luxury-select-content">
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id} className="luxury-select-item">
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-sm">Amount (R)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="2500.00"
                    min="0"
                    step="0.01"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="due_date" className="text-sm">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="h-9"
                  />
                </div>
              </>
            )}

            {alertType === 'maintenance' && (
              <>
                <div>
                  <Label htmlFor="room_id" className="text-sm">Room *</Label>
                  <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })}>
                    <SelectTrigger className="luxury-select h-9">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent className="luxury-select-content">
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id} className="luxury-select-item">
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="title" className="text-sm">Alert Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter alert title"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-sm">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter alert message..."
                rows={3}
                required
                className="resize-none"
              />
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-primary mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-primary">Note:</p>
                  <p className="text-text-muted">
                    {alertType === 'payment_overdue' && 'This will create a payment overdue alert for the selected tenant.'}
                    {alertType === 'maintenance' && 'This will create a maintenance alert for the selected room.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary text-sm py-2">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button text-sm py-2">
                {loading ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
