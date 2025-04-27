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
import { TokenManager } from '../utils/token-manager.js';
import UserService from './user-service.js';

class AuthService {
    // Class properties
    static isLoggedIn = false;
    static user = null;
    
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
        }
    }
    
    // Authentication State Management
static setupAuthStateListener() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            this.user = user;
            this.isLoggedIn = true;
            
            try {
                const token = await TokenManager.getFirebaseToken(user);
                if (token) {
                    localStorage.setItem('authToken', token);
                    // Set up token refresh interval
                    TokenManager.setupTokenRefresh(user);
                }
                
                // Fetch the user profile from Firestore if needed
                await UserService.fetchUserProfile(user);
                
                // Check if there's pending profile data to sync
                await UserService.syncPendingProfile(user);
                
                this.updateUI();
                this.enableLoginRequiredFeatures();
                
                if (window.showToast) {
                    window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
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
                ? `<div class="user-menu">
                    <span>Welcome, ${this.user.displayName || this.user.email}</span>
                    <button onclick="Auth.logout()" class="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                   </div>`
                : `<button onclick="Modal.show()" class="login-btn">
                    <i class="fas fa-sign-in-alt"></i> Login
                   </button>`;
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
