import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
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
  MessageSquare
} from 'lucide-react';

const StrategyCallBooking = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1); // 1: Select slot, 2: Enter details, 3: Payment/Confirm
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    topic: '',
    notes: ''
  });

  const isElite = user?.active_tier === 'tier-3';
  const priceFormatted = 'R 699.00';

  useEffect(() => {
    fetchAvailableSlots();
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

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const startDate = currentWeekStart.toISOString().split('T')[0];
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/booking/available-slots?start_date=${startDate}&days=14`
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
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/booking/create`, {
        method: 'POST',
        headers,
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
        `${process.env.REACT_APP_BACKEND_URL}/api/booking/${bookingInfo.booking_id}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.redirect_url) {
          // Store booking info for verification on return
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

  // Check for returning from payment
  useEffect(() => {
    const checkPaymentReturn = async () => {
      const pendingPayment = localStorage.getItem('pending_booking_payment');
      if (pendingPayment && window.location.search.includes('success')) {
        const { bookingId, checkoutId } = JSON.parse(pendingPayment);
        localStorage.removeItem('pending_booking_payment');
        
        try {
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/booking/${bookingId}/confirm-payment?checkout_id=${checkoutId}`,
            { method: 'POST' }
          );
          
          if (response.ok) {
            const data = await response.json();
            setBookingInfo({ ...data, is_paid: true });
            setStep(3);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
            <Star className="mr-1 h-3 w-3" />
            Strategy Call Booking
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Book Your 30-Minute Strategy Call
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get personalised career advice from our experts. Available Monday to Friday, 9 AM - 5 PM.
          </p>
          
          {/* Pricing Info */}
          <div className="mt-4 inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
            {isElite ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Included in your Executive Elite plan</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{priceFormatted}</span>
                <span className="text-gray-500">per session</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-12 h-1 ${step > s ? 'bg-amber-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

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
                Your Details
              </CardTitle>
              <CardDescription>
                Tell us a bit about yourself and what you'd like to discuss
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
                  <Label htmlFor="topic">What would you like to discuss?</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="pl-10 min-h-[100px]"
                      placeholder="E.g., Career transition advice, CV review, interview preparation..."
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
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
                // Confirmed Booking
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
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                    </Button>
                    <Button onClick={() => navigate('/')} className="bg-amber-500 hover:bg-amber-600">
                      Back to Home
                    </Button>
                  </div>
                </div>
              ) : (
                // Payment Required
                <div className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-amber-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h2>
                  <p className="text-gray-600 mb-6">
                    Pay {priceFormatted} to confirm your strategy call
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
                      <span>{priceFormatted}</span>
                    </div>
                  </div>

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
                        Pay {priceFormatted}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 mt-4">
                    Secure payment powered by Yoco
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Video className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Video Call</h3>
            <p className="text-sm text-gray-600">
              Connect via video call from anywhere. Link sent to your email.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Clock className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">30 Minutes</h3>
            <p className="text-sm text-gray-600">
              Focused session to address your career questions and goals.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Star className="h-8 w-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-2">Expert Advice</h3>
            <p className="text-sm text-gray-600">
              Get personalised guidance from career professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyCallBooking;
