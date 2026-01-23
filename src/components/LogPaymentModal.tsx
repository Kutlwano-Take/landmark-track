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
      }

      const { error } = await paymentsAPI.create(paymentData)
      
      if (error) throw error

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
      <Card className="luxury-card w-full max-w-md">
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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tenant_id">Tenant *</Label>
              <Select value={formData.tenant_id} onValueChange={handleTenantChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="room_id">Room *</Label>
              <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount (R) *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="2500.00"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                placeholder="2024-01-15"
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="electronic">EFT</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button">
                {loading ? 'Logging...' : 'Log Payment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
