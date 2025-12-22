import React from 'react';

const RocketLogo = ({ className = "h-8 w-8" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rocketGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      
      {/* Main rocket body - matches original tilted blob shape */}
      <path
        d="M68 8
           C82 14, 92 32, 88 52
           C85 68, 72 80, 55 86
           L45 88
           C32 84, 20 72, 16 55
           C12 38, 20 20, 38 10
           C48 5, 60 5, 68 8
           Z"
        fill="url(#rocketGradient)"
      />
      
      {/* Porthole - circular dark window, positioned upper-center */}
      <circle
        cx="52"
        cy="42"
        r="14"
        fill="#0f172a"
      />
      
      {/* Left exhaust flame - larger, extending down-left */}
      <path
        d="M20 72
           C8 78, 4 92, 15 98
           C28 102, 38 92, 32 80
           C28 74, 24 72, 20 72
           Z"
        fill="url(#rocketGradient)"
      />
      
      {/* Right exhaust flame - extending down-right */}
      <path
        d="M75 75
           C88 80, 95 92, 85 98
           C75 102, 65 94, 68 82
           C70 78, 72 75, 75 75
           Z"
        fill="url(#rocketGradient)"
      />
    </svg>
  );
};

export default RocketLogo;
