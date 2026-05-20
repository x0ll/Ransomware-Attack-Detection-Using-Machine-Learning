// Centralized API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ransomware-attack-detection-using.onrender.com';

// Log the URL to help debug environment variable issues in production (Vercel)
console.log('🛡️ RansomGuard API Base URL initialized:', API_BASE_URL || '(Empty - falling back to relative paths)');
