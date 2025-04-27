/**
 * Token management utility for Firebase authentication
 */
class TokenManager {
    static tokenRefreshInterval = null;
    static tokenExpiryTime = null;
    
    /**
     * Get a Firebase authentication token from a user object
     * @param {Object} user - Firebase user object
     * @returns {Promise<string|null>} Firebase auth token or null
     */
    static async getFirebaseToken(user) {
        if (!user) {
            console.error('User object is required to get a token');
            return null;
        }
        
        try {
            console.log(`Getting token for user: ${user.uid}`);
            const token = await user.getIdToken(true); // Force refresh
            
            if (token) {
                // Parse the token to get expiry time (Firebase tokens typically last 1 hour)
                try {
                    const tokenParts = token.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        if (payload && payload.exp) {
                            this.tokenExpiryTime = payload.exp * 1000; // Convert to milliseconds
                            console.log(`Token will expire at: ${new Date(this.tokenExpiryTime)}`);
                        }
                    }
                } catch (parseError) {
                    console.warn('Error parsing token payload:', parseError);
                    // Default to 50 minutes if we can't parse the expiry
                    this.tokenExpiryTime = Date.now() + (50 * 60 * 1000);
                }
                
                return token;
            }
            
            console.error('Failed to obtain token from Firebase');
            return null;
        } catch (error) {
            console.error('Error getting Firebase token:', error);
            return null;
        }
    }
    
    /**
     * Validate the current token
     * @param {string} token - Firebase auth token to validate
     * @returns {boolean} Whether the token is valid
     */
    static validateToken(token) {
        if (!token) return false;
        
        try {
            // Parse the token to get expiry time
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) return false;
            
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiryTime = payload.exp * 1000; // Convert to milliseconds
            
            // Check if token is expired (with 5 minute buffer)
            const currentTime = Date.now();
            const isValid = expiryTime > currentTime + (5 * 60 * 1000);
            
            // Update stored expiry time
            if (isValid) {
                this.tokenExpiryTime = expiryTime;
            }
            
            return isValid;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }
    
    /**
     * Get the currently stored token
     * @returns {string|null} The current token or null
     */
    static getCurrentToken() {
        const token = localStorage.getItem('authToken');
        
        if (token && this.validateToken(token)) {
            return token;
        }
        
        // Clear invalid token
        if (token) {
            console.warn('Clearing invalid token from storage');
            this.clearTokenData();
        }
        
        return null;
    }
    
    /**
     * Get token from storage
     * @returns {string|null} Stored token or null
     */
    static getStoredToken() {
        return localStorage.getItem('authToken');
    }
    
    /**
     * Clear all token data
     */
    static clearTokenData() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('josaa_auth_token');
        
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
        
        this.tokenExpiryTime = null;
    }
    
    /**
     * Refresh the authentication token
     * @param {Object} user - Firebase user object
     * @returns {Promise<string|null>} New token or null
     */
    static async refreshToken(user) {
        if (!user) {
            console.error('User object is required to refresh token');
            return null;
        }
        
        try {
            console.log('Refreshing authentication token...');
            const newToken = await user.getIdToken(true); // Force refresh
            
            if (newToken) {
                localStorage.setItem('authToken', newToken);
                
                // Update expiry time
                try {
                    const tokenParts = newToken.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        if (payload && payload.exp) {
                            this.tokenExpiryTime = payload.exp * 1000;
                            console.log(`New token will expire at: ${new Date(this.tokenExpiryTime)}`);
                        }
                    }
                } catch (parseError) {
                    console.warn('Error parsing refreshed token payload:', parseError);
                }
                
                console.log('Token refreshed successfully');
                return newToken;
            }
            
            console.error('Failed to obtain new token from Firebase');
            return null;
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }
