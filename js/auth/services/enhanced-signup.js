/**
 * Enhanced signup service with exam data collection
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
    /**
     * Initialize enhanced signup functionality
     */
    static init() {
        // Set up exam field handlers
        ExamService.init();
        
        // Replace form submission handler
        const signupForm = document.querySelector('#signupForm form') || document.getElementById('signupForm');
        if (signupForm) {
            // Remove all existing listeners by cloning and replacing the element
            const newForm = signupForm.cloneNode(true);
            signupForm.parentNode.replaceChild(newForm, signupForm);
            
            // Add our single event listener
            newForm.addEventListener('submit', (e) => this.handleEnhancedSignup(e));
            
            console.log('Enhanced signup handler attached');
        }
    }
    
    /**
     * Validate the enhanced signup form
     * @returns {boolean} Whether validation passed
     */
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
                validator: Validator.name,
                errorField: 'signupNameError',
                displayError: ErrorHandler.displayError
            },
            {
                element: emailInput,
                value: emailInput.value.trim(),
                validator: Validator.email,
                errorField: 'signupEmailError',
                displayError: ErrorHandler.displayError
            },
            {
                element: mobileInput,
                value: mobileInput.value.trim(),
                validator: Validator.mobileNumber,
                errorField: 'mobileNumberError',
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
        
        if (!validateForm(coreValidation)) return false;
        
        // Password match validation
        if (passwordInput.value !== confirmPasswordInput.value) {
            ErrorHandler.displayError('confirmPasswordError', 'Passwords do not match');
            confirmPasswordInput.focus();
            return false;
        }
        
        // Terms validation
        if (!termsCheckbox.checked) {
            ErrorHandler.displayError('termsError', 'You must agree to the terms and conditions');
            return false;
        }
        
        // Validate exam rank fields if applicable
        return ExamService.validateExamFields();
    }
    
    /**
     * Handle enhanced signup process
     * @param {Event} event - Form submission event
     */
    static async handleEnhancedSignup(event) {
        event.preventDefault();

        const nameInput = document.getElementById('signupName');
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const mobileInput = document.getElementById('mobileNumber');
        const submitButton = event.target.querySelector('button[type="submit"]');

        // Form validation
        if (!this.validateEnhancedForm()) return;

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
                const errorMessage = ErrorHandler.mapAuthError(authError);
                ErrorHandler.displayError('signupPasswordError', errorMessage);
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
            const examData = ExamService.collectExamDataFromForm();

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

                // Use retry logic with increasing delays via UserService
                const success = await UserService.createUserProfile(userCredential.user, userData);
                
                if (!success) {
                    console.error("All attempts to store user data failed");
                    if (window.showToast) {
                        window.showToast('Account created but profile data storage failed. Some features may be limited.', 'warning');
                    }
                }
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
            ErrorHandler.displayError('signupPasswordError', errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    }
}

export default EnhancedSignupService;