'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, CreditCard, Calendar, DollarSign } from 'lucide-react'
import { supabase, paymentsAPI, tenantsAPI, roomsAPI } from '@/lib/supabase'

interface LogPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LogPaymentModal({ isOpen, onClose, onSuccess }: LogPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    tenant_id: '',
    room_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_method: 'bank_transfer',
  })
  const [tenants, setTenants] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])

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
      const paymentData = {
        tenant_id: formData.tenant_id,
        room_id: formData.room_id,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        due_date: formData.due_date,
        payment_method: formData.payment_method,
        status: 'paid' // Explicitly set status to 'paid' for logged payments
      }

      console.log('Creating payment:', paymentData)
      const { error } = await paymentsAPI.create(paymentData)
      
      if (error) throw error

      console.log('Payment created successfully')
      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        tenant_id: '',
        room_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_method: 'bank_transfer',
      })
    } catch (error) {
      console.error('Error logging payment:', error)
      alert('Error logging payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      tenant_id: '',
      room_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_method: 'bank_transfer',
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
              <CreditCard className="w-5 h-5 text-primary" />
              Log Payment
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <Label htmlFor="amount" className="text-sm">Amount (R) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="2500.00"
                required
                min="0"
                step="0.01"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="payment_date" className="text-sm">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="due_date" className="text-sm">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                placeholder="2024-01-15"
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="payment_method" className="text-sm">Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="bank_transfer" className="luxury-select-item">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card" className="luxury-select-item">Credit Card</SelectItem>
                  <SelectItem value="cash" className="luxury-select-item">Cash</SelectItem>
                  <SelectItem value="electronic" className="luxury-select-item">EFT</SelectItem>
                  <SelectItem value="other" className="luxury-select-item">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CreditCard className="w-3 h-3 text-primary mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-primary">Note:</p>
                  <p className="text-text-muted">
                    Payment will be recorded and automatically update the tenant's payment status.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary text-sm py-2">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button text-sm py-2">
                {loading ? 'Logging...' : 'Log Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
