// payment-auth.js - Handles premium feature access control
const PaymentAuth = {
    // User payment status
    isPaid: false,

    // Initialize payment authorization
    init: function() {
        console.log('Initializing Payment Auth');
        
        // Load payment modal
        this.loadPaymentModal();
        
        // Check if user is paid from localStorage first (for quick UI updates)
        const localIsPaid = localStorage.getItem('isPremium') === 'true';
        
        // Set initial payment status
        this.isPaid = localIsPaid;
        
        // Update UI based on initial status
        this.updateUIBasedOnPaymentStatus();
        
        // Add event listeners for premium buttons
        this.setupEventListeners();
        
        // Listen for payment status changes
        window.addEventListener('paymentStatusChanged', (event) => {
            this.isPaid = event.detail.isPaid;
            this.updateUIBasedOnPaymentStatus();
        });
        
        // Get the actual status from Firestore (might be different from localStorage)
        this.verifyPaymentStatus();
    },

    // Load payment modal HTML
    loadPaymentModal: function() {
        fetch('components/payment-modal.html')
            .then(response => response.text())
            .then(html => {
                // Add the payment modal to the modal container
                const modalContainer = document.getElementById('modal-container');
                if (modalContainer) {
                    // Append the modal HTML to the container
                    modalContainer.insertAdjacentHTML('beforeend', html);
                    
                    // Initialize the payment modal
                    if (window.PaymentModal) {
                        window.PaymentModal.init();
                    } else {
                        console.error('PaymentModal object not found');
                    }
                } else {
                    console.error('Modal container not found');
                }
            })
            .catch(error => {
                console.error('Error loading payment modal:', error);
            });
    },

    // Set up event listeners for premium feature buttons
    setupEventListeners: function() {
        // Find all buttons and links with data-requires-premium="true"
        const premiumElements = document.querySelectorAll('[data-requires-premium="true"]');
        
        premiumElements.forEach(element => {
            // Store the original click handler if it exists
            const originalOnClick = element.onclick;
            
            // Replace with our handler
            element.onclick = (event) => {
                // Prevent default action
                event.preventDefault();
                
                // Check if login is required first
                if (element.getAttribute('data-requires-login') === 'true') {
                    // Check if user is logged in
                    const auth = firebase.auth();
                    const user = auth.currentUser;
                    
                    if (!user) {
                        // User is not logged in, show login modal
                        if (window.Modal) {
                            window.Modal.openModal();
                            window.Modal.toggleForms('login');
                        }
                        return;
                    }
                }
                
                // If the user is premium, execute the original action
                if (this.isPaid) {
                    // If there's a specific href to navigate to
                    const href = element.getAttribute('data-href');
                    if (href) {
                        // Open in the same tab or new tab based on target attribute
                        const target = element.getAttribute('target') || '_self';
                        window.open(href, target);
                    } else if (originalOnClick) {
                        // Execute original click handler
                        originalOnClick(event);
                    }
                } else {
                    // Show a brief "premium feature" notification
                    this.showPremiumFeatureNotification(element);
                    
                    // Then show the payment modal
                    if (window.PaymentModal) {
                        setTimeout(() => {
                            window.PaymentModal.openModal();
                        }, 300); // Short delay after notification
                    } else {
                        console.error('PaymentModal not initialized');
                    }
                }
            };
        });
    },

    // Show a brief "premium feature" notification
    showPremiumFeatureNotification: function(element) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'premium-notification';
        notification.innerHTML = '<i class="fas fa-crown"></i> Premium Feature';
        
        // Position the notification near the element
        const rect = element.getBoundingClientRect();
        notification.style.position = 'absolute';
        notification.style.top = `${rect.top - 40}px`;
        notification.style.left = `${rect.left + (rect.width / 2) - 75}px`;
        notification.style.backgroundColor = '#006B6B';
        notification.style.color = 'white';
        notification.style.padding = '5px 15px';
        notification.style.borderRadius = '20px';
        notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)';
        notification.style.zIndex = '9999';
        notification.style.fontWeight = '500';
        notification.style.fontSize = '14px';
        notification.style.transition = 'opacity 0.3s ease';
        notification.style.opacity = '0';
        
        // Add to document
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after a short time
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 1000);
    },

    // Verify payment status from Firestore
    verifyPaymentStatus: function() {
        // Get current user
        const auth = firebase.auth();
        const user = auth.currentUser;
        
        if (!user) {
            // User is not logged in, update to not paid
            this.isPaid = false;
            this.updateUIBasedOnPaymentStatus();
            return;
        }
        
        // Get user document from Firestore
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    
                    // Check if user has premium status
                    if (userData.isPremium) {
                        // Check if premium has expired
                        const expiry = userData.premiumExpiry ? userData.premiumExpiry.toDate() : null;
                        const now = new Date();
                        
                        if (expiry && expiry > now) {
                            // Premium is valid
                            this.isPaid = true;
                            localStorage.setItem('isPremium', 'true');
                        } else {
                            // Premium has expired
                            this.isPaid = false;
                            localStorage.setItem('isPremium', 'false');
                            
                            // Update the user document to reflect expired status
                            db.collection('users').doc(user.uid).update({
                                isPremium: false
                            }).catch(error => {
                                console.error('Error updating expired premium status:', error);
                            });
                        }
                    } else {
                        // User does not have premium
                        this.isPaid = false;
                        localStorage.setItem('isPremium', 'false');
                    }
                } else {
                    // User document doesn't exist
                    this.isPaid = false;
                    localStorage.setItem('isPremium', 'false');
                }
                
                // Update UI based on verified status
                this.updateUIBasedOnPaymentStatus();
            })
            .catch(error => {
                console.error('Error checking premium status:', error);
                
                // In case of error, use the localStorage value
                this.isPaid = localStorage.getItem('isPremium') === 'true';
                this.updateUIBasedOnPaymentStatus();
            });
    },

    // Update UI based on payment status
    updateUIBasedOnPaymentStatus: function() {
        console.log('Updating UI based on payment status. isPaid:', this.isPaid);
        
        // Find all premium elements
        const premiumElements = document.querySelectorAll('[data-requires-premium="true"]');
        
        premiumElements.forEach(element => {
            if (this.isPaid) {
                // User is premium, style buttons normally
                element.classList.add('premium-active');
                element.classList.remove('premium-inactive');
                
                // Add a small crown icon to indicate premium features
                if (!element.querySelector('.premium-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'premium-indicator';
                    indicator.innerHTML = '<i class="fas fa-crown"></i>';
                    indicator.style.fontSize = '12px';
                    indicator.style.marginLeft = '5px';
                    indicator.style.color = 'gold';
                    element.appendChild(indicator);
                }
            } else {
                // User is not premium, add lock icon and special styling
                element.classList.add('premium-inactive');
                element.classList.remove('premium-active');
                
                // Replace any existing premium indicator with a lock
                const existingIndicator = element.querySelector('.premium-indicator');
                if (existingIndicator) {
                    existingIndicator.innerHTML = '<i class="fas fa-lock"></i>';
                    existingIndicator.style.color = 'white';
                } else {
                    const indicator = document.createElement('span');
                    indicator.className = 'premium-indicator';
                    indicator.innerHTML = '<i class="fas fa-lock"></i>';
                    indicator.style.fontSize = '12px';
                    indicator.style.marginLeft = '5px';
                    indicator.style.color = 'white';
                    element.appendChild(indicator);
                }
            }
        });
        
        // Add global styles for premium buttons
        this.addPremiumStyles();
    },

    // Add CSS styles for premium buttons
    addPremiumStyles: function() {
        // Check if styles already exist
        if (document.getElementById('premium-styles')) {
            return;
        }
        
        // Create style element
        const style = document.createElement('style');
        style.id = 'premium-styles';
        style.textContent = `
            /* Premium button styles */
            .premium-inactive {
                position: relative;
                overflow: hidden;
                /* Use a gradient color for inactive premium buttons */
                background: linear-gradient(45deg, #7b7b7b, #5a5a5a) !important;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
            }
            
            .premium-inactive::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 50%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    rgba(255,255,255,0) 0%,
                    rgba(255,255,255,0.2) 50%,
                    rgba(255,255,255,0) 100%
                );
                animation: shimmer 2s infinite;
            }
            
            @keyframes shimmer {
                100% {
                    left: 150%;
                }
            }
            
            .premium-active {
                background: linear-gradient(45deg, #006B6B, #00a1a1) !important;
                box-shadow: 0 4px 10px rgba(0,107,107,0.3) !important;
                transform: translateY(-2px);
                transition: all 0.3s ease;
            }
            
            .premium-active:hover {
                transform: translateY(-4px);
                box-shadow: 0 6px 12px rgba(0,107,107,0.4) !important;
            }
        `;
        
        // Add to document head
        document.head.appendChild(style);
    }
};

// Export the PaymentAuth object for use in other scripts
window.PaymentAuth = PaymentAuth;

// Initialize payment auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize payment auth when Firebase is ready
    const checkFirebase = setInterval(function() {
        if (window.firebase && window.firebase.auth) {
            clearInterval(checkFirebase);
            window.PaymentAuth.init();
        }
    }, 100);
});
