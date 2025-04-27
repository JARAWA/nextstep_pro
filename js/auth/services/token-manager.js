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
        console.log(`Token obtained for user ${user.uid} (${token.substring(0, 10)}...)`);
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
        console.log('Refreshing token for user:', user.uid);
        const token = await getFirebaseToken(user);
        if (token) {
            authToken = token;
            localStorage.setItem('authToken', token);
            console.log('Token refreshed and stored successfully');
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
        const currentTime = Date.now();
        const timeToExpiry = exp - currentTime;
        
        console.log(`Token validation: Expires in ${Math.round(timeToExpiry/1000/60)} minutes`);
        return currentTime < exp - TOKEN_EXPIRY_THRESHOLD;
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
    
    // Also immediately refresh the token to ensure it's valid
    refreshFn().then(token => {
        console.log('Initial token refresh completed:', !!token);
    });
    
    // Set up the interval
    tokenRefreshInterval = setInterval(async () => {
        console.log('Token refresh interval triggered');
        await refreshFn();
    }, TOKEN_REFRESH_INTERVAL);
    
    console.log(`Token refresh interval set for ${TOKEN_REFRESH_INTERVAL/1000/60} minutes`);
}

/**
 * Get the current authentication token
 * @returns {string|null} The current token or null
 */
function getCurrentToken() {
    // First try the in-memory token
    if (authToken && validateToken(authToken)) {
        return authToken;
    }
    
    // Then try localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken && validateToken(storedToken)) {
        authToken = storedToken; // Update in-memory token
        return storedToken;
    }
    
    // Clear invalid token if found
    if (authToken || storedToken) {
        console.warn('Invalid token found, clearing token data');
        clearTokenData();
    }
    
    return null;
}

/**
 * Get token from storage without validation
 * @returns {string|null} Stored token or null
 */
function getStoredToken() {
    return localStorage.getItem('authToken');
}

/**
 * Clear all token data
 */
function clearTokenData() {
    console.log('Clearing all token data');
    authToken = null;
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('josaa_auth_token');
    
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }
}

/**
 * Decode a token and get its payload
 * @param {string} token - The token to decode
 * @returns {Object|null} The decoded payload or null
 */
function decodeToken(token) {
    if (!token) return null;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        return JSON.parse(atob(parts[1]));
    } catch (error) {
        console.error('Token decode error:', error);
        return null;
    }
}

export const TokenManager = {
    getFirebaseToken,
    refreshToken,
    validateToken,
    setupTokenRefresh,
    getCurrentToken,
    clearTokenData,
    getStoredToken,
    decodeToken,
    // Constants
    TOKEN_REFRESH_INTERVAL,
    TOKEN_EXPIRY_THRESHOLD
};

export default TokenManager;
