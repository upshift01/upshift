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
      
      {/* Unified rocket shape - organic blob with integrated exhaust */}
      <path
        d="M70 6
           C85 12, 95 30, 92 50
           C90 65, 80 78, 65 85
           C60 87, 55 90, 52 95
           C50 98, 48 98, 45 95
           C42 90, 35 88, 28 85
           C15 78, 5 62, 8 45
           C10 30, 22 15, 40 8
           C52 3, 62 3, 70 6
           Z
           M12 80
           C5 85, 5 95, 15 98
           C25 100, 30 92, 25 84
           C22 80, 16 78, 12 80
           Z
           M85 78
           C92 82, 96 92, 88 97
           C80 100, 72 94, 76 85
           C78 81, 82 78, 85 78
           Z"
        fill="url(#rocketGradient)"
        fill-rule="evenodd"
      />
      
      {/* Porthole - circular dark window */}
      <circle
        cx="50"
        cy="45"
        r="15"
        fill="#0f172a"
      />
    </svg>
  );
};

export default RocketLogo;
