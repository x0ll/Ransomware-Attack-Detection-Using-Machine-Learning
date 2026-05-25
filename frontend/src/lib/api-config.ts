// Centralized API configuration
// Dynamically routes requests to localhost when testing locally, and to Render when deployed
const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
);

export const API_BASE_URL = import.meta.env.VITE_API_URL || (
  isLocal 
    ? 'http://localhost:5000' 
    : 'https://ransomware-attack-detection-using.onrender.com'
);

console.log('🛡️ SARMZ RansomGuard API Base URL initialized:', API_BASE_URL);
