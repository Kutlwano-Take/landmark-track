'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Search, 
  Filter, 
  Home, 
  User, 
  AlertTriangle,
  Trash2,
  X
} from 'lucide-react'
import { supabase, roomsAPI } from '@/lib/supabase'

interface Room {
  id: string
  name: string
  status: 'available' | 'secured' | 'damaged'
  tenant_id?: string
  property_id: string
  created_at: string
  updated_at: string
  damage_description?: string
  damage_reported_at?: string
  tenants?: {
    name: string
  }
}

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'secured' | 'damaged'>('all')
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null)
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    status: 'available' as 'available' | 'secured' | 'damaged',
    rent: ''
  })

  useEffect(() => {
    loadRooms()
    
    // Set up real-time subscription
    const roomSubscription = supabase
      .channel('room_management_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          console.log('Real-time room change detected:', payload)
          console.log('Event type:', payload.eventType)
          console.log('Room ID:', payload.new?.id || payload.old?.id)
          
          if (payload.eventType === 'DELETE') {
            console.log('Room deleted - refreshing room list')
          } else if (payload.eventType === 'INSERT') {
            console.log('Room added - refreshing room list')
          } else if (payload.eventType === 'UPDATE') {
            console.log('Room updated - refreshing room list')
          }
          
          loadRooms()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomSubscription)
    }
  }, [])

  const loadRooms = async () => {
    try {
      console.log('Loading rooms...')
      setLoading(true)
      const { data } = await roomsAPI.getAll()
      console.log('Rooms loaded:', data)
      setRooms(data || [])
    } catch (error) {
      console.error('Error loading rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRoom = async () => {
    try {
      // Validate required fields
      if (!newRoomData.name.trim()) {
        alert('Please enter a room name')
        return
      }

      console.log('Adding room:', newRoomData)
      
      // Get or create default property
      let propertyId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Try to get the first property, otherwise use default
      const { data: properties } = await supabase
        .from('properties')
        .select('id')
        .limit(1)
      
      if (properties && properties.length > 0) {
        propertyId = properties[0].id
      }
      
      const { data, error } = await roomsAPI.create({
        name: newRoomData.name,
        status: newRoomData.status,
        property_id: propertyId
      })
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      console.log('Room created successfully:', data)
      
      // Reset form and close modal
      setNewRoomData({ name: '', status: 'available', rent: '' })
      setShowAddRoom(false)
      
      // The real-time subscription will automatically update the rooms list
    } catch (error) {
      console.error('Error adding room:', error)
      let errorMessage = 'Error adding room. Please try again.'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`
      }
      alert(errorMessage)
    }
  }

  const handleStatusUpdate = async () => {
    if (!selectedRoom) return
    
    try {
      console.log('Updating room status:', selectedRoom.id, 'to:', selectedRoom.status)
      
      const { data, error } = await roomsAPI.update(selectedRoom.id, {
        status: selectedRoom.status
      })
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      console.log('Room status updated successfully:', data)
      
      // Close modal and reset selection
      setShowStatusModal(false)
      setSelectedRoom(null)
      
      // The real-time subscription will automatically update the rooms list
      // and the dashboard will also update through its own real-time subscription
    } catch (error) {
      console.error('Error updating room status:', error)
      let errorMessage = 'Error updating room status. Please try again.'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`
      }
      alert(errorMessage)
    }
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return
    
    try {
      console.log('Deleting room:', roomToDelete.id, roomToDelete.name)
      
      const { error } = await roomsAPI.delete(roomToDelete.id)
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      console.log('Room deleted successfully - refreshing page')
      
      // Close modal and reset selection
      setShowDeleteConfirm(false)
      setRoomToDelete(null)
      
      // Automatically refresh the page to show the room has been removed
      setTimeout(() => {
        // Use current URL to avoid 404 errors
        window.location.reload()
      }, 500)
      
    } catch (error) {
      console.error('Error deleting room:', error)
      let errorMessage = 'Error deleting room. Please try again.'
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Error: ${error.message}`
      }
      alert(errorMessage)
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.tenants?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || room.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'status-available'
      case 'secured': return 'status-secured'
      case 'damaged': return 'status-damaged'
      default: return ''
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <Home className="w-3 h-3" />
      case 'secured': return <User className="w-3 h-3" />
      case 'damaged': return <AlertTriangle className="w-3 h-3" />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif text-gradient mb-2">Room Management</h1>
        <p className="text-text-secondary">Monitor and manage your property portfolio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Rooms</p>
                <p className="text-2xl font-bold">{rooms.length}</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <Home className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Available</p>
                <p className="text-2xl font-bold text-success">{rooms.filter(r => r.status === 'available').length}</p>
              </div>
              <div className="bg-success/20 p-3 rounded-xl">
                <Home className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Secured</p>
                <p className="text-2xl font-bold text-primary">{rooms.filter(r => r.status === 'secured').length}</p>
              </div>
              <div className="bg-primary/20 p-3 rounded-xl">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Damaged</p>
                <p className="text-2xl font-bold text-warning">{rooms.filter(r => r.status === 'damaged').length}</p>
              </div>
              <div className="bg-warning/20 p-3 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="luxury-card mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search rooms, tenants, or properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:border-primary text-text-primary"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="secured">Secured</option>
                <option value="damaged">Damaged</option>
              </select>
              
              <Button onClick={() => setShowAddRoom(true)} className="luxury-button flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Room
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms List */}
      <Card className="luxury-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rooms ({filteredRooms.length})</span>
            <Button variant="outline" className="luxury-button-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced Filters
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRooms.map((room) => (
              <div key={room.id} className="luxury-card p-4 hover:bg-surface-light transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-text-primary">{room.name}</h3>
                      <Badge className={`status-badge ${getStatusColor(room.status)} flex items-center gap-1`}>
                        {getStatusIcon(room.status)}
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Tenant:</span>
                        <span className="ml-2 text-text-primary">
                          {room.tenants?.name || 'No tenant'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Status:</span>
                        <span className="ml-2 text-text-primary">
                          {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Property:</span>
                        <span className="ml-2 text-text-primary">Sunset Apartments</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="luxury-button-secondary"
                      onClick={() => {
                        setSelectedRoom(room)
                        setShowStatusModal(true)
                      }}
                    >
                      Update Status
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-danger hover:bg-danger/10 hover:text-danger p-1 border border-white/20"
                      onClick={() => {
                        setRoomToDelete(room)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Room Modal */}
      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="luxury-card w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Add New Room
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAddRoom(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="room-name" className="text-sm">Room Name *</Label>
                <Input
                  id="room-name"
                  value={newRoomData.name}
                  onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                  placeholder="e.g., Room 101"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="room-status" className="text-sm">Status *</Label>
                <Select value={newRoomData.status} onValueChange={(value) => setNewRoomData({ ...newRoomData, status: value as 'available' | 'secured' | 'damaged' })}>
                  <SelectTrigger className="luxury-select h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="luxury-select-content">
                    <SelectItem className="luxury-select-item" value="available">Available</SelectItem>
                    <SelectItem className="luxury-select-item" value="secured">Secured</SelectItem>
                    <SelectItem className="luxury-select-item" value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddRoom(false)} className="luxury-button-secondary text-sm py-2">
                  Cancel
                </Button>
                <Button onClick={handleAddRoom} className="luxury-button text-sm py-2">
                  Add Room
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="luxury-card w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  Update Room Status
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowStatusModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-text-muted mb-2">Room: {selectedRoom.name}</p>
                <Label htmlFor="status-update" className="text-sm">New Status *</Label>
                <Select value={selectedRoom.status} onValueChange={(value) => setSelectedRoom({ ...selectedRoom, status: value as 'available' | 'secured' | 'damaged' })}>
                  <SelectTrigger className="luxury-select h-9">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="luxury-select-content">
                    <SelectItem className="luxury-select-item" value="available">Available</SelectItem>
                    <SelectItem className="luxury-select-item" value="secured">Secured</SelectItem>
                    <SelectItem className="luxury-select-item" value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="luxury-button-secondary text-sm py-2">
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} className="luxury-button text-sm py-2">
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && roomToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="luxury-card w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-danger" />
                  Delete Room
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-text-muted mb-2">
                  Are you sure you want to delete this room?
                </p>
                <div className="p-3 bg-surface/50 rounded-lg">
                  <p className="font-medium">{roomToDelete.name}</p>
                  <p className="text-sm text-text-muted">
                    Status: {roomToDelete.status.charAt(0).toUpperCase() + roomToDelete.status.slice(1)}
                  </p>
                </div>
                <p className="text-xs text-danger mt-2">
                  This action cannot be undone. All associated data will be permanently deleted.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="luxury-button-secondary text-sm py-2">
                  Cancel
                </Button>
                <Button onClick={handleDeleteRoom} className="bg-danger hover:bg-danger/90 text-white text-sm py-2 border border-white/30">
                  Delete Room
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
