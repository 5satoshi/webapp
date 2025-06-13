import type React from 'react';

// This SVG aims to represent the "5" with a "$" cutout.
// Fill color: #FF7043 (Burnt Orange)
// Stroke color: #212121 (Dark Gray, style guide background color, for outline)
const FiveSSymbolSVG: React.FC<{ width: number; height: number; className?: string }> = ({ width, height, className }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 64 64" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className} 
    aria-labelledby="logoTitleActual" 
    role="img"
  >
    <title id="logoTitleActual">5satoshi Logo Symbol</title>
    <defs>
      <mask id="logoDollarMask">
        <rect width="64" height="64" fill="white"/>
        {/* $ symbol parts, black to create transparency in mask */}
        <path d="M30 25 H38 C39.1046 25 40 25.8954 40 27 V29 C40 30.1046 39.1046 31 38 31 H30 C28.8954 31 28 30.1046 28 29 V27 C28 25.8954 27.1046 25 28 25 Z" fill="black" />
        <path d="M30 37 H38 C39.1046 37 40 37.8954 40 39 V41 C40 42.1046 39.1046 43 38 43 H30 C28.8954 43 28 42.1046 28 41 V39 C28 37.8954 27.1046 37 28 37 Z" fill="black" />
        <rect x="33" y="24" width="2.5" height="20" rx="1" fill="black"/>
      </mask>
    </defs>
    {/* Stylized "5" path: Top bar, then straight down, then curve for belly, then bottom part */}
    <path 
      d="M58,12 L30,12 L30,4 L62,4 L62,27 L42,27 C42,27 38,30.33 38,35 C38,39.67 42,43 42,43 L60,43 L60,56 L18,56 C18,56 18,40 18,30 C18,20 18,12 18,12 L30,12"
      fill="#FF7043" 
      stroke="#212121" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      mask="url(#logoDollarMask)" 
    />
  </svg>
);

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  // Adjusted sizes for better visual balance of the new SVG logo
  const iconSize = size === 'lg' ? 40 : size === 'md' ? 32 : 24; 

  return (
    <div className="flex items-center" title="5satoshi">
      <FiveSSymbolSVG width={iconSize} height={iconSize} />
    </div>
  );
}
