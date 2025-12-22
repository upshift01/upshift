import React from 'react';

const RocketLogo = ({ className = "h-8 w-8", useGradient = true }) => {
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
      
      <g transform="rotate(25 50 50)">
        {/* Main rocket body - bulbous rounded shape */}
        <path
          d="M50 8
             C65 8, 78 20, 78 40
             C78 55, 70 70, 58 78
             L50 82
             L42 78
             C30 70, 22 55, 22 40
             C22 20, 35 8, 50 8
             Z"
          fill="url(#rocketGradient)"
        />
        
        {/* Left fin/wing protrusion */}
        <ellipse
          cx="20"
          cy="70"
          rx="14"
          ry="12"
          fill="url(#rocketGradient)"
        />
        
        {/* Right fin/wing protrusion */}
        <ellipse
          cx="80"
          cy="70"
          rx="14"
          ry="12"
          fill="url(#rocketGradient)"
        />
        
        {/* Bottom exhaust connection */}
        <ellipse
          cx="50"
          cy="85"
          rx="12"
          ry="10"
          fill="url(#rocketGradient)"
        />
        
        {/* Porthole - circular window */}
        <circle
          cx="50"
          cy="42"
          r="12"
          fill="#1a1a2e"
        />
      </g>
      
      {/* Secondary exhaust puff - bottom left detached */}
      <ellipse
        cx="18"
        cy="88"
        rx="10"
        ry="8"
        fill="url(#rocketGradient)"
      />
    </svg>
  );
};

export default RocketLogo;
