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
  publicUrl: 'https://5sats.com', // User-facing public URL of the dashboard
  apiBaseUrl: 'https://5sats.com', // Base URL for internal API calls, can be overridden by INTERNAL_API_HOST
  ogImageDefault: 'https://placehold.co/1200x630.png', 
  themeColors: {
    primaryHSLString: `${primaryColorH} ${primaryColorS}% ${primaryColorL}%`,
    secondaryHSLString: `${secondaryColorH} ${secondaryColorS}% ${secondaryColorL}%`,
    tertiaryHSLString: `${tertiaryColorH} ${tertiaryColorS}% ${tertiaryColorL}%`,
  },
};
