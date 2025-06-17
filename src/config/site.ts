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
  // Base URL for API calls.
  // If INTERNAL_API_HOST environment variable is not set, API calls from a self-hosted dashboard
  // will default to this URL. For betweenness data specifically, this means
  // it would call the 5sats.com production API.
  // Set INTERNAL_API_HOST to your own application's URL if you want to use your own backend APIs.
  apiBaseUrl: 'https://5sats.com', 
  ogImageDefault: 'https://placehold.co/1200x630.png', 
  themeColors: {
    primary: `${primaryColorH} ${primaryColorS}% ${primaryColorL}%`,
    secondary: `${secondaryColorH} ${secondaryColorS}% ${secondaryColorL}%`,
    tertiary: `${tertiaryColorH} ${tertiaryColorS}% ${tertiaryColorL}%`,
  },
};
