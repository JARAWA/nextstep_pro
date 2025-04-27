/**
 * Error handling utilities for authentication and Firestore operations
 */

// Map Firebase error codes to user-friendly messages
function mapAuthError(error) {
    const errorMap = {
        // Authentication errors
        'auth/email-already-in-use': 'Email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/too-many-requests': 'Too many login attempts. Your account is temporarily locked for security reasons.',
        'auth/popup-closed-by-user': 'Login popup was closed',
        'auth/cancelled-popup-request': 'Login popup was cancelled',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/internal-error': 'An internal error occurred. Please try again.',
        'auth/invalid-credential': 'Invalid login credentials',
        'auth/operation-not-allowed': 'This login method is not enabled',
        'auth/account-exists-with-different-credential': 'An account already exists with this email',
        'auth/requires-recent-login': 'Please log in again to continue',
        'auth/id-token-expired': 'Session expired. Please log in again',
        
        // Firestore error codes
        'permission-denied': 'Missing or insufficient permissions',
        'resource-exhausted': 'Database operation limit exceeded, please try again later',
        'unauthenticated': 'Authentication required',
        'unavailable': 'Service is currently unavailable, please try again later',
        'not-found': 'The requested document was not found',
        'already-exists': 'This document already exists',
        'deadline-exceeded': 'Operation timed out',
        'cancelled': 'Operation was cancelled',
        'data-loss': 'Unrecoverable data loss or corruption',
        'unknown': 'An unknown error occurred',
        'invalid-argument': 'Invalid argument provided to operation',
        'failed-precondition': 'Operation was rejected because the system is not in a state required',
        'aborted': 'The operation was aborted'
    };

    // If we have a known error code, return the mapped message
    if (error && error.code && errorMap[error.code]) {
        return errorMap[error.code];
    }
    
    // Otherwise return error message or a default message
    return error?.message || 'An unexpected error occurred';
}

// Display error to the user
function displayError(errorField, errorMessage) {
    // First try to use the built-in Modal error display
    if (window.Modal && typeof window.Modal.showError === 'function') {
        window.Modal.showError(errorField, errorMessage);
    }

    // Also try to show a toast notification if available
    if (window.showToast) {
        window.showToast(errorMessage, 'error');
    }

    // Always log to console for debugging
    console.error('Auth Error:', errorMessage);
    
    // Check if it's a rate limit error and offer password reset
    const isRateLimitError = 
        (typeof errorMessage === 'string' && 
         (errorMessage.includes('too many login attempts') || 
          errorMessage.includes('temporarily locked'))) ||
        (error && error.code === 'auth/too-many-requests');
    
    if (isRateLimitError) {
        offerPasswordReset();
    }
}

// Handle auth errors and token refreshing
async function handleAuthError(error, refreshTokenFn, logoutFn) {
    console.error('Auth error:', error);

    // If token expired, try to refresh it
    if (error.code === 'auth/id-token-expired' && typeof refreshTokenFn === 'function') {
        const newToken = await refreshTokenFn();
        if (newToken) return newToken;
    }

    // If token refresh failed or other error, log out
    if (typeof logoutFn === 'function') {
        await logoutFn();
    }
    
    if (window.showToast) {
        window.showToast('Session expired. Please log in again.', 'warning');
    }

    return null;
}

// Offers password reset option when account is rate limited
function offerPasswordReset() {
    // Find the login form
    const loginForm = document.querySelector('.login-form');
    
    if (!loginForm) return;
    
    // Check if reset notice already exists
    if (document.getElementById('rate-limit-notice')) return;
    
    // Create reset notice element
    const resetNotice = document.createElement('div');
    resetNotice.id = 'rate-limit-notice';
    resetNotice.className = 'rate-limit-notice';
    resetNotice.innerHTML = `
        <p>Your account is temporarily locked due to too many login attempts.</p>
        <button type="button" id="show-reset-btn" class="reset-password-btn">
            <i class="fas fa-key"></i> Reset your password
        </button>
    `;
    
    // Insert after login form
    loginForm.insertAdjacentElement('afterend', resetNotice);
    
    // Add event listener to the reset button
    document.getElementById('show-reset-btn').addEventListener('click', function() {
        // Show password reset form
        if (window.Modal && typeof window.Modal.showForgotPassword === 'function') {
            window.Modal.showForgotPassword();
        } else if (window.Auth && typeof window.Auth.handleForgotPassword === 'function') {
            window.Auth.handleForgotPassword();
        } else {
            // Fallback - show toast with instruction
            if (window.showToast) {
                window.showToast('Please use the "Forgot Password" option to reset your password.', 'info');
            }
        }
    });
    
    // Add necessary styles if not already in your CSS
    addRateLimitStyles();
}

// Add CSS styles for rate limit notice
function addRateLimitStyles() {
    // Check if styles already exist
    if (document.getElementById('rate-limit-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'rate-limit-styles';
    styleElement.textContent = `
        .rate-limit-notice {
            margin-top: 20px;
            padding: 15px;
            background-color: rgba(0, 107, 107, 0.05);
            border-left: 3px solid var(--primary-color, #006B6B);
            border-radius: 4px;
            animation: fadeIn 0.5s ease-out;
        }
        
        .rate-limit-notice p {
            margin-bottom: 10px;
            color: #555;
            font-size: 0.9rem;
        }
        
        .reset-password-btn {
            background: transparent;
            color: var(--primary-color, #006B6B);
            border: 1px solid var(--primary-color, #006B6B);
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .reset-password-btn:hover {
            background-color: var(--primary-color, #006B6B);
            color: white;
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Retry mechanism for Firestore operations
async function retryOperation(operation, maxRetries = 3, initialDelay = 1000) {
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
        try {
            console.log(`Attempt ${retryCount + 1} of operation`);
            
            // Wait between retries (except for first attempt)
            if (retryCount > 0) {
                const delayMs = initialDelay * Math.pow(2, retryCount - 1); // Exponential backoff
                console.log(`Waiting ${delayMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            
            // Attempt the operation
            const result = await operation();
            console.log("Operation successful");
            return { success: true, result };
            
        } catch (error) {
            console.error(`Operation error on attempt ${retryCount + 1}:`, error);
            lastError = error;
            retryCount++;
        }
    }
    
    console.error("All operation attempts failed");
    return { success: false, error: lastError };
}

// Export error handling utilities
export const ErrorHandler = {
    mapAuthError,
    displayError,
    handleAuthError,
    retryOperation,
    offerPasswordReset
};

export default ErrorHandler;
