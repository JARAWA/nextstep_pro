/**
 * Token management utilities for Firebase authentication
 */
import { getIdToken } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Constants
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
const TOKEN_EXPIRY_THRESHOLD = 5 * 60 * 1000;  // 5 minutes

// Current token state
let authToken = null;
let lastTokenRefresh = null;
let tokenRefreshInterval = null;

/**
 * Get a fresh Firebase ID token for the current user
 * @param {Object} user - Firebase user object
 * @returns {Promise<string|null>} The token or null if an error occurs
 */
async function getFirebaseToken(user) {
    if (!user) return null;
    
    try {
        const token = await getIdToken(user, true);
        lastTokenRefresh = Date.now();
        return token;
    } catch (error) {
        console.error('Error getting Firebase token:', error);
        return null;
    }
}

/**
 * Refresh the authentication token and store it
 * @param {Object} user - Firebase user object
 * @returns {Promise<string|null>} The new token or null if an error occurs
 */
async function refreshToken(user) {
    if (!user) return null;
    
    try {
        const token = await getFirebaseToken(user);
        if (token) {
            authToken = token;
            localStorage.setItem('authToken', token);
        }
        return token;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

/**
 * Validate a token to see if it's still valid
 * @param {string} token - The token to validate
 * @returns {boolean} Whether the token is valid
 */
function validateToken(token) {
    if (!token) return false;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        const payload = JSON.parse(atob(parts[1]));
        const exp = payload.exp * 1000;
        
        return Date.now() < exp - TOKEN_EXPIRY_THRESHOLD;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

/**
 * Set up automatic token refresh interval
 * @param {Object} user - Firebase user object
 * @param {Function} refreshFunction - Function to refresh the token
 */
function setupTokenRefresh(user, refreshFunction = null) {
    // Clear any existing interval
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
    }
    
    // If no user or no refresh function, don't set up the interval
    if (!user || (typeof refreshFunction !== 'function' && typeof refreshToken !== 'function')) {
        return;
    }
    
    // Use the provided refresh function or the default one
    const refreshFn = typeof refreshFunction === 'function' 
        ? () => refreshFunction(user) 
        : () => refreshToken(user);
    
    // Set up the interval
    tokenRefreshInterval = setInterval(async () => {
        await refreshFn();
    }, TOKEN_REFRESH_INTERVAL);
}

/**
 * Get the current authentication token
 * @returns {string|null} The current token or null
 */
function getCurrentToken() {
    return authToken;
}

/**
 * Clear token information on logout
 */
function clearTokenData() {
    authToken = null;
    localStorage.removeItem('authToken');
    
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }
}

/**
 * Retrieve and validate a token from storage
 * @returns {string|null} The token if valid, or null
 */
function getStoredToken() {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken && validateToken(storedToken)) {
        authToken = storedToken;
        return storedToken;
    }
    return null;
}

export const TokenManager = {
    getFirebaseToken,
    refreshToken,
    validateToken,
    setupTokenRefresh,
    getCurrentToken,
    clearTokenData,
    getStoredToken,
    // Constants
    TOKEN_REFRESH_INTERVAL,
    TOKEN_EXPIRY_THRESHOLD
};

export default TokenManager;