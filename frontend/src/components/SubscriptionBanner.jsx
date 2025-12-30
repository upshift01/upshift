import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Clock, XCircle, CreditCard } from 'lucide-react';
import { Button } from './ui/button';

const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { user, isSuspended, isSubscriptionExpiringSoon, getDaysUntilExpiry } = useAuth();

  // Don't show banner for admins or reseller admins
  if (!user || user.role !== 'customer') return null;

  // Account is suspended
  if (isSuspended()) {
    return (
      <div className="bg-red-50 border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-800">Account Suspended</p>
                <p className="text-sm text-red-600">
                  Your subscription has expired. Please renew to continue using premium features.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/pricing')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Resubscribe Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Subscription expiring soon (within 7 days)
  if (isSubscriptionExpiringSoon()) {
    const daysLeft = getDaysUntilExpiry();
    const isUrgent = daysLeft <= 3;
    
    return (
      <div className={`${isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 ${isUrgent ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
                {isUrgent ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <Clock className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className={`font-semibold ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
                  Subscription Expiring Soon
                </p>
                <p className={`text-sm ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
                  {daysLeft === 1 
                    ? 'Your subscription expires tomorrow!' 
                    : `Your subscription expires in ${daysLeft} days.`}
                  {' '}Renew now to avoid interruption.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/pricing')}
              className={isUrgent 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Renew Subscription
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
