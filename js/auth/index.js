/**
 * Main entry point for the authentication module
 * Exports all necessary components and provides a global namespace
 */
import { auth, db, googleProvider, testFirestoreConnection } from './services/firebase-config.js';
import AuthService from './services/auth-service.js';
import UserService from './services/user-service.js';
import ExamService from './services/exam-service.js';
import EnhancedSignupService from './services/enhanced-signup.js';
import { Validator, validateForm } from './utils/validation.js';
import { ErrorHandler } from './utils/error-handler.js';
import { TokenManager } from './utils/token-manager.js';

// Main Authentication class that integrates all services
class Auth {
    // Basic initialization
    static async init(options = {}) {
        console.log('Initializing Authentication Service');
        
        try {
            // Check Firestore connection if debug mode is enabled
            if (options.debug) {
                const firestoreConnected = await testFirestoreConnection();
                if (!firestoreConnected) {
                    console.warn("Firestore connection issues detected during initialization");
                }
            }
            
            // Initialize core auth service
            await AuthService.init();
            
            console.log('Authentication Service initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Error during Authentication Service initialization:', error);
            return false;
        }
    }
    
    // Enhanced initialization with extended features
    static async initExtended(options = {}) {
        console.log('Initializing Enhanced Authentication Service');
        
        // Call the basic init method first
        await this.init(options);
        
        // Initialize enhanced signup functionality
        EnhancedSignupService.init();
        
        return true;
    }
    
    // Expose core methods from AuthService
    static get isLoggedIn() { return AuthService.isLoggedIn; }
    static get user() { return AuthService.user; }
    
    // Auth methods
    static async login(email, password) {
        // Implementation can be added for programmatic login
        console.error('Programmatic login not implemented yet');
    }
    
    static async logout() {
        return AuthService.logout();
    }
    
    static async googleLogin() {
        return AuthService.handleGoogleLogin();
    }
    
    // Form handlers (for backward compatibility)
    static handleLogin(event) {
        return AuthService.handleLogin(event);
    }
    
    static handleSignup(event) {
        return AuthService.handleSignup(event);
    }
    
    static handleEnhancedSignup(event) {
        return EnhancedSignupService.handleEnhancedSignup(event);
    }
    
    static handleForgotPassword(event) {
        return AuthService.handleForgotPassword(event);
    }
    
    static handleExamDataForm(event) {
        return ExamService.handleExamDataForm(event, AuthService.user);
    }
    
    // User data methods
    static async getUserData() {
        return UserService.getUserData(AuthService.user);
    }
    
    static async updateUserProfile(updateData) {
        return UserService.updateUserProfile(AuthService.user, updateData);
    }
    
    static async updateExamData(examUpdates) {
        return ExamService.updateExamData(AuthService.user, examUpdates);
    }
    
    // UI methods
    static updateUI() {
        return AuthService.updateUI();
    }
    
    static setupAuthButtons() {
        return AuthService.setupAuthButtons();
    }
    
    // Secure redirect
    static async handleSecureRedirect(targetUrl) {
        return AuthService.handleSecureRedirect(targetUrl);
    }
    
    // Utility access
    static get Validator() { return Validator; }
    static get ErrorHandler() { return ErrorHandler; }
    
    // Debug methods
    static async testFirestoreConnection() {
        return testFirestoreConnection();
    }
}
