'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, User, Mail, Phone, DollarSign } from 'lucide-react'
import { supabase, tenantsAPI, roomsAPI } from '@/lib/supabase'

interface AddTenantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    monthly_rent: '',
    payment_day: '15',
    room_id: '',
  })
  const [availableRooms, setAvailableRooms] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      loadAvailableRooms()
    }
  }, [isOpen])

  const loadAvailableRooms = async () => {
    try {
      const { data } = await roomsAPI.getAll()
      const available = data?.filter(room => room.status === 'available') || []
      setAvailableRooms(available)
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create tenant
      const { data: tenant, error: tenantError } = await tenantsAPI.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        monthly_rent: parseFloat(formData.monthly_rent),
        payment_day: formData.payment_day as any,
      })

      if (tenantError) throw tenantError

      // If room is selected, assign tenant to room
      if (formData.room_id && formData.room_id !== 'none' && tenant?.[0]?.id) {
        await roomsAPI.update(formData.room_id, {
          tenant_id: tenant[0].id,
          status: 'secured'
        })

        // Update tenant with room_id
        await tenantsAPI.update(tenant[0].id, {
          room_id: formData.room_id
        })
      }

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        monthly_rent: '',
        payment_day: '15' as '15' | '25' | 'month_end',
        room_id: '',
      })
    } catch (error) {
      console.error('Error adding tenant:', error)
      alert('Error adding tenant. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      monthly_rent: '',
      payment_day: '15' as '15' | '25' | 'month_end',
      room_id: '',
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
              <User className="w-5 h-5 text-primary" />
              Add New Tenant
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tenant's full name"
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tenant@example.com"
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+27 83 123 4567"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="monthly_rent" className="text-sm">Monthly Rent (R) *</Label>
              <Input
                id="monthly_rent"
                type="number"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                placeholder="2500.00"
                required
                min="0"
                step="0.01"
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="payment_day" className="text-sm">Payment Day *</Label>
              <Select value={formData.payment_day} onValueChange={(value) => setFormData({ ...formData, payment_day: value as '15' | '25' | 'month_end' })}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select payment day" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem className="luxury-select-item" value="15">15th of month</SelectItem>
                  <SelectItem className="luxury-select-item" value="25">25th of month</SelectItem>
                  <SelectItem className="luxury-select-item" value="month_end">End of month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="room_id" className="text-sm">Assign Room (Optional)</Label>
              <Select value={formData.room_id} onValueChange={(value) => setFormData({ ...formData, room_id: value })}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select available room" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem className="luxury-select-item" value="none">No room assignment</SelectItem>
                  {availableRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id} className="luxury-select-item">
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <User className="w-3 h-3 text-warning mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-warning">Note:</p>
                  <p className="text-text-muted">
                    If you assign a room, it will be marked as "secured" and unavailable for other tenants.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary text-sm py-2">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button text-sm py-2">
                {loading ? 'Adding...' : 'Add Tenant'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
