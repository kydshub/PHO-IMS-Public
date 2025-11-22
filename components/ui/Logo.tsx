
import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean; 
}

export const Logo: React.FC<LogoProps> = ({ className, showText = true }) => {
  return (
    <svg 
      viewBox="0 0 340 60"
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      aria-label="Batangas PHO-IMS Logo"
    >
      <defs>
        <linearGradient id="logo-circle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#1d4ed8"/>
        </linearGradient>
      </defs>
      
      {/* Icon */}
      <g>
        <circle cx="30" cy="30" r="25" fill="url(#logo-circle-gradient)"/>
        {/* Medical Cross */}
        <path d="M22 30 H 38 M 30 22 V 38" stroke="white" stroke-width="4" stroke-linecap="round"/>
        {/* Checkmark symbolizing inventory/correctness */}
        <circle cx="40" cy="40" r="8" fill="#10b981" stroke="white" stroke-width="1.5" />
        <path d="M37 40 L39 42 L43 38" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      
      {/* Text */}
      {showText && (
        <text 
            x="68" 
            y="38" 
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            fontSize="28" 
            fontWeight="bold" 
            fill="#1e40af"
        >
            Batangas PHO-IMS
        </text>
      )}
    </svg>
  );
};