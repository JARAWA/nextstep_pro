import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    sendEmailVerification,
    getIdToken
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC7tvZe9NeHRhYuTVrQnkaSG7Nkj3ZS40U",
    authDomain: "nextstep-log.firebaseapp.com",
    projectId: "nextstep-log",
    storageBucket: "nextstep-log.firebasestorage.app",
    messagingSenderId: "9308831285",
    appId: "1:9308831285:web:d55ed6865804c50f743b7c",
    measurementId: "G-BPGP3TBN3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Ensure Firestore is initialized
const googleProvider = new GoogleAuthProvider();

class AuthService {
    // Class properties
    static isLoggedIn = false;
    static user = null;
    static authToken = null;
    static tokenRefreshInterval = null;
    static lastTokenRefresh = null;
    static userData = null;

    // Constants
    static TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes
    static TOKEN_EXPIRY_THRESHOLD = 5 * 60 * 1000;  // 5 minutes
    static MAX_RETRY_ATTEMPTS = 3;
    static RETRY_DELAY = 1000; // 1 second

    // Validation Utility
    static Validator = {
        email: (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
                isValid: emailRegex.test(email.trim()),
                error: 'Please enter a valid email address'
            };
        },

        password: (password) => {
            const validations = [
                {
                    test: (pw) => pw.length >= 8,
                    message: 'Password must be at least 8 characters long'
                },
                {
                    test: (pw) => /[A-Z]/.test(pw),
                    message: 'Must contain at least one uppercase letter'
                },
                {
                    test: (pw) => /[a-z]/.test(pw),
                    message: 'Must contain at least one lowercase letter'
                },
                {
                    test: (pw) => /[0-9]/.test(pw),
                    message: 'Must contain at least one number'
                },
                {
                    test: (pw) => /[!@#$%^&*]/.test(pw),
                    message: 'Must contain at least one special character'
                }
            ];

            const failedValidation = validations.find(v => !v.test(password));
            return {
                isValid: !failedValidation,
                error: failedValidation ? failedValidation.message : ''
            };
        },

        name: (name) => ({
            isValid: name.trim().length >= 2,
            error: 'Name must be at least 2 characters long'
        }),
        
        mobileNumber: (number) => {
            // Indian mobile number validation - 10 digits
            const mobileRegex = /^[6-9]\d{9}$/;
            return {
                isValid: mobileRegex.test(number.trim()),
                error: 'Please enter a valid 10-digit mobile number'
            };
        }
    };

    // Error Handler Utility
    static ErrorHandler = {
        mapAuthError: (error) => {
            const errorMap = {
                'auth/email-already-in-use': 'Email is already registered',
                'auth/invalid-email': 'Invalid email address',
                'auth/weak-password': 'Password is too weak',
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/too-many-requests': 'Too many login attempts. Please try again later.',
                'auth/popup-closed-by-user': 'Login popup was closed',
                'auth/cancelled-popup-request': 'Login popup was cancelled',
                'auth/network-request-failed': 'Network error. Please check your connection.',
                'auth/internal-error': 'An internal error occurred. Please try again.',
                'auth/invalid-credential': 'Invalid login credentials',
                'auth/operation-not-allowed': 'This login method is not enabled',
                'auth/account-exists-with-different-credential': 'An account already exists with this email',
                'auth/requires-recent-login': 'Please log in again to continue',
                'auth/id-token-expired': 'Session expired. Please log in again',
                // Add these Firestore error codes
                'permission-denied': 'Missing or insufficient permissions',
                'resource-exhausted': 'Database operation limit exceeded, please try again later',
                'unauthenticated': 'Authentication required',
                'unavailable': 'Service is currently unavailable, please try again later'
            };

            return errorMap[error.code] || error.message || 'An unexpected error occurred';
        },

        displayError: (errorField, errorMessage) => {
            if (window.Modal && typeof window.Modal.showError === 'function') {
                window.Modal.showError(errorField, errorMessage);
            }

            if (window.showToast) {
                window.showToast(errorMessage, 'error');
            }

            console.error('Auth Error:', errorMessage);
        },

        handleAuthError: async (error) => {
            console.error('Auth error:', error);

            if (error.code === 'auth/id-token-expired') {
                const newToken = await this.refreshToken();
                if (newToken) return newToken;
            }

            await this.logout();
            if (window.showToast) {
                window.showToast('Session expired. Please log in again.', 'warning');
            }

            return null;
        }
    };

    // Initialize Authentication Service
// Modify the init method to ensure proper initialization
static async init() {
    console.log('Initializing Authentication Service');
    
    try {
        // Test Firestore connection during initialization
        const firestoreConnected = await this.debugFirestoreConnection();
        if (!firestoreConnected) {
            console.warn("Firestore connection issues detected during initialization");
        }
        
        this.setupAuthStateListener();
        this.setupAuthButtons();
        await this.checkExistingSession();
        
        console.log('Authentication Service initialized successfully');
    } catch (error) {
        console.error('Error during Authentication Service initialization:', error);
    }
}
    
    // Enhanced initialization with extended features
static async initExtended() {
    console.log('Initializing Enhanced Authentication Service');
    // Call the original init method first
    this.init();
    
    // Set up dynamic exam field handlers
    this.setupDynamicExamFields();
    
    // IMPROVED: Completely replace form submission handler instead of adding another one
    const signupForm = document.querySelector('#signupForm form') || document.getElementById('signupForm');
    if (signupForm) {
        // Remove all existing listeners by cloning and replacing the element
        const newForm = signupForm.cloneNode(true);
        signupForm.parentNode.replaceChild(newForm, signupForm);
        
        // Add our single event listener
        newForm.addEventListener('submit', (e) => this.handleEnhancedSignup(e));
        
        console.log('Enhanced signup handler attached');
    }
    
    // Add event listener for exam data form if it exists
    const examDataForm = document.getElementById('exam-data-form');
    if (examDataForm) {
        examDataForm.addEventListener('submit', (e) => this.handleExamDataForm(e));
    }
}

    // Check for existing session
    static async checkExistingSession() {
        const savedToken = localStorage.getItem('authToken');
        if (savedToken && this.validateToken(savedToken)) {
            this.authToken = savedToken;
            // Additional session validation can be added here
        }
    }

    // Token Management Methods
    static async getFirebaseToken() {
        if (!this.user) return null;
        
        try {
            const token = await getIdToken(this.user, true);
            this.lastTokenRefresh = Date.now();
            return token;
        } catch (error) {
            console.error('Error getting Firebase token:', error);
            return null;
        }
    }

    static async refreshToken() {
        if (!this.user) return null;
        
        try {
            const token = await this.getFirebaseToken();
            if (token) {
                this.authToken = token;
                localStorage.setItem('authToken', token);
            }
            return token;
        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }

    static validateToken(token) {
        if (!token) return false;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            const exp = payload.exp * 1000;
            
            return Date.now() < exp - this.TOKEN_EXPIRY_THRESHOLD;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Authentication State Management
    static setupAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.user = user;
                this.isLoggedIn = true;
                
                try {
                    this.authToken = await this.getFirebaseToken();
                    localStorage.setItem('authToken', this.authToken);
                    
                    // Set up token refresh interval
                    if (this.tokenRefreshInterval) {
                        clearInterval(this.tokenRefreshInterval);
                    }
                    
                    this.tokenRefreshInterval = setInterval(async () => {
                        await this.refreshToken();
                    }, this.TOKEN_REFRESH_INTERVAL);
                    
                    await this.fetchUserProfile();
                    this.updateUI();
                    this.enableLoginRequiredFeatures();
                    
                    if (window.showToast) {
                        window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
                    }
                } catch (error) {
                    console.error('Auth state update error:', error);
                    this.ErrorHandler.handleAuthError(error);
                }
            } else {
                this.user = null;
                this.isLoggedIn = false;
                this.authToken = null;
                localStorage.removeItem('authToken');
                
                if (this.tokenRefreshInterval) {
                    clearInterval(this.tokenRefreshInterval);
                }
                
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

            let token = this.authToken;
            if (!this.validateToken(token)) {
                token = await this.refreshToken();
                if (!token) {
                    throw new Error('Failed to generate valid authentication token');
                }
            }

            const redirectUrl = new URL(targetUrl);
            redirectUrl.searchParams.append('token', token);
            redirectUrl.searchParams.append('source', 'nextstep-nexn');
            redirectUrl.searchParams.append('uid', this.user.uid);

            // Store the token in sessionStorage for retrieval on the destination page
            sessionStorage.setItem('josaa_auth_token', token);
            
            console.log('Redirecting to:', redirectUrl.toString().replace(token, 'TOKEN-REDACTED'));
            
            // Option 1: Use same tab navigation to preserve referrer
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

    // Authentication Methods
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
                validator: this.Validator.name,
                errorField: 'signupNameError'
            },
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: this.Validator.email,
                errorField: 'signupEmailError'
            },
            {
                element: passwordInput,
                value: passwordInput.value,
                validator: this.Validator.password,
                errorField: 'signupPasswordError'
            }
        ];

        if (!this.validateForm(validationInputs)) return;

        if (passwordInput.value !== confirmPasswordInput.value) {
            this.ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
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
            const errorMessage = this.ErrorHandler.mapAuthError(error);
            this.ErrorHandler.displayError('signupPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
    
static setupDynamicExamFields() {
    const examCheckboxes = document.querySelectorAll('.exam-checkbox');
    const dynamicRankFields = document.getElementById('dynamicRankFields');
    
    if (!examCheckboxes || !dynamicRankFields) return;
    
    const examRankFields = {
        hasJeeMain: {
            id: 'jeeMainRank',
            label: 'JEE Main Rank',
            placeholder: 'Enter your JEE Main rank'
        },
        hasJeeAdvanced: {
            id: 'jeeAdvancedRank',
            label: 'JEE Advanced Rank',
            placeholder: 'Enter your JEE Advanced rank'
        },
        hasMhtcet: {
            id: 'mhtcetRank',
            label: 'MHT-CET Rank',
            placeholder: 'Enter your MHT-CET rank'
        },
        hasNeet: {
            id: 'neetRank',
            label: 'NEET-UG Rank',
            placeholder: 'Enter your NEET-UG rank'
        }
    };
    
    // Initial render based on defaults
    this.renderDynamicFields(examCheckboxes, dynamicRankFields, examRankFields);
    
    // Update fields on checkbox changes
    examCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            this.renderDynamicFields(examCheckboxes, dynamicRankFields, examRankFields);
        });
    });
    
    // Add this line to populate fields with existing data
    this.populateExamFields();
}
    
    // Render dynamic rank fields based on selected exams
    static renderDynamicFields(checkboxes, container, fieldConfigs) {
        container.innerHTML = '';
        
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const fieldConfig = fieldConfigs[checkbox.id];
                if (fieldConfig) {
                    const fieldDiv = document.createElement('div');
                    fieldDiv.className = 'form-group rank-field active';
                    fieldDiv.innerHTML = `
                        <label for="${fieldConfig.id}">${fieldConfig.label}*</label>
                        <input type="number" id="${fieldConfig.id}" placeholder="${fieldConfig.placeholder}" required>
                        <div id="${fieldConfig.id}Error" class="error-message"></div>
                    `;
                    container.appendChild(fieldDiv);
                }
            }
        });
    }
    
    // Enhanced form validation
    static validateEnhancedForm() {
        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const mobileInput = document.getElementById('mobileNumber');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const termsCheckbox = document.getElementById('termsAgreed');
        
        // Core validation
        const coreValidation = [
            {
                element: nameInput,
                value: nameInput.value.trim(),
                validator: this.Validator.name,
                errorField: 'signupNameError'
            },
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: this.Validator.email,
                errorField: 'signupEmailError'
            },
            {
                element: mobileInput,
                value: mobileInput.value.trim(),
                validator: this.Validator.mobileNumber,
                errorField: 'mobileNumberError'
            },
            {
                element: passwordInput,
                value: passwordInput.value,
                validator: this.Validator.password,
                errorField: 'signupPasswordError'
            }
        ];
        
        if (!this.validateForm(coreValidation)) return false;
        
        // Password match validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            this.ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
            confirmPasswordInput.focus();
            return false;
        }
        
        // Terms validation
        if (!termsCheckbox.checked) {
            this.ErrorHandler.displayError('termsError', 'You must agree to the terms and conditions');
            return false;
        }
        
        // Validate exam rank fields if applicable
        const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
        const examValidations = Array.from(examCheckboxes).map(checkbox => {
            const fieldId = checkbox.id.replace('has', '') + 'Rank';
            const rankInput = document.getElementById(fieldId);
            
            if (!rankInput) return null;
            
            return {
                element: rankInput,
                value: rankInput.value.trim(),
                validator: (value) => ({
                    isValid: /^\d+$/.test(value) && parseInt(value) > 0,
                    error: 'Please enter a valid rank number'
                }),
                errorField: `${fieldId}Error`
            };
        }).filter(Boolean);
        
        if (examValidations.length > 0 && !this.validateForm(examValidations)) {
            return false;
        }
        
        return true;
    }
    
// Enhanced signup handler
static async handleEnhancedSignup(event) {
    event.preventDefault();

    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const mobileInput = document.getElementById('mobileNumber');
    const submitButton = event.target.querySelector('button[type="submit"]');

    // Form validation
    const validationInputs = [
        {
            element: nameInput,
            value: nameInput.value.trim(),
            validator: this.Validator.name,
            errorField: 'signupNameError'
        },
        {
            element: emailInput,
            value: emailInput.value.trim(),
            validator: this.Validator.email,
            errorField: 'signupEmailError'
        },
        {
            element: mobileInput,
            value: mobileInput.value.trim(),
            validator: this.Validator.mobileNumber,
            errorField: 'mobileNumberError'
        },
        {
            element: passwordInput,
            value: passwordInput.value,
            validator: this.Validator.password,
            errorField: 'signupPasswordError'
        }
    ];

    if (!this.validateForm(validationInputs)) return;

    if (passwordInput.value !== confirmPasswordInput.value) {
        this.ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
        return;
    }

    // Validate exam checkbox selections
    const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
    const examRankValidations = Array.from(examCheckboxes).map(checkbox => {
        const examType = checkbox.id.replace('has', '');
        const fieldId = examType + 'Rank';
        const rankInput = document.getElementById(fieldId);
        
        if (!rankInput) return null;
        
        return {
            element: rankInput,
            value: rankInput.value.trim(),
            validator: (value) => ({
                isValid: /^\d+$/.test(value) && parseInt(value) > 0,
                error: `Please enter a valid ${examType} rank number`
            }),
            errorField: `${fieldId}Error`
        };
    }).filter(Boolean);
    
    if (examRankValidations.length > 0 && !this.validateForm(examRankValidations)) {
        return;
    }

    let userCredential = null;

    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

        // Step 1: Create Firebase Auth user
        try {
            userCredential = await createUserWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );
            
            console.log("Firebase Auth user created with UID:", userCredential.user.uid);
        } catch (authError) {
            // Handle authentication errors
            const errorMessage = this.ErrorHandler.mapAuthError(authError);
            this.ErrorHandler.displayError('signupPasswordError', errorMessage);
            throw new Error(`Auth creation failed: ${errorMessage}`);
        }

        // Step 2: Update user profile and send verification email
        try {
            await updateProfile(userCredential.user, {
                displayName: nameInput.value.trim()
            });
            await sendEmailVerification(userCredential.user);
        } catch (profileError) {
            console.error("Error updating profile:", profileError);
            // Continue despite profile update errors - not critical
        }

        // Step 3: Collect exam data
        const examData = {};
        examCheckboxes.forEach(checkbox => {
            const examType = checkbox.id.replace('has', '');
            const fieldId = examType + 'Rank';
            const rankInput = document.getElementById(fieldId);
            
            if (rankInput && rankInput.value.trim()) {
                examData[examType] = {
                    rank: parseInt(rankInput.value.trim()),
                    dateAdded: new Date().toISOString()
                };
            }
        });

        // Step 4: Create Firestore user document
        try {
            const userData = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                mobileNumber: mobileInput.value.trim(),
                userRole: "student",
                examData: examData,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };

            // IMPORTANT: Add retry logic with increasing delays
            let retryCount = 0;
            const maxRetries = 3;
            let success = false;
            
            while (!success && retryCount < maxRetries) {
                try {
                    console.log(`Attempt ${retryCount + 1} to store user data for UID: ${userCredential.user.uid}`);
                    
                    // Wait longer between each retry (exponential backoff)
                    if (retryCount > 0) {
                        const delayMs = 1000 * Math.pow(2, retryCount - 1); // 1s, 2s, 4s...
                        console.log(`Waiting ${delayMs}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                    
                    console.log("Attempting to store user data for UID:", userCredential.user.uid);
                    
                    // IMPORTANT: Use a direct document reference with proper path
                    const userDocRef = doc(db, "users", userCredential.user.uid);
                    await setDoc(userDocRef, userData);
                    
                    console.log("User profile data stored successfully");
                    success = true; // Mark as successful to exit the loop
                } catch (firestoreError) {
                    console.error(`Firestore error on attempt ${retryCount + 1}:`, firestoreError);
                    retryCount++;
                    
                    // On the last attempt, notify the user
                    if (retryCount >= maxRetries) {
                        console.error("All attempts to store user data failed");
                        if (window.showToast) {
                            window.showToast('Account created but profile data storage failed. Some features may be limited.', 'warning');
                        }
                    }
                }
            } // End of while loop
        } catch (userDataError) {
            console.error("Error storing user data:", userDataError);
            if (window.showToast) {
                window.showToast('Account created but there was an error saving your profile data.', 'warning');
            }
        }

        // Success notifications
        if (window.showToast) {
            window.showToast('Account created! Please verify your email.', 'success');
        }

        // Reset the form and hide modal
        event.target.reset();
        if (window.Modal && typeof window.Modal.hide === 'function') {
            window.Modal.hide();
        }

    } catch (error) {
        console.error("Signup process error:", error);
        
        // If we created a user but failed later steps, we might want to clean up
        // This is optional and depends on your requirements
        if (userCredential && userCredential.user) {
            try {
                console.log("Cleaning up failed signup - deleting user");
                await userCredential.user.delete();
            } catch (deleteError) {
                console.error("Failed to clean up user after error:", deleteError);
            }
        }
        
        // Display error to user
        const errorMessage = error.message || "Failed to create account. Please try again.";
        this.ErrorHandler.displayError('signupPasswordError', errorMessage);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
}

    static async updateExamData(examUpdates) {
    if (!this.user) {
        if (window.showToast) {
            window.showToast('You must be logged in to update exam data', 'error');
        }
        return false;
    }
    
    try {
        const userDocRef = doc(db, "users", this.user.uid);
        
        // First get current user data to merge with updates
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        const currentExamData = userData.examData || {};
        
        // Merge current exam data with updates
        const updatedExamData = {
            ...currentExamData,
            ...examUpdates
        };
        
        // Update only the examData field and lastUpdated timestamp
        await updateDoc(userDocRef, {
            examData: updatedExamData,
            lastUpdated: new Date().toISOString()
        });
        
        console.log("Exam data updated successfully:", updatedExamData);
        
        if (window.showToast) {
            window.showToast('Exam information updated successfully', 'success');
        }
        
        return true;
    } catch (error) {
        console.error("Error updating exam data:", error);
        
        if (window.showToast) {
            window.showToast('Failed to update exam information', 'error');
        }
        
        return false;
    }
}

static async handleExamDataForm(event) {
    event.preventDefault();
    
    const examCheckboxes = document.querySelectorAll('.exam-checkbox:checked');
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Validate all exam rank inputs
    const examRankValidations = Array.from(examCheckboxes).map(checkbox => {
        const examType = checkbox.id.replace('has', '');
        const fieldId = examType + 'Rank';
        const rankInput = document.getElementById(fieldId);
        
        if (!rankInput) return null;
        
        return {
            element: rankInput,
            value: rankInput.value.trim(),
            validator: (value) => ({
                isValid: /^\d+$/.test(value) && parseInt(value) > 0,
                error: `Please enter a valid ${examType} rank number`
            }),
            errorField: `${fieldId}Error`
        };
    }).filter(Boolean);
    
    if (examRankValidations.length > 0 && !this.validateForm(examRankValidations)) {
        return;
    }
    
    try {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        
        // Collect exam data from selected exams and their rank fields
        const examData = {};
        examCheckboxes.forEach(checkbox => {
            const examType = checkbox.id.replace('has', '');
            const fieldId = examType + 'Rank';
            const rankInput = document.getElementById(fieldId);
            
            if (rankInput && rankInput.value.trim()) {
                examData[examType] = {
                    rank: parseInt(rankInput.value.trim()),
                    verified: false,
                    dateUpdated: new Date().toISOString()
                };
            }
        });
        
        // Update exam data in Firestore
        const success = await this.updateExamData(examData);
        
        if (success && window.showToast) {
            window.showToast('Exam information updated successfully', 'success');
        }
        
    } catch (error) {
        console.error("Error updating exam data:", error);
        
        if (window.showToast) {
            window.showToast('Failed to update exam information', 'error');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
}

    static async populateExamFields() {
    if (!this.user) return;
    
    try {
        // Fetch user data
        const userData = await this.fetchUserProfile();
        if (!userData || !userData.examData) return;
        
        const examData = userData.examData;
        
        // For each exam type in the user's data, check the corresponding checkbox
        // and populate the rank field
        Object.keys(examData).forEach(examType => {
            const checkboxId = 'has' + examType;
            const checkbox = document.getElementById(checkboxId);
            
            if (checkbox) {
                // Check the box
                checkbox.checked = true;
                
                // Trigger the change event to render the field
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
                
                // Wait for the field to render, then populate it
                setTimeout(() => {
                    const rankInputId = examType + 'Rank';
                    const rankInput = document.getElementById(rankInputId);
                    
                    if (rankInput && examData[examType].rank) {
                        rankInput.value = examData[examType].rank;
                    }
                }, 100);
            }
        });
    } catch (error) {
        console.error("Error populating exam fields:", error);
    }
}

// Third fix - Add a debug method to help troubleshoot Firestore connectivity
static async debugFirestoreConnection() {
    try {
        console.log("Testing Firestore connection...");
        
        // Test if we can write to a test collection
        const testDocRef = doc(db, "system_test", "connection_test");
        await setDoc(testDocRef, {
            timestamp: new Date().toISOString(),
            test: "Connection test"
        });
        
        console.log("Firestore write test successful");
        
        // Test if we can read from the test collection
        const docSnap = await getDoc(testDocRef);
        if (docSnap.exists()) {
            console.log("Firestore read test successful:", docSnap.data());
            return true;
        } else {
            console.error("Firestore read test failed: Document not found");
            return false;
        }
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        return false;
    }
}
    
    static async handleLogin(event) {
        event.preventDefault();

        const emailInput = document.getElementById('loginEmail');
        const passwordInput = document.getElementById('loginPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');

        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: this.Validator.email,
                errorField: 'loginEmailError'
            }
        ];

        if (!this.validateForm(validationInputs)) return;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging In...';

            const userCredential = await signInWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );

            if (!userCredential.user.emailVerified) {
                await sendEmailVerification(userCredential.user);
                await signOut(auth);
                if (window.showToast) {
                    window.showToast('Please verify your email. Verification link sent.', 'warning');
                }
                return;
            }

            this.authToken = await this.getFirebaseToken();
            localStorage.setItem('authToken', this.authToken);

            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }

        } catch (error) {
            const errorMessage = this.ErrorHandler.mapAuthError(error);
            this.ErrorHandler.displayError('loginPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }

    static async handleGoogleLogin() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            this.authToken = await this.getFirebaseToken();
            localStorage.setItem('authToken', this.authToken);

            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }

            if (window.showToast) {
                window.showToast('Login successful!', 'success');
            }
        } catch (error) {
            const errorMessage = this.ErrorHandler.mapAuthError(error);
            this.ErrorHandler.displayError('googleLoginError', errorMessage);
        }
    }
    
    static async handleForgotPassword(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('resetEmail');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        const validationInputs = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: this.Validator.email,
                errorField: 'resetEmailError'
            }
        ];
        
        if (!this.validateForm(validationInputs)) return;
        
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
            const errorMessage = this.ErrorHandler.mapAuthError(error);
            this.ErrorHandler.displayError('resetEmailError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        }
    }

    static async logout() {
        try {
            await signOut(auth);
            this.authToken = null;
            localStorage.removeItem('authToken');
            
            if (this.tokenRefreshInterval) {
                clearInterval(this.tokenRefreshInterval);
            }
            
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

    // Form Validation
    static validateForm(inputs) {
        for (const input of inputs) {
            const { isValid, error } = input.validator(input.value);
            if (!isValid) {
                this.ErrorHandler.displayError(input.errorField, error);
                input.element.focus();
                return false;
            }
        }
        return true;
    }
    
    // Fetch user profile
    static async fetchUserProfile() {
        if (!this.user) return null;
        
        try {
            const userDoc = await getDoc(doc(db, "users", this.user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("User profile data loaded:", userData);
                return userData;
            } else {
                console.log("No user profile found");
                // This is a placeholder for any additional user profile fetching logic
                console.log('User profile fetched for:', this.user.email);
                return null;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    }
    
    // Enable admin-specific features in the UI
    static enableAdminFeatures() {
        // Add admin panel link to navigation
        const navContainer = document.querySelector('.nav-links');
        if (navContainer && !document.getElementById('admin-link')) {
            const adminLink = document.createElement('li');
            adminLink.id = 'admin-link';
            adminLink.innerHTML = `
                <a href="admin/dashboard.html" class="admin-link">
                    <i class="fas fa-user-shield"></i> Admin Panel
                </a>
            `;
            navContainer.appendChild(adminLink);
        }
    }
}
// Add this at the END of your auth.js file
export { AuthService };  // Export the entire class
export default AuthService;  // Optional: default export

// Optional: Expose static methods globally if needed
window.Auth = AuthService;
