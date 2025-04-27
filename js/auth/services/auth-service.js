/**
 * Core authentication service for Firebase auth operations
 */
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut, 
    onAuthStateChanged,
    signInWithPopup,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { auth, googleProvider } from './firebase-config.js';
import { Validator, validateForm } from '../utils/validation.js';
import { ErrorHandler } from '../utils/error-handler.js';
import { TokenManager } from '../services/token-manager.js';
import UserService from './user-service.js';

class AuthService {
    // Class properties
    static isLoggedIn = false;
    static user = null;
    static authUnsubscribe = null;
    static userProfileFetched = false;
    
    // Initialize Authentication Service
    static async init() {
        console.log('Initializing Authentication Service');
        
        try {
            this.setupAuthStateListener();
            this.setupAuthButtons();
            await this.checkExistingSession();
            
            console.log('Authentication Service initialized successfully');
        } catch (error) {
            console.error('Error during Authentication Service initialization:', error);
        }
    }
    
    // Check for existing session
    static async checkExistingSession() {
        const storedToken = TokenManager.getStoredToken();
        if (storedToken) {
            console.log("Found valid stored token");
            // Validate the token immediately
            try {
                if (TokenManager.validateToken(storedToken)) {
                    console.log("Stored token is valid");
                } else {
                    console.warn("Stored token is invalid or expired");
                    TokenManager.clearTokenData();
                }
            } catch (error) {
                console.error("Error validating stored token:", error);
                TokenManager.clearTokenData();
            }
        }
    }
    
    static setupAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.user = user;
                this.isLoggedIn = true;
                
                try {
                    // Get token first and make sure it's valid
                    console.log("Getting Firebase token for user:", user.uid);
                    const token = await TokenManager.getFirebaseToken(user);
                    
                    if (token) {
                        console.log("Received valid token from Firebase");
                        localStorage.setItem('authToken', token);
                        TokenManager.setupTokenRefresh(user);
                        
                        // Add a longer delay to ensure the token is fully processed
                        // Firebase sometimes needs additional time to propagate auth state
                        console.log("Waiting for auth state to fully propagate...");
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Now try to fetch the profile
                        try {
                            console.log("Token valid before profile fetch:", !!TokenManager.getCurrentToken());
                            const userData = await UserService.fetchUserProfile(user);
                            
                            if (userData) {
                                console.log("User profile fetched successfully:", userData);
                                if (userData.userRole) {
                                    this.userRole = userData.userRole;
                                    console.log("User role set to:", this.userRole);
                                }
                            } else {
                                console.warn("No user profile data was returned");
                            }
                        } catch (profileError) {
                            console.warn('Failed to fetch user profile, attempting retry with fresh token', profileError);
                            
                            // Try one more time with a fresh token
                            try {
                                const freshToken = await user.getIdToken(true); // Force token refresh
                                localStorage.setItem('authToken', freshToken);
                                console.log("Retrying profile fetch with fresh token");
                                
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                await UserService.fetchUserProfile(user);
                            } catch (retryError) {
                                console.error("Profile fetch retry failed:", retryError);
                            }
                        }
                        
                        this.updateUI();
                        this.enableLoginRequiredFeatures();
                        
                        if (window.Modal && typeof window.Modal.hide === 'function') {
                            window.Modal.hide();
                        }
                        
                        if (window.showToast) {
                            window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
                        }
                    } else {
                        console.error('Failed to obtain valid token');
                    }
                } catch (error) {
                    console.error('Auth state update error:', error);
                    ErrorHandler.handleAuthError(error, 
                        () => TokenManager.refreshToken(this.user), 
                        () => this.logout()
                    );
                }
            } else {
                this.user = null;
                this.isLoggedIn = false;
                TokenManager.clearTokenData();
                
                this.updateUI();
                this.disableLoginRequiredFeatures();
            }
        });
    }
    
    // Secure Redirect Handling
    static async handleSecureRedirect(targetUrl) {
        try {
            if (!this.isLoggedIn || !this.user) {
                throw new Error('User must be logged in');
            }

            // Get current token or refresh if needed
            let token = TokenManager.getCurrentToken();
            if (!TokenManager.validateToken(token)) {
                token = await TokenManager.refreshToken(this.user);
                if (!token) {
                    throw new Error('Failed to generate valid authentication token');
                }
            }

            // Build the redirect URL with authentication parameters
            const redirectUrl = new URL(targetUrl);
            redirectUrl.searchParams.append('token', token);
            redirectUrl.searchParams.append('source', 'nextstep-nexn');
            redirectUrl.searchParams.append('uid', this.user.uid);

            // Store the token in sessionStorage for retrieval on the destination page
            sessionStorage.setItem('josaa_auth_token', token);
            
            console.log('Redirecting to:', redirectUrl.toString().replace(token, 'TOKEN-REDACTED'));
            
            // Navigate to the target URL
            window.location.href = redirectUrl.toString();
        } catch (error) {
            console.error('Redirect error:', error);
            if (window.showToast) {
                window.showToast('Error accessing application. Please try again.', 'error');
            }
        }
    }
    
    // Button Setup
    static setupAuthButtons() {
        const loginRequiredButtons = document.querySelectorAll('[data-requires-login="true"]');
        
        loginRequiredButtons.forEach(btn => {
            const targetUrl = btn.getAttribute('href') || btn.dataset.href;
            
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                if (!this.isLoggedIn) {
                    if (window.Modal && typeof window.Modal.show === 'function') {
                        window.Modal.show();
                    }
                    return;
                }

                if (targetUrl) {
                    await this.handleSecureRedirect(targetUrl);
                }
            });
        });
    }
    
    // Basic signup handler
    static async handleSignup(event) {
        event.preventDefault();

        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        const validationInputs = [
            {
                element: nameInput,
                value: nameInput.value.trim(),
                validator: Validator.name,
                errorField: 'signupNameError'
            },
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'signupEmailError'
            },
            {
                element: passwordInput,
                value: passwordInput.value,
                validator: Validator.password,
                errorField: 'signupPasswordError'
            }
        ];

        if (!validateForm(validationInputs)) return;

        if (passwordInput.value !== confirmPasswordInput.value) {
            ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );

            await updateProfile(userCredential.user, {
                displayName: nameInput.value.trim()
            });

            await sendEmailVerification(userCredential.user);

            if (window.showToast) {
                window.showToast('Account created! Please verify your email.', 'success');
            }

            event.target.reset();

            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('signupPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
    
    // Login handler
    static async handleLogin(event) {
        event.preventDefault();

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'loginEmailError'
            }
        ];

        if (!validateForm(validationInputs)) return;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';

            // Check if account is rate-limited before attempting login
            const isRateLimited = localStorage.getItem(`rate_limited_${emailInput.value.trim()}`);
            if (isRateLimited) {
                const rateLimitExpiry = parseInt(isRateLimited);
                if (Date.now() < rateLimitExpiry) {
                    throw { 
                        code: 'auth/too-many-requests',
                        message: 'Too many login attempts. Please try again later or reset your password.'
                    };
                } else {
                    // Rate limit expired, clear it
                    localStorage.removeItem(`rate_limited_${emailInput.value.trim()}`);
                }
            }

            const userCredential = await signInWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );

            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                await sendEmailVerification(userCredential.user);
                await signOut(auth);
                if (window.showToast) {
                    window.showToast('Please verify your email. Verification link sent.', 'warning');
                }
                return;
            }

            // Get and store authentication token
            const token = await TokenManager.getFirebaseToken(userCredential.user);
            localStorage.setItem('authToken', token);
            console.log("Login successful, token stored");

            // Close modal if successful
            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }

        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('loginPasswordError', errorMessage);
            
            // Handle rate limiting with local tracking
            if (error.code === 'auth/too-many-requests') {
                // Set a 30-minute rate limit
                const thirtyMinutesFromNow = Date.now() + (30 * 60 * 1000);
                localStorage.setItem(`rate_limited_${emailInput.value.trim()}`, thirtyMinutesFromNow.toString());
                ErrorHandler.offerPasswordReset();
            }
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
    
    // Google login handler
    static async handleGoogleLogin() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const token = await TokenManager.getFirebaseToken(result.user);
            localStorage.setItem('authToken', token);

            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }
        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('googleLoginError', errorMessage);
        }
    }
    
    // Password reset handler
    static async handleForgotPassword(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('resetEmail');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'resetEmailError'
            }
        ];
        
        if (!validateForm(validationInputs)) return;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            await sendPasswordResetEmail(auth, emailInput.value.trim());
            
            // Clear any rate limiting for this email after password reset
            localStorage.removeItem(`rate_limited_${emailInput.value.trim()}`);
            
            if (window.showToast) {
                window.showToast('Password reset email sent!', 'success');
            }
            
            if (window.Modal && typeof window.Modal.toggleForms === 'function') {
                window.Modal.toggleForms('login');
            }
            
        } catch (error) {
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('resetEmailError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    }
    
    // Logout handler
    static async logout() {
        try {
            await signOut(auth);
            TokenManager.clearTokenData();
            
            if (window.showToast) {
                window.showToast('Logged out successfully', 'info');
            }
        } catch (error) {
            console.error('Logout error:', error);
            if (window.showToast) {
                window.showToast('Error logging out', 'error');
            }
        }
    }
    
    // UI Updates
    static updateUI() {
        const loginRequiredButtons = document.querySelectorAll('[data-requires-login="true"]');
        const userInfoContainer = document.getElementById('user-info');
        
        loginRequiredButtons.forEach(btn => {
            btn.classList.toggle('active', this.isLoggedIn);
        });

        if (userInfoContainer) {
            userInfoContainer.innerHTML = this.isLoggedIn 
                ? `<div class="user-dropdown">
                    <button class="user-dropdown-toggle">
                        <i class="fas fa-user-circle"></i>
                        <span class="username">${this.user.displayName || this.user.email}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown-menu">
                        <a href="${this.userRole === 'admin' ? '/admin/dashboard.html' : '/admin/users.html'}" class="dashboard-link">
                            <i class="fas ${this.userRole === 'admin' ? 'fa-tachometer-alt' : 'fa-user'}"></i> 
                            ${this.userRole === 'admin' ? 'Admin Dashboard' : 'My Profile'}
                        </a>
                        <a href="#" class="logout-link" onclick="Auth.logout(); return false;">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </div>`
                : `<button onclick="Modal.show()" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i> Login
                   </button>`;
                   
            // Add event listeners to dropdown elements if logged in
            if (this.isLoggedIn) {
                const toggleButton = userInfoContainer.querySelector('.user-dropdown-toggle');
                if (toggleButton) {
                    toggleButton.addEventListener('click', (event) => {
                        event.preventDefault();
                        const dropdownMenu = userInfoContainer.querySelector('.user-dropdown-menu');
                        if (dropdownMenu) {
                            dropdownMenu.classList.toggle('active');
                        }
                    });
                }
            }
        }
    }

    static enableLoginRequiredFeatures() {
        document.querySelectorAll('[data-requires-login="true"]').forEach(el => {
            el.disabled = false;
            el.classList.remove('disabled');
        });
    }

    static disableLoginRequiredFeatures() {
        document.querySelectorAll('[data-requires-login="true"]').forEach(el => {
            el.disabled = true;
            el.classList.add('disabled');
        });
    }
}

// Export AuthService as a named export
export { AuthService };

// You can also add a default export if you want
export default AuthService;
