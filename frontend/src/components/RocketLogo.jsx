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
      
      {/* Main rocket body - tilted diagonally */}
      <path
        d="M65 8 
           C80 12, 92 28, 88 48
           C86 58, 78 68, 65 75
           L50 82
           C42 78, 35 70, 32 60
           C28 45, 35 25, 50 15
           C55 11, 60 8, 65 8
           Z"
        fill="url(#rocketGradient)"
      />
      
      {/* Rocket window/porthole - matches original */}
      <circle
        cx="58"
        cy="42"
        r="10"
        fill="#1a1a2e"
      />
      
      {/* Left fin/exhaust */}
      <ellipse
        cx="28"
        cy="78"
        rx="12"
        ry="10"
        fill="url(#rocketGradient)"
      />
      
      {/* Bottom fin/exhaust */}
      <ellipse
        cx="55"
        cy="92"
        rx="10"
        ry="8"
        fill="url(#rocketGradient)"
      />
      
      {/* Top accent fin */}
      <ellipse
        cx="78"
        cy="22"
        rx="8"
        ry="10"
        fill="url(#rocketGradient)"
        transform="rotate(-30 78 22)"
      />
    </svg>
  );
};

export default RocketLogo;
