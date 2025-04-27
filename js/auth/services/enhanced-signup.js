/**
 * Enhanced signup service with two-step process
 */
import { 
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { auth } from './firebase-config.js';
import { Validator, validateForm } from '../utils/validation.js';
import { ErrorHandler } from '../utils/error-handler.js';
import UserService from './user-service.js';
import ExamService from './exam-service.js';

class EnhancedSignupService {
    // Track current step
    static currentStep = 1;
    static newUser = null;
    
    /**
     * Initialize enhanced signup functionality
     */
    static init() {
        // Set up exam field handlers
        ExamService.init();
        
        // Create the two-step modal structure if it doesn't exist
        this.createTwoStepModalStructure();
        
        // Replace form submission handler
        const signupStep1Form = document.getElementById('signupStep1Form');
        if (signupStep1Form) {
            // Check if we've already initialized this form
            if (signupStep1Form.dataset.enhancedInitialized === 'true') {
                console.log('Enhanced signup step 1 form already initialized, skipping');
                return;
            }
            
            // Mark the form as initialized to prevent double initialization
            signupStep1Form.dataset.enhancedInitialized = 'true';
            
            // Add step 1 event listener
            signupStep1Form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Prevent double submission
                const submitButton = signupStep1Form.querySelector('button[type="submit"]');
                if (submitButton.disabled) {
                    console.log('Form submission already in progress, ignoring duplicate submission');
                    return;
                }
                
                // Process step 1
                this.handleSignupStep1(e);
            });
            
            console.log('Step 1 signup handler attached');
        }
        
        // Set up step 2 form handler
        const signupStep2Form = document.getElementById('signupStep2Form');
        if (signupStep2Form) {
            signupStep2Form.dataset.enhancedInitialized = 'true';
            
            signupStep2Form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Prevent double submission
                const submitButton = signupStep2Form.querySelector('button[type="submit"]');
                if (submitButton.disabled) {
                    console.log('Form submission already in progress, ignoring duplicate submission');
                    return;
                }
                
                // Process step 2
                this.handleSignupStep2(e);
            });
            
            console.log('Step 2 signup handler attached');
        }
    }
    
    /**
     * Create the two-step modal structure
     */
    static createTwoStepModalStructure() {
        const signupForm = document.querySelector('#signupForm');
        if (!signupForm) {
            console.warn('Signup form container not found');
            return;
        }
        
        // Skip if already converted to two-step
        if (document.getElementById('signupStep1Form')) {
            return;
        }
        
        // Get the original form content to split
        const originalForm = signupForm.querySelector('form') || signupForm;
        const formContent = originalForm.innerHTML;
        
        // Extract core fields from the original form
        // Assumes a specific structure of the existing signup form
        const emailField = document.getElementById('signupEmail')?.closest('.form-group')?.outerHTML || 
                          '<div class="form-group"><label for="signupEmail">Email*</label><input type="email" id="signupEmail" required><div id="signupEmailError" class="error-message"></div></div>';
                          
        const passwordField = document.getElementById('signupPassword')?.closest('.form-group')?.outerHTML || 
                             '<div class="form-group"><label for="signupPassword">Password*</label><input type="password" id="signupPassword" required><div id="signupPasswordError" class="error-message"></div></div>';
                             
        const confirmPasswordField = document.getElementById('confirmPassword')?.closest('.form-group')?.outerHTML || 
                                   '<div class="form-group"><label for="confirmPassword">Confirm Password*</label><input type="password" id="confirmPassword" required><div id="confirmPasswordError" class="error-message"></div></div>';
        
        // Create the two-step structure
        signupForm.innerHTML = `
            <!-- Step 1: Account Creation -->
            <div id="signupStep1Container" class="signup-step active">
                <h3>Create Your Account</h3>
                <p class="step-indicator">Step 1 of 2: Account Setup</p>
                
                <form id="signupStep1Form" novalidate>
                    ${emailField}
                    ${passwordField}
                    ${confirmPasswordField}
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-arrow-right"></i> Continue
                        </button>
                    </div>
                    
                    <div class="form-footer">
                        <p>Already have an account? <a href="#" onclick="Modal.toggleForms('login')">Log In</a></p>
                    </div>
                </form>
            </div>
            
            <!-- Step 2: Profile Information -->
            <div id="signupStep2Container" class="signup-step">
                <h3>Complete Your Profile</h3>
                <p class="step-indicator">Step 2 of 2: Profile Information</p>
                
                <form id="signupStep2Form" novalidate>
                    <div class="form-group">
                        <label for="signupName">Full Name*</label>
                        <input type="text" id="signupName" required>
                        <div id="signupNameError" class="error-message"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="mobileNumber">Mobile Number*</label>
                        <input type="tel" id="mobileNumber" required placeholder="10-digit mobile number">
                        <div id="mobileNumberError" class="error-message"></div>
                    </div>
                    
                    <!-- Exam Selection -->
                    <div class="form-group">
                        <label>Select Exams You've Taken</label>
                        <div class="exam-checkboxes">
                            <div class="checkbox-item">
                                <input type="checkbox" id="hasJeeMain" class="exam-checkbox">
                                <label for="hasJeeMain">JEE Main</label>
                            </div>
                            <div class="checkbox-item">
                                <input type="checkbox" id="hasJeeAdvanced" class="exam-checkbox">
                                <label for="hasJeeAdvanced">JEE Advanced</label>
                            </div>
                            <div class="checkbox-item">
                                <input type="checkbox" id="hasMhtcet" class="exam-checkbox">
                                <label for="hasMhtcet">MHT-CET</label>
                            </div>
                            <div class="checkbox-item">
                                <input type="checkbox" id="hasNeet" class="exam-checkbox">
                                <label for="hasNeet">NEET-UG</label>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Dynamic rank fields will be inserted here -->
                    <div id="dynamicRankFields" class="form-group"></div>
                    
                    <div class="form-group terms-checkbox">
                        <input type="checkbox" id="termsAgreed" required>
                        <label for="termsAgreed">I agree to the <a href="terms.html" target="_blank">Terms and Conditions</a>*</label>
                        <div id="termsError" class="error-message"></div>
                    </div>
                    
                    <div class="form-group buttons-row">
                        <button type="button" class="btn btn-secondary" onclick="EnhancedSignupService.goToStep(1)">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-user-plus"></i> Create Account
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        // Add styles for the two-step form
        this.addTwoStepStyles();
        
        // Make sure the exam field handlers are still working
        ExamService.setupDynamicExamFields();
    }
    
    /**
     * Add required styles for the two-step form
     */
    static addTwoStepStyles() {
        const styleId = 'two-step-form-styles';
        
        // Only add styles once
        if (document.getElementById(styleId)) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `
            .signup-step {
                display: none;
            }
            
            .signup-step.active {
                display: block;
            }
            
            .step-indicator {
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 20px;
            }
            
            .buttons-row {
                display: flex;
                justify-content: space-between;
                gap: 10px;
            }
            
            .buttons-row button {
                flex: 1;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Navigate to a specific step
     * @param {number} step - Step number to navigate to
     */
    static goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.signup-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Show the requested step
        const stepEl = document.getElementById(`signupStep${step}Container`);
        if (stepEl) {
            stepEl.classList.add('active');
            this.currentStep = step;
        }
    }
    
    /**
     * Validate step 1 of the signup form
     * @returns {boolean} Whether validation passed
     */
    static validateStep1() {
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        // Email and password validation
        const validations = [
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'signupEmailError',
                displayError: ErrorHandler.displayError
            },
            {
                element: passwordInput,
                value: passwordInput.value,
                validator: Validator.password,
                errorField: 'signupPasswordError',
                displayError: ErrorHandler.displayError
            }
        ];
        
        if (!validateForm(validations)) return false;
        
        // Password match validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
            confirmPasswordInput.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * Validate step 2 of the signup form
     * @returns {boolean} Whether validation passed
     */
    static validateStep2() {
        const nameInput = document.getElementById('signupName');
        const mobileInput = document.getElementById('mobileNumber');
        const termsCheckbox = document.getElementById('termsAgreed');
        
        // Core validation
        const validations = [
            {
                element: nameInput,
                value: nameInput.value.trim(),
                validator: Validator.name,
                errorField: 'signupNameError',
                displayError: ErrorHandler.displayError
            },
            {
                element: mobileInput,
                value: mobileInput.value.trim(),
                validator: Validator.mobileNumber,
                errorField: 'mobileNumberError',
                displayError: ErrorHandler.displayError
            }
        ];
        
        if (!validateForm(validations)) return false;
        
        // Terms validation
        if (!termsCheckbox.checked) {
            ErrorHandler.displayError('termsError', 'You must agree to the terms and conditions');
            return false;
        }
        
        // Validate exam rank fields if applicable
        return ExamService.validateExamFields();
    }
    
    /**
     * Handle step 1 of the signup process - account creation
     * @param {Event} event - Form submission event
     */
    static async handleSignupStep1(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Form validation
        if (!this.validateStep1()) return;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                emailInput.value.trim(), 
                passwordInput.value
            );
            
            console.log("Firebase Auth user created with UID:", userCredential.user.uid);
            
            // Store the user for later steps
            this.newUser = userCredential.user;
            
            // Move to step 2
            this.goToStep(2);
            
        } catch (error) {
            console.error("Account creation error:", error);
            
            // Display error message
            const errorMessage = ErrorHandler.mapAuthError(error);
            ErrorHandler.displayError('signupPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-arrow-right"></i> Continue';
        }
    }
    
    /**
     * Handle step 2 of the signup process - profile creation
     * @param {Event} event - Form submission event
     */
    static async handleSignupStep2(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('signupName');
        const mobileInput = document.getElementById('mobileNumber');
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Make sure we have a user from step 1
        if (!this.newUser) {
            ErrorHandler.displayError('signupNameError', 'Session expired. Please restart the signup process.');
            this.goToStep(1);
            return;
        }
        
        // Form validation
        if (!this.validateStep2()) return;
        
        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completing Setup...';
            
            // Step 1: Update user profile and send verification email
            try {
                await updateProfile(this.newUser, {
                    displayName: nameInput.value.trim()
                });
                await sendEmailVerification(this.newUser);
                console.log("User profile updated and verification email sent");
            } catch (profileError) {
                console.error("Error updating profile:", profileError);
                // Continue despite profile update errors - not critical
            }
            
            // Step 2: Collect exam data
            const examData = ExamService.collectExamDataFromForm();
            console.log("Collected exam data:", JSON.stringify(examData));
            console.log("Exam checkboxes checked:", document.querySelectorAll('.exam-checkbox:checked').length);
            document.querySelectorAll('.exam-checkbox:checked').forEach(checkbox => {
                const examType = checkbox.id.replace('has', '');
                const fieldId = examType + 'Rank';
                const rankInput = document.getElementById(fieldId);
                console.log(`Exam ${examType}: input exists: ${!!rankInput}, value: ${rankInput ? rankInput.value : 'none'}`);
            });
            
            // Step 3: Create Firestore user document
            try {
                const userData = {
                    name: nameInput.value.trim(),
                    email: this.newUser.email,
                    mobileNumber: mobileInput.value.trim(),
                    userRole: "student",
                    examData: examData,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                console.log("Final userData object prepared for storage:", JSON.stringify(userData));
                console.log("examData in userData:", JSON.stringify(userData.examData));
                console.log("Number of exam entries:", Object.keys(userData.examData).length);
                console.log("Attempting to store user data with exams:", 
                    Object.keys(examData).length, "exam entries");
                
                // Use retry logic with increasing delays via UserService
                const success = await UserService.createUserProfile(this.newUser, userData);
                
                if (success) {
                    console.log("User profile stored successfully with exam data:", 
                                Object.keys(examData).length, "exam entries");
                } else {
                    console.error("Failed to store user profile with exam data");
                    
                    // Store data in localStorage for later sync
                    UserService.storeProfileInLocalStorage(this.newUser.uid, userData);
                    
                    if (window.showToast) {
                        window.showToast('Account created but profile data will sync later.', 'info');
                    }
                }
            } catch (userDataError) {
                console.error("Error storing user data:", userDataError);
                
                // Fall back to localStorage storage
                const userData = {
                    name: nameInput.value.trim(),
                    email: this.newUser.email,
                    mobileNumber: mobileInput.value.trim(),
                    userRole: "student",
                    examData: examData,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                
                UserService.storeProfileInLocalStorage(this.newUser.uid, userData);
                
                if (window.showToast) {
                    window.showToast('Account created but profile data will sync later.', 'info');
                }
            }
            
            // Success notifications
            if (window.showToast) {
                window.showToast('Account created! Please verify your email.', 'success');
            }
            
            // Reset the forms and hide modal
            document.getElementById('signupStep1Form').reset();
            document.getElementById('signupStep2Form').reset();
            
            // Reset the step counter for next time
            this.goToStep(1);
            this.newUser = null;
            
            if (window.Modal && typeof window.Modal.hide === 'function') {
                window.Modal.hide();
            }
            
        } catch (error) {
            console.error("Signup process error:", error);
            
            // Display error to user
            const errorMessage = error.message || "Failed to complete setup. Please try again.";
            ErrorHandler.displayError('signupNameError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
    
    /**
     * Original enhanced signup method (for backward compatibility)
     * @param {Event} event - Form submission event
     */
    static async handleEnhancedSignup(event) {
        // Redirect to two-step process
        this.createTwoStepModalStructure();
        this.goToStep(1);
    }
}

// Make the goToStep function available globally
window.EnhancedSignupService = EnhancedSignupService;

export default EnhancedSignupService;
