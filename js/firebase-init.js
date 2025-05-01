// firebase-init.js - ES Module version

/**
 * Firebase initialization helper that bridges between ES modules and global Firebase objects
 * to ensure compatibility with both approaches
 */

// Try to import Firebase from the auth module if possible
let authModuleImport;
try {
    authModuleImport = import('./auth/services/firebase-config.js');
} catch (e) {
    console.warn('Could not import from firebase-config.js:', e);
    authModuleImport = Promise.resolve(null);
}

// FirebaseInit class
class FirebaseInit {
    // Check if Firebase is available and properly initialized
    static isFirebaseAvailable() {
        return window.firebase && window.firebase.auth && window.firebase.firestore;
    }
    
    // Initialize Firebase if needed
    static async initializeFirebase() {
        // If Firebase is already initialized, just return
        if (this.isFirebaseAvailable()) {
            console.log('Firebase already initialized globally');
            return true;
        }
        
        try {
            // Try to use Firebase from the auth module
            const authModule = await authModuleImport;
            if (authModule && authModule.app) {
                console.log('Auth module found, getting Firebase from it');
                
                // Make Firebase accessible globally for non-module scripts
                if (authModule.auth && !window.firebase) {
                    window.firebase = {
                        auth: () => authModule.auth,
                        firestore: () => authModule.db,
                        app: () => authModule.app
                    };
                    
                    console.log('Firebase made globally available from auth module');
                    return true;
                }
            }
            
            // If Auth module didn't provide Firebase, try to use the global Firebase
            if (typeof firebase !== 'undefined') {
                // Firebase SDK exists but may not be initialized
                await this.configureFirebase();
                return true;
            }
            
            // If no Firebase is available, load it dynamically
            await this.loadFirebaseScripts();
            await this.configureFirebase();
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }
    
    // Load Firebase SDK scripts dynamically
    static loadFirebaseScripts() {
        return new Promise((resolve, reject) => {
            console.log('Loading Firebase SDK scripts dynamically');
            
            const loadScripts = [
                { src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js' },
                { src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js' },
                { src: 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js' }
            ];
            
            let scriptsLoaded = 0;
            
            loadScripts.forEach(script => {
                const scriptElement = document.createElement('script');
                scriptElement.src = script.src;
                scriptElement.async = true;
                
                scriptElement.onload = () => {
                    scriptsLoaded++;
                    console.log(`Loaded Firebase script ${scriptsLoaded} of ${loadScripts.length}`);
                    if (scriptsLoaded === loadScripts.length) {
                        // All scripts loaded
                        resolve();
                    }
                };
                
                scriptElement.onerror = (err) => {
                    console.error('Failed to load Firebase script:', script.src);
                    reject(err);
                };
                
                document.head.appendChild(scriptElement);
            });
        });
    }
    
    // Configure Firebase with app details
    static async configureFirebase() {
        try {
            // Check if Firebase is already initialized
            if (firebase.apps && firebase.apps.length > 0) {
                console.log('Firebase already configured');
                return;
            }
            
            // Your web app's Firebase configuration - use the same config from firebase-config.js
            const firebaseConfig = {
                apiKey: "AIzaSyC7tvZe9NeHRhYuTVrQnkaSG7Nkj3ZS40U",
                authDomain: "nextstep-log.firebaseapp.com",
                projectId: "nextstep-log",
                storageBucket: "nextstep-log.appspot.com",
                messagingSenderId: "9308831285",
                appId: "1:9308831285:web:d55ed6865804c50f743b7c",
                measurementId: "G-BPGP3TBN3N"
            };
            
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            
            console.log('Firebase initialized successfully with standalone config');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            throw error;
        }
    }
    
    // Full initialization with UI updates
    static async init() {
        console.log('Running FirebaseInit.init()');
        
        try {
            // Add CSS for Firebase-related UI elements
            this.addFirebaseStatusStyles();
            
            // Initialize Firebase
            const success = await this.initializeFirebase();
            
            console.log('Firebase initialization completed, success:', success);
            
            // Initialize the Payment Modal after Firebase is ready
            if (window.PaymentModal && typeof window.PaymentModal.init === 'function') {
                window.PaymentModal.init();
            }
            
            return success;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            
            // Still initialize PaymentModal, it will handle Firebase unavailability
            if (window.PaymentModal && typeof window.PaymentModal.init === 'function') {
                window.PaymentModal.init();
            }
            
            return false;
        }
    }
    
    // Add CSS for Firebase-related UI elements
    static addFirebaseStatusStyles() {
        if (document.getElementById('firebase-status-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'firebase-status-styles';
        style.textContent = `
            .firebase-notification {
                background-color: #fff3cd;
                color: #856404;
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 4px;
                font-size: 14px;
                border-left: 4px solid #ffeeba;
            }
            
            .firebase-offline-badge {
                display: inline-block;
                background-color: #dc3545;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 8px;
            }
            
            .firebase-online-badge {
                display: inline-block;
                background-color: #28a745;
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 12px;
                margin-left: 8px;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export the FirebaseInit class
export default FirebaseInit;

// Also make it available globally for non-module scripts
window.FirebaseInit = FirebaseInit;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, calling FirebaseInit.init()');
    FirebaseInit.init();
});
