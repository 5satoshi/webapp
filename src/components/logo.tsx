import type React from 'react';

// New SVG for the provided image
const NewFiveSDollarLogoSVG: React.FC<{ width: number; height: number; className?: string }> = ({ width, height, className }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 80 80" // Using an 80x80 viewBox for easier definition
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-labelledby="logoTitleActual"
    role="img"
  >
    <title id="logoTitleActual">5satoshi Logo</title>
    <defs>
      <linearGradient id="fiveSDollarGradient" x1="50%" y1="0%" x2="50%" y2="100%">
        {/* Gradient stops from the image: Orange-yellow top, transitioning to purple bottom */}
        <stop offset="0%" style={{ stopColor: '#FFC107' }} /> {/* Gold/Yellowish-Orange */}
        <stop offset="30%" style={{ stopColor: '#FFA726' }} /> {/* Orange */}
        <stop offset="70%" style={{ stopColor: '#AB47BC' }} /> {/* Purple */}
        <stop offset="100%" style={{ stopColor: '#7B1FA2' }} /> {/* Deeper Purple */}
      </linearGradient>
      <mask id="dollarSignCutoutMask">
        <rect width="80" height="80" fill="white" />
        {/* Vertical bars for $ - black to make them cut out from the shape below */}
        {/* Adjusted position and size for better visual based on an 80x80 viewBox */}
        <rect x="36" y="26" width="5" height="28" fill="black" rx="2" />
        <rect x="45" y="26" width="5" height="28" fill="black" rx="2" />
      </mask>
    </defs>

    {/* Black background rounded square */}
    <rect width="80" height="80" rx="14" ry="14" fill="#161616" /> {/* Slightly off-black background */}

    {/* Gradient border for the square */}
    <rect x="2.5" y="2.5" width="75" height="75" rx="11.5" ry="11.5" fill="none" stroke="url(#fiveSDollarGradient)" strokeWidth="3.5" />

    {/* The "5S" Symbol (filled path, then masked) */}
    {/* This path is an approximation of the 5S glyph from the image. */}
    <path
      d="
        M59,20 H30 V27 H56
        C62,27 63,31 57,34
        L37,40
        C30,43 30,49 37,51
        L57,56
        C63,59 62,64 56,64
        H30 V71 H59
      "
      fill="url(#fiveSDollarGradient)"
      mask="url(#dollarSignCutoutMask)"
    />
  </svg>
);


export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 40 : size === 'md' ? 32 : 28; // Adjusted sm size

  return (
    <div className="flex items-center" title="5satoshi">
      <NewFiveSDollarLogoSVG width={iconSize} height={iconSize} />
    </div>
  );
}
