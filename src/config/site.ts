// src/config/site.ts

// HSL color components for primary color (Deep Purple)
const primaryColorH = 277;
const primaryColorS = 70;
const primaryColorL = 36;

// HSL color components for secondary color (Orange)
const secondaryColorH = 34;
const secondaryColorS = 100;
const secondaryColorL = 50;

// HSL color components for tertiary color (Lighter Deep Purple)
const tertiaryColorH = 277;
const tertiaryColorS = 70;
const tertiaryColorL = 55;


export const siteConfig = {
  name: "5satoshi Lightning Node Dashboard",
  publicUrl: 'https://5sats.com', // Updated to HTTPS
  ogImageDefault: 'https://placehold.co/1200x630.png', 
  themeColors: {
    primaryHSL: { h: primaryColorH, s: primaryColorS, l: primaryColorL },
    secondaryHSL: { h: secondaryColorH, s: secondaryColorS, l: secondaryColorL },
    tertiaryHSL: { h: tertiaryColorH, s: tertiaryColorS, l: tertiaryColorL },
    
    // Direct HSL strings derived from above for easier use in certain contexts if needed
    primary: `${primaryColorH} ${primaryColorS}% ${primaryColorL}%`,
    secondary: `${secondaryColorH} ${secondaryColorS}% ${secondaryColorL}%`,
    tertiary: `${tertiaryColorH} ${tertiaryColorS}% ${tertiaryColorL}%`,
  },
};
