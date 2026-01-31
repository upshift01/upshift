import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/api/ws/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [token]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!token || !isAuthenticated) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const wsUrl = `${WS_URL}/api/ws/notifications?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'init':
              setUnreadCount(data.unread_count || 0);
              break;
              
            case 'notification':
              // Add new notification to the top
              setNotifications(prev => [data.notification, ...prev].slice(0, 50));
              setUnreadCount(prev => prev + 1);
              
              // Play notification sound (optional)
              try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {});
              } catch {}
              break;
              
            case 'unread_count':
              setUnreadCount(data.count || 0);
              break;
              
            case 'pong':
              // Keepalive response
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        // Attempt to reconnect after 5 seconds if still authenticated
        if (isAuthenticated && event.code !== 4001) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 5000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [token, isAuthenticated]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!token) return;
    
    try {
      // Send via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_read',
          notification_id: notificationId
        }));
      }
      
      // Also call REST API as backup
      await fetch(`${API_URL}/api/ws/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [token]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;
    
    try {
      // Send via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'mark_all_read' }));
      }
      
      // Also call REST API
      await fetch(`${API_URL}/api/ws/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [token]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();
      connectWebSocket();
    } else {
      // Disconnect when logged out
      if (wsRef.current) {
        wsRef.current.close();
      }
      setNotifications([]);
      setUnreadCount(0);
      setIsConnected(false);
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, token, fetchNotifications, connectWebSocket]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
