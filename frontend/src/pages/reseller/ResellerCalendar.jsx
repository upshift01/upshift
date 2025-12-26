import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  Video,
  Check,
  X,
  Loader2,
  RefreshCw,
  MessageSquare
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ResellerCalendar = () => {
  const { getAuthHeader, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [actionLoading, setActionLoading] = useState(null);

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    fetchBookings();
    fetchAvailableSlots();
  }, [currentWeekStart]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const startDate = currentWeekStart.toISOString().split('T')[0];
      const endDate = new Date(currentWeekStart);
      endDate.setDate(endDate.getDate() + 13);
      
      const response = await fetch(
        `${API_URL}/api/reseller/bookings?start_date=${startDate}&end_date=${endDate.toISOString().split('T')[0]}`,
        { headers: getAuthHeader() }
      );
      
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const startDate = currentWeekStart.toISOString().split('T')[0];
      const response = await fetch(
        `${API_URL}/api/booking/available-slots?start_date=${startDate}&days=14`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.available_dates || []);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      setActionLoading(bookingId);
      const response = await fetch(
        `${API_URL}/api/reseller/bookings/${bookingId}/confirm`,
        { 
          method: 'POST',
          headers: getAuthHeader() 
        }
      );
      
      if (response.ok) {
        fetchBookings();
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking(prev => ({ ...prev, status: 'confirmed', is_paid: true }));
        }
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      setActionLoading(bookingId);
      const response = await fetch(
        `${API_URL}/api/reseller/bookings/${bookingId}/cancel`,
        { 
          method: 'POST',
          headers: getAuthHeader() 
        }
      );
      
      if (response.ok) {
        fetchBookings();
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking(prev => ({ ...prev, status: 'cancelled' }));
        }
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status, isPaid) => {
    if (status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    }
    if (status === 'confirmed' && isPaid) {
      return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(currentWeekStart);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30'
  ];

  const getBookingForSlot = (date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.find(b => b.date === dateStr && b.time === time && b.status !== 'cancelled');
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const filteredBookings = bookings.filter(b => {
    if (!statusFilter) return true;
    return b.status === statusFilter;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
          <p className="text-gray-600">Manage your customer bookings</p>
        </div>
        <Button onClick={() => { fetchBookings(); fetchAvailableSlots(); }} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: bookings.length, color: 'blue' },
          { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'green' },
          { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'yellow' },
          { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'red' }
        ].map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar / List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {viewMode === 'week' ? 'Week Calendar' : 'Booking List'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[150px] text-center">
                    {currentWeekStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : viewMode === 'week' ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 border-b">
                      <div className="p-2 text-sm font-medium text-gray-500">Time</div>
                      {weekDays.map((day, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2 text-center border-l ${isWeekend(day) ? 'bg-gray-50' : ''}`}
                        >
                          <p className="text-xs text-gray-500">{day.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                          <p className={`text-lg font-semibold ${day.toDateString() === new Date().toDateString() ? 'text-purple-600' : ''}`}>
                            {day.getDate()}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Time Slots */}
                    <div className="max-h-[500px] overflow-y-auto">
                      {timeSlots.map((time) => (
                        <div key={time} className="grid grid-cols-8 border-b">
                          <div className="p-2 text-sm text-gray-500 border-r bg-gray-50">
                            {time}
                          </div>
                          {weekDays.map((day, dayIdx) => {
                            const booking = getBookingForSlot(day, time);
                            const weekend = isWeekend(day);
                            
                            return (
                              <div
                                key={dayIdx}
                                className={`p-1 border-l min-h-[40px] ${weekend ? 'bg-gray-100' : ''}`}
                              >
                                {booking && (
                                  <div
                                    className={`p-1 rounded text-xs cursor-pointer transition-colors ${
                                      booking.status === 'confirmed' 
                                        ? 'bg-green-100 hover:bg-green-200 text-green-800' 
                                        : booking.status === 'pending'
                                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                    }`}
                                    onClick={() => setSelectedBooking(booking)}
                                  >
                                    <p className="font-medium truncate">{booking.name}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* List View */
                <div className="space-y-3">
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No bookings found</p>
                    </div>
                  ) : (
                    filteredBookings.sort((a, b) => new Date(a.date) - new Date(b.date)).map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedBooking?.id === booking.id ? 'border-purple-500 bg-purple-50' : ''
                        }`}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{booking.name}</h3>
                              {getStatusBadge(booking.status, booking.is_paid)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {formatDate(booking.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {booking.time}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {booking.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmBooking(booking.id);
                                }}
                                disabled={actionLoading === booking.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            {booking.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelBooking(booking.id);
                                }}
                                disabled={actionLoading === booking.id}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Details */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedBooking ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a booking to view details</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    {getStatusBadge(selectedBooking.status, selectedBooking.is_paid)}
                    <span className="text-sm text-gray-500">
                      R {(selectedBooking.amount_cents || 0) / 100}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CalendarIcon className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">{formatDate(selectedBooking.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-purple-500" />
                      <span>{selectedBooking.time} (30 min)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">Contact</h4>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{selectedBooking.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${selectedBooking.email}`} className="text-purple-600 hover:underline">
                        {selectedBooking.email}
                      </a>
                    </div>
                    {selectedBooking.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedBooking.phone}</span>
                      </div>
                    )}
                  </div>

                  {selectedBooking.topic && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Topic</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedBooking.topic}
                      </p>
                    </div>
                  )}

                  {selectedBooking.meeting_link && selectedBooking.status === 'confirmed' && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Meeting Link</h4>
                      <a 
                        href={selectedBooking.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-purple-600 hover:underline"
                      >
                        <Video className="h-4 w-4" />
                        Join Meeting
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    {selectedBooking.status === 'pending' && (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleConfirmBooking(selectedBooking.id)}
                        disabled={actionLoading === selectedBooking.id}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirm
                      </Button>
                    )}
                    {selectedBooking.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelBooking(selectedBooking.id)}
                        disabled={actionLoading === selectedBooking.id}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResellerCalendar;
