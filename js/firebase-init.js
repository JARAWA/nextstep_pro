// FirebaseInit.js - Standalone version that works with both module and non-module code

/**
 * This is a standalone Firebase initialization helper that creates global firebase object
 * to ensure compatibility with both ES modules and traditional scripts
 */
(function() {
    // FirebaseInit object
    const FirebaseInit = {
        // Check if Firebase is available and properly initialized
        isFirebaseAvailable: function() {
            return window.firebase && window.firebase.auth && window.firebase.firestore;
        },
        
        // Initialize Firebase if needed
        initializeFirebase: function() {
            // If Firebase is already initialized, just return
            if (this.isFirebaseAvailable()) {
                console.log('Firebase already initialized globally');
                return Promise.resolve();
            }
            
            return new Promise((resolve, reject) => {
                // Check if Firebase SDK scripts are loaded
                if (typeof firebase === 'undefined') {
                    console.warn('Firebase SDK not found - attempting to use global firebase from auth module');
                    
                    // Try to locate Firebase from existing modules
                    this.useFirebaseFromModules()
                        .then(success => {
                            if (success) {
                                console.log('Successfully imported Firebase from modules');
                                resolve();
                            } else {
                                console.warn('Failed to import from modules, loading Firebase SDK dynamically');
                                this.loadFirebaseScripts()
                                    .then(() => this.configureFirebase())
                                    .then(() => resolve())
                                    .catch(err => reject(err));
                            }
                        })
                        .catch(err => {
                            console.error('Error importing from modules:', err);
                            
                            // Fall back to dynamic loading
                            this.loadFirebaseScripts()
                                .then(() => this.configureFirebase())
                                .then(() => resolve())
                                .catch(err => reject(err));
                        });
                } else {
                    // Firebase SDK exists but may not be initialized
                    this.configureFirebase()
                        .then(() => resolve())
                        .catch(err => reject(err));
                }
            });
        },
        
        // Try to use Firebase from existing auth module
        useFirebaseFromModules: function() {
            return new Promise((resolve) => {
                // Check if Auth module is available
                if (window.Auth && typeof window.Auth.testFirestoreConnection === 'function') {
                    console.log('Auth module found, trying to get Firebase from it');
                    
                    // Wait for any pending auth initialization
                    setTimeout(() => {
                        try {
                            // Try to call an auth method that will trigger Firebase initialization
                            window.Auth.testFirestoreConnection()
                                .then(() => {
                                    if (this.isFirebaseAvailable()) {
                                        console.log('Successfully got Firebase from Auth module');
                                        resolve(true);
                                    } else {
                                        console.log('Firebase not available after Auth test');
                                        resolve(false);
                                    }
                                })
                                .catch(() => {
                                    console.log('Auth test failed');
                                    resolve(false);
                                });
                        } catch (e) {
                            console.error('Error using Firebase from Auth module:', e);
                            resolve(false);
                        }
                    }, 500);
                } else {
                    console.log('Auth module not found or not initialized');
                    resolve(false);
                }
            });
        },
        
        // Load Firebase SDK scripts dynamically
        loadFirebaseScripts: function() {
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
        },
        
        // Configure Firebase with app details
        configureFirebase: function() {
            return new Promise((resolve, reject) => {
                try {
                    // Check if Firebase is already initialized
                    if (firebase.apps && firebase.apps.length > 0) {
                        console.log('Firebase already configured');
                        resolve();
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
                    resolve();
                } catch (error) {
                    console.error('Error initializing Firebase:', error);
                    reject(error);
                }
            });
        },
        
        // Full initialization with UI updates
        init: function() {
            console.log('Running FirebaseInit.init()');
            
            return new Promise((resolve, reject) => {
                this.initializeFirebase()
                    .then(() => {
                        console.log('Firebase ready for use');
                        
                        // Initialize the Payment Modal after Firebase is ready
                        if (window.PaymentModal && typeof window.PaymentModal.init === 'function') {
                            window.PaymentModal.init();
                        }
                        
                        // Resolve with success
                        resolve(true);
                    })
                    .catch(error => {
                        console.error('Firebase initialization failed:', error);
                        
                        // Still initialize PaymentModal, it will handle Firebase unavailability
                        if (window.PaymentModal && typeof window.PaymentModal.init === 'function') {
                            window.PaymentModal.init();
                        }
                        
                        // Resolve with failure
                        resolve(false);
                    });
            });
        }
    };
    
    // Add CSS for Firebase-related UI elements
    function addFirebaseStatusStyles() {
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
    
    // Add the styles
    addFirebaseStatusStyles();
    
    // Export the FirebaseInit object globally
    window.FirebaseInit = FirebaseInit;
    
    // Auto-initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, calling FirebaseInit.init()');
        FirebaseInit.init();
    });
})();
