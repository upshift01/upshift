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
      
      {/* Main rocket body - organic blob shape tilted right ~25 degrees */}
      <path
        d="M60 5
           C75 8, 88 22, 90 42
           C92 58, 82 72, 68 82
           C62 86, 55 88, 50 90
           C45 88, 38 86, 32 82
           C18 72, 12 55, 18 38
           C22 22, 38 10, 55 6
           Z"
        fill="url(#rocketGradient)"
        transform="rotate(15 50 50)"
      />
      
      {/* Porthole - circular dark window */}
      <circle
        cx="54"
        cy="44"
        r="13"
        fill="#0f172a"
      />
      
      {/* Left bottom exhaust blob */}
      <ellipse
        cx="22"
        cy="82"
        rx="15"
        ry="12"
        fill="url(#rocketGradient)"
      />
      
      {/* Right bottom exhaust blob */}
      <ellipse
        cx="72"
        cy="78"
        rx="14"
        ry="11"
        fill="url(#rocketGradient)"
      />
      
      {/* Small detached exhaust puff - bottom */}
      <ellipse
        cx="48"
        cy="95"
        rx="10"
        ry="7"
        fill="url(#rocketGradient)"
      />
    </svg>
  );
};

export default RocketLogo;
