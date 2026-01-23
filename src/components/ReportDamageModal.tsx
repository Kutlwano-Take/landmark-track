'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, AlertTriangle, Home } from 'lucide-react'
import { supabase, roomsAPI, alertsAPI } from '@/lib/supabase'

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
      // Validate required fields
      if (!formData.room_id) {
        throw new Error('Please select a room')
      }
      
      if (!formData.damage_description || formData.damage_description.trim() === '') {
        throw new Error('Please provide a damage description')
      }

      console.log('Submitting damage report for room:', formData.room_id)
      console.log('Damage description:', formData.damage_description)

      // Update room status to damaged
      const updateData: any = {
        status: 'damaged',
        damage_description: formData.damage_description,
        damage_reported_at: new Date().toISOString(),
      }

      console.log('Update data being sent:', updateData)

      const { error } = await roomsAPI.update(formData.room_id, updateData)
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Room updated successfully')

      // Alert is automatically created by database trigger when room status changes to 'damaged'
      // No need to manually create alert here

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
      console.error('Form data:', formData)
      console.error('Update data:', {
        status: 'damaged',
        damage_description: formData.damage_description,
        damage_reported_at: new Date().toISOString(),
        damage_type: formData.damage_type
      })
      
      // More detailed error message
      let errorMessage = 'Error reporting damage. Please try again.'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`
      }
      
      alert(errorMessage)
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
      <Card className="luxury-card w-full max-w-sm">
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
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="damage_type" className="text-sm">Damage Type (for reference)</Label>
              <Select value={formData.damage_type} onValueChange={(value) => setFormData({ ...formData, damage_type: value })}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="water_leak" className="luxury-select-item">Water Leak</SelectItem>
                  <SelectItem value="electrical" className="luxury-select-item">Electrical Issue</SelectItem>
                  <SelectItem value="plumbing" className="luxury-select-item">Plumbing Problem</SelectItem>
                  <SelectItem value="structural" className="luxury-select-item">Structural Damage</SelectItem>
                  <SelectItem value="appliance" className="luxury-select-item">Appliance Damage</SelectItem>
                  <SelectItem value="furniture" className="luxury-select-item">Furniture Damage</SelectItem>
                  <SelectItem value="other" className="luxury-select-item">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgency" className="text-sm">Urgency Level *</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
                <SelectTrigger className="luxury-select h-9">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent className="luxury-select-content">
                  <SelectItem value="low" className="luxury-select-item">Low - Minor issue</SelectItem>
                  <SelectItem value="medium" className="luxury-select-item">Medium - Needs attention</SelectItem>
                  <SelectItem value="high" className="luxury-select-item">High - Urgent repair needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damage_description" className="text-sm">Damage Description *</Label>
              <Textarea
                id="damage_description"
                value={formData.damage_description}
                onChange={(e) => setFormData({ ...formData, damage_description: e.target.value })}
                placeholder="Describe the damage in detail..."
                rows={3}
                required
                className="resize-none"
              />
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-warning mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-warning">Note:</p>
                  <p className="text-text-muted">
                    This will mark the room as "damaged" and create an alert in the Alert Center.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="luxury-button-secondary text-sm py-2">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="luxury-button text-sm py-2">
                {loading ? 'Reporting...' : 'Report Damage'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
