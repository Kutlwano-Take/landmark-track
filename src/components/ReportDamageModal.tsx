'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, AlertTriangle, Home } from 'lucide-react'
import { supabase, roomsAPI } from '@/lib/supabase'

interface ReportDamageModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  roomId?: string
}

export default function ReportDamageModal({ isOpen, onClose, onSuccess, roomId }: ReportDamageModalProps) {
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [formData, setFormData] = useState({
    room_id: roomId || '',
    damage_description: '',
    damage_type: 'water_leak',
    urgency: 'medium',
  })

  useEffect(() => {
    if (isOpen) {
      loadRooms()
      if (roomId) {
        setFormData(prev => ({ ...prev, room_id: roomId }))
      }
    }
  }, [isOpen, roomId])

  const loadRooms = async () => {
    try {
      const { data } = await roomsAPI.getAll()
      setRooms(data || [])
    } catch (error) {
      console.error('Error loading rooms:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update room status to damaged
      const updateData: any = {
        status: 'damaged',
        damage_description: formData.damage_description,
        damage_reported_at: new Date().toISOString(),
      }

      if (formData.damage_type) {
        updateData.damage_type = formData.damage_type
      }

      const { error } = await roomsAPI.update(formData.room_id, updateData)
      
      if (error) throw error

      // Create alert for damage report
      const { error: alertError } = await supabase
        .from('alerts')
        .insert({
          type: 'damage_report',
          title: 'Room Damage Reported',
          message: `Room damage reported: ${formData.damage_description}`,
          room_id: formData.room_id,
          is_read: false,
        })

      if (alertError) throw alertError

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        room_id: '',
        damage_description: '',
        damage_type: 'water_leak',
        urgency: 'medium',
      })
    } catch (error) {
      console.error('Error reporting damage:', error)
      alert('Error reporting damage. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      room_id: '',
      damage_description: '',
      damage_type: 'water_leak',
      urgency: 'medium',
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
              <AlertTriangle className="w-5 h-5 text-warning" />
              Report Damage
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="damage_type">Damage Type *</Label>
              <Select value={formData.damage_type} onValueChange={(value) => setFormData({ ...formData, damage_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="water_leak">Water Leak</SelectItem>
                  <SelectItem value="electrical">Electrical Issue</SelectItem>
                  <SelectItem value="plumbing">Plumbing Problem</SelectItem>
                  <SelectItem value="structural">Structural Damage</SelectItem>
                  <SelectItem value="appliance">Appliance Damage</SelectItem>
                  <SelectItem value="furniture">Furniture Damage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency">Urgency Level *</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention</SelectItem>
                  <SelectItem value="high">High - Urgent repair needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damage_description">Damage Description *</Label>
              <Textarea
                id="damage_description"
                value={formData.damage_description}
                onChange={(e) => setFormData({ ...formData, damage_description: e.target.value })}
                placeholder="Describe the damage in detail..."
                rows={3}
                required
              />
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Important:</p>
                  <p className="text-text-muted">
                    This will mark the room as "damaged" and unavailable for new tenants until repairs are completed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button">
                {loading ? 'Reporting...' : 'Report Damage'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
