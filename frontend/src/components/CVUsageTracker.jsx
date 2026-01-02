import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Crown,
  RefreshCw,
  ArrowUpCircle,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CVUsageBanner = ({ usage, onUpgrade, onDismiss }) => {
  if (!usage || usage.is_unlimited) return null;
  
  const { limit_reached, percentage_used, cvs_used, monthly_limit, plan_name } = usage;
  
  // Only show banner if limit reached or >80% used
  if (!limit_reached && percentage_used < 80) return null;
  
  const isCritical = limit_reached;
  const bgColor = isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = isCritical ? 'text-red-700' : 'text-amber-700';
  const iconColor = isCritical ? 'text-red-500' : 'text-amber-500';
  
  return (
    <div className={`${bgColor} border rounded-lg p-4 mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${iconColor} mt-0.5`} />
          <div>
            <h4 className={`font-semibold ${textColor}`}>
              {isCritical ? 'Monthly CV Limit Reached' : 'Approaching CV Limit'}
            </h4>
            <p className={`text-sm ${textColor} mt-1`}>
              {isCritical ? (
                <>
                  You have used all {monthly_limit.toLocaleString()} CVs available on your {plan_name} plan this month.
                  Upgrade to continue creating CVs.
                </>
              ) : (
                <>
                  You have used {cvs_used.toLocaleString()} of {monthly_limit.toLocaleString()} CVs ({percentage_used}%) this month.
                </>
              )}
            </p>
            {usage.reset_date && (
              <p className={`text-xs ${textColor} mt-1 opacity-75`}>
                Limit resets on {new Date(usage.reset_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan_name !== 'Enterprise' && (
            <Button 
              size="sm" 
              onClick={onUpgrade}
              className={isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              <ArrowUpCircle className="h-4 w-4 mr-1" />
              Upgrade Plan
            </Button>
          )}
          {!isCritical && onDismiss && (
            <button onClick={onDismiss} className={`${textColor} hover:opacity-70`}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const CVUsageCard = ({ className = '' }) => {
  const { token } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/reseller/cv-usage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      } else {
        setError('Failed to load CV usage');
      }
    } catch (err) {
      setError('Failed to load CV usage');
      console.error('Error fetching CV usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (!usage) return 'bg-blue-500';
    if (usage.limit_reached) return 'bg-red-500';
    if (usage.percentage_used >= 90) return 'bg-red-500';
    if (usage.percentage_used >= 80) return 'bg-amber-500';
    if (usage.percentage_used >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getAlertBadge = () => {
    if (!usage) return null;
    if (usage.limit_reached) {
      return <Badge className="bg-red-100 text-red-700">Limit Reached</Badge>;
    }
    if (usage.percentage_used >= 80) {
      return <Badge className="bg-amber-100 text-amber-700">High Usage</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Monthly CV Usage
          </CardTitle>
          {getAlertBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Usage Stats */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">
                {usage?.cvs_used?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-500">
                {usage?.is_unlimited ? (
                  'CVs created (Unlimited)'
                ) : (
                  `of ${usage?.monthly_limit?.toLocaleString() || 0} CVs`
                )}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-1">
                <Crown className="h-3 w-3 mr-1" />
                {usage?.plan_name || 'Unknown'} Plan
              </Badge>
              <p className="text-xs text-gray-400">{usage?.month}</p>
            </div>
          </div>

          {/* Progress Bar (only for limited plans) */}
          {!usage?.is_unlimited && (
            <div className="space-y-1">
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${Math.min(usage?.percentage_used || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{usage?.percentage_used?.toFixed(1)}% used</span>
                <span>
                  {usage?.cvs_remaining === -1 
                    ? 'Unlimited' 
                    : `${usage?.cvs_remaining?.toLocaleString()} remaining`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Upgrade Prompt */}
          {usage?.show_upgrade_prompt && usage?.plan_name !== 'Enterprise' && (
            <div className="pt-2 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => window.location.href = '/reseller/settings?tab=subscription'}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade for more CVs
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { CVUsageBanner, CVUsageCard };
export default CVUsageCard;
