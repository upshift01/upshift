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
      
      {/* Main rocket body */}
      <path
        d="M55 10 
           C70 10, 85 25, 85 45
           C85 55, 80 65, 70 75
           L60 85
           C55 90, 45 90, 40 85
           L30 75
           C20 65, 15 55, 15 45
           C15 25, 30 10, 45 10
           Z"
        fill="url(#rocketGradient)"
      />
      
      {/* Rocket window/porthole */}
      <circle
        cx="50"
        cy="45"
        r="12"
        fill="#ffffff"
        opacity="0.9"
      />
      <circle
        cx="50"
        cy="45"
        r="8"
        fill="#1e293b"
      />
      
      {/* Left exhaust flame */}
      <ellipse
        cx="30"
        cy="88"
        rx="10"
        ry="8"
        fill="url(#rocketGradient)"
      />
      
      {/* Right exhaust flame */}
      <ellipse
        cx="70"
        cy="88"
        rx="10"
        ry="8"
        fill="url(#rocketGradient)"
      />
      
      {/* Connecting piece */}
      <path
        d="M35 80 Q50 95, 65 80"
        fill="url(#rocketGradient)"
      />
    </svg>
  );
};

export default RocketLogo;
