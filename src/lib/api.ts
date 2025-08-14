// Central API base URL for both dev and prod
// Use VITE_API_BASE env var in production (e.g., https://your-api.onrender.com)
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';