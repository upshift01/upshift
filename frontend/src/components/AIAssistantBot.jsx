import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const AIAssistantBot = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [quickActions, setQuickActions] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const brandName = theme?.brandName || 'UpShift';
  const primaryColor = theme?.primaryColor || '#1e40af';

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load session from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('ai_assistant_session');
    if (savedSession) {
      const { sessionId: savedId, messages: savedMessages } = JSON.parse(savedSession);
      setSessionId(savedId);
      setMessages(savedMessages);
      if (savedMessages.length > 0) {
        setShowQuickActions(false);
      }
    }
    fetchQuickActions();
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem('ai_assistant_session', JSON.stringify({
        sessionId,
        messages
      }));
    }
  }, [sessionId, messages]);

  const fetchQuickActions = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai-assistant/quick-actions`);
      if (response.ok) {
        const data = await response.json();
        setQuickActions(data);
      }
    } catch (error) {
      console.error('Error fetching quick actions:', error);
    }
  };

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
        
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          text: data.response,
          timestamp: data.timestamp
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment or contact us at support@upshift.works",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action.action === 'navigate' && action.url) {
      navigate(action.url);
      setIsOpen(false);
    } else if (action.action === 'message') {
      handleSendMessage(action.label);
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      try {
        await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai-assistant/session/${sessionId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
    }
    setMessages([]);
    setSessionId(null);
    setShowQuickActions(true);
    localStorage.removeItem('ai_assistant_session');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Parse message for navigation links
  const parseMessageWithLinks = (text) => {
    const urlPattern = /\/([\w-]+)/g;
    const parts = text.split(urlPattern);
    
    return text;
  };

  const formatMessage = (text) => {
    // Convert markdown-like formatting
    return text
      .split('\n')
      .map((line, i) => (
        <span key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  return (
    <>
      {/* Chat Widget */}
      <div className="fixed bottom-36 right-6 z-50">
        {/* Chat Window */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 flex flex-col" style={{ height: '500px' }}>
            {/* Header */}
            <div 
              className="p-4 text-white flex items-center justify-between"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{brandName} AI Assistant</h3>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Online 24/7
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button 
                    onClick={clearChat}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">Hi! I'm your AI Career Assistant 👋</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    I can help you with CVs, cover letters, pricing, and more. How can I assist you today?
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              {showQuickActions && quickActions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Quick Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.slice(0, 6).map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickAction(action)}
                        className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-1"
                      >
                        {action.label}
                        {action.action === 'navigate' && <ArrowRight className="h-3 w-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-blue-600' 
                        : message.isError 
                          ? 'bg-red-100' 
                          : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      {message.type === 'user' 
                        ? <User className="h-4 w-4 text-white" />
                        : <Bot className={`h-4 w-4 ${message.isError ? 'text-red-600' : 'text-white'}`} />
                      }
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : message.isError
                          ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">
                        {formatMessage(message.text)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{ backgroundColor: inputValue.trim() && !isLoading ? primaryColor : undefined }}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Powered by AI • Available 24/7
              </p>
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%)` }}
          aria-label="AI Assistant"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <MessageCircle className="h-6 w-6 text-white" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Sparkles className="h-2 w-2 text-white" />
              </span>
            </>
          )}
          
          {/* Pulse Animation */}
          {!isOpen && (
            <span 
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ backgroundColor: primaryColor }}
            ></span>
          )}
        </button>
      </div>
    </>
  );
};

export default AIAssistantBot;
