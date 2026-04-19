/**
 * Decodes a JWT token and extracts its payload
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
// Handles decodeToken logic.
export function decodeToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Checks if a token has expired
 * @param {object} decodedToken - Decoded JWT payload
 * @returns {boolean} - true if expired, false otherwise
 */
// Handles isTokenExpired logic.
export function isTokenExpired(decodedToken) {
  if (!decodedToken || !decodedToken.exp) {
    return true; // Consider invalid tokens as expired
  }
  
  const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
  return decodedToken.exp < currentTime;
}

/**
 * Gets remaining time until token expiration in milliseconds
 * @param {object} decodedToken - Decoded JWT payload
 * @returns {number} - Milliseconds until expiration, or 0 if already expired
 */
// Handles getTokenTimeRemaining logic.
export function getTokenTimeRemaining(decodedToken) {
  if (!decodedToken || !decodedToken.exp) {
    return 0;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  const timeRemaining = (decodedToken.exp - currentTime) * 1000; // Convert to milliseconds
  
  return Math.max(0, timeRemaining);
}

/**
 * Formats remaining time as human readable string
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} - Formatted time string
 */
// Handles formatTimeRemaining logic.
export function formatTimeRemaining(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds % 60} second${(seconds % 60) !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

/**
 * Sets up a timer to logout when token expires
 * @param {number} timeRemaining - Time in milliseconds until expiration
 * @returns {function} - Cleanup function to clear the timer
 */
// Handles setupExpirationTimer logic.
export function setupExpirationTimer(timeRemaining, onExpire) {
  if (timeRemaining <= 0) {
    // Token already expired
    onExpire?.();
    return () => {};
  }
  
  // Logout 30 seconds before actual expiration to handle edge cases
  const logoutTime = Math.max(1000, timeRemaining - 30000);
  
  const timeoutId = setTimeout(() => {
    console.warn('Session token expired. Logging out...');
    onExpire?.();
  }, logoutTime);
  
  return () => clearTimeout(timeoutId);
}
