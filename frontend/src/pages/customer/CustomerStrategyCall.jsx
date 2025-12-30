import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Video,
  CreditCard,
  Star,
  User,
  Mail,
  Phone,
  MessageSquare,
  History,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CustomerStrategyCall = () => {
  const navigate = useNavigate();
  const { user, token, getAuthHeader } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [pricing, setPricing] = useState({ price: 699, formatted: 'R 699.00' });
  
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    topic: '',
    notes: ''
  });

  const isElite = user?.active_tier === 'tier-3';

  useEffect(() => {
    fetchAvailableSlots();
    fetchMyBookings();
    fetchPricing();
  }, [currentWeekStart]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.full_name || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  const fetchPricing = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pricing`);
      if (response.ok) {
        const data = await response.json();
        if (data.strategy_call) {
          setPricing({
            price: data.strategy_call.price,
            formatted: `R ${data.strategy_call.price.toLocaleString()}`
          });
        }
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    setLoading(true);
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
      toast({
        title: "Error",
        description: "Failed to load available slots. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    if (!token) return;
    setLoadingBookings(true);
    try {
      const response = await fetch(`${API_URL}/api/booking/my-bookings`, {
        headers: getAuthHeader()
      });
      if (response.ok) {
        const data = await response.json();
        setMyBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    if (newDate >= new Date()) {
      setCurrentWeekStart(newDate);
    }
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const handleSelectSlot = (date, time) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleProceedToDetails = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Select a slot",
        description: "Please select a date and time for your strategy call.",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and email.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/booking/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          ...formData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setBookingInfo(data);
        setStep(3);
        
        if (data.is_paid) {
          toast({
            title: "Booking Confirmed!",
            description: "Your strategy call has been scheduled.",
          });
          fetchMyBookings();
        }
      } else {
        const error = await response.json();
        toast({
          title: "Booking failed",
          description: error.detail || "Failed to create booking. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingInfo?.booking_id) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/api/booking/${bookingInfo.booking_id}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.redirect_url) {
          localStorage.setItem('pending_booking_payment', JSON.stringify({
            bookingId: bookingInfo.booking_id,
            checkoutId: data.checkout_id
          }));
          window.location.href = data.redirect_url;
        }
      } else {
        toast({
          title: "Payment failed",
          description: "Failed to initiate payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const checkPaymentReturn = async () => {
      const pendingPayment = localStorage.getItem('pending_booking_payment');
      if (pendingPayment && window.location.search.includes('success')) {
        const { bookingId, checkoutId } = JSON.parse(pendingPayment);
        localStorage.removeItem('pending_booking_payment');
        
        try {
          const response = await fetch(
            `${API_URL}/api/booking/${bookingId}/confirm-payment?checkout_id=${checkoutId}`,
            { method: 'POST' }
          );
          
          if (response.ok) {
            const data = await response.json();
            setBookingInfo({ ...data, is_paid: true });
            setStep(3);
            fetchMyBookings();
            toast({
              title: "Payment Successful!",
              description: "Your strategy call is confirmed.",
            });
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
        }
      }
    };
    
    checkPaymentReturn();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status, isPaid) => {
    if (status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    }
    if (status === 'confirmed' && isPaid) {
      return <Badge className="bg-green-100 text-green-700">Confirmed</Badge>;
    }
    if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-700">Pending Payment</Badge>;
    }
    if (status === 'completed') {
      return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
  };

  const upcomingBookings = myBookings.filter(b => 
    b.status === 'confirmed' && new Date(b.date) >= new Date()
  );

  const pastBookings = myBookings.filter(b => 
    b.status === 'completed' || new Date(b.date) < new Date()
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Strategy Call Booking</h1>
        </div>
        <p className="text-gray-600">
          Book a 30-minute one-on-one career strategy session with our experts.
        </p>
        
        {/* Pricing Info */}
        <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
          {isElite ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-700 font-medium">Included in your Executive Elite plan</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-800">{pricing.formatted}</span>
              <span className="text-amber-600">per session</span>
            </>
          )}
        </div>
      </div>

      {/* My Bookings Section */}
      {myBookings.length > 0 && step === 1 && (
        <Card className="mb-8 border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              My Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Upcoming</h4>
                <div className="space-y-2">
                  {upcomingBookings.map(booking => (
                    <div key={booking.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Video className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{formatShortDate(booking.date)} at {booking.time}</p>
                          <p className="text-sm text-gray-500">{booking.topic || 'Strategy Call'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status, booking.is_paid)}
                        {booking.meeting_link && (
                          <a 
                            href={booking.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-amber-600 hover:underline"
                          >
                            Join Call
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {myBookings.filter(b => b.status === 'pending').length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Pending Payment</h4>
                <div className="space-y-2">
                  {myBookings.filter(b => b.status === 'pending').map(booking => (
                    <div key={booking.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-medium">{formatShortDate(booking.date)} at {booking.time}</p>
                          <p className="text-sm text-gray-500">Payment required to confirm</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => {
                          setBookingInfo({ booking_id: booking.id, is_paid: false });
                          setSelectedDate(booking.date);
                          setSelectedTime(booking.time);
                          setStep(3);
                        }}
                      >
                        Complete Payment
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Slot */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Date & Time
            </CardTitle>
            <CardDescription>
              Choose an available slot that works for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevWeek}
                disabled={currentWeekStart <= new Date()}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="font-medium">
                {currentWeekStart.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No available slots in this period.</p>
                <p className="text-sm">Try selecting a different week.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSlots.map((day) => (
                  <div key={day.date} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">{day.day_name}</span>
                      <span className="text-gray-500">
                        {new Date(day.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {day.slots.map((slot) => (
                        <button
                          key={`${day.date}-${slot.time}`}
                          onClick={() => handleSelectSlot(day.date, slot.time)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            selectedDate === day.date && selectedTime === slot.time
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white hover:bg-amber-50 hover:border-amber-300'
                          }`}
                        >
                          <Clock className="h-3 w-3 inline mr-1" />
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Slot Summary */}
            {selectedDate && selectedTime && (
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="font-medium text-amber-800">
                  Selected: {formatDate(selectedDate)} at {selectedTime}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleProceedToDetails}
                disabled={!selectedDate || !selectedTime}
                className="bg-amber-500 hover:bg-amber-600"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Enter Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Booking Details
            </CardTitle>
            <CardDescription>
              Tell us what you'd like to discuss
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Selected slot:</strong> {formatDate(selectedDate)} at {selectedTime}
              </p>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    placeholder="+27 XX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="topic">What would you like to discuss? *</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="topic"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="pl-10 min-h-[100px]"
                    placeholder="E.g., Career transition advice, CV review, interview preparation..."
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any other information you'd like us to know..."
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      {isElite ? 'Confirm Booking' : 'Continue to Payment'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment/Confirmation */}
      {step === 3 && (
        <Card>
          <CardContent className="p-8">
            {bookingInfo?.is_paid ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                  Your strategy call has been scheduled.
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <span>{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <span>{selectedTime} (30 minutes)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-amber-500" />
                      <span>Video call link will be sent to {formData.email}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                  A confirmation email with meeting details has been sent to your email address.
                </p>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => { setStep(1); setSelectedDate(null); setSelectedTime(null); }}>
                    Book Another
                  </Button>
                  <Button onClick={() => navigate('/dashboard')} className="bg-amber-500 hover:bg-amber-600">
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h2>
                <p className="text-gray-600 mb-6">
                  Pay {pricing.formatted} to confirm your strategy call
                </p>
                
                <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      <span>{formatDate(selectedDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <span>{selectedTime} (30 minutes)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-amber-500" />
                      <span>{formData.name}</span>
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{pricing.formatted}</span>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={handlePayment} 
                    disabled={submitting}
                    className="bg-amber-500 hover:bg-amber-600 px-8"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay {pricing.formatted}
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Secure payment powered by Yoco
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      {step === 1 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <Video className="h-7 w-7 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">Video Call</h3>
            <p className="text-sm text-gray-600">
              Connect via video call from anywhere. Link sent to your email.
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <Clock className="h-7 w-7 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">30 Minutes</h3>
            <p className="text-sm text-gray-600">
              Focused session to address your career questions and goals.
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-sm border">
            <Star className="h-7 w-7 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">Expert Advice</h3>
            <p className="text-sm text-gray-600">
              Get personalised guidance from career professionals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerStrategyCall;
