/**
 * payment-auth.js - Client-side implementation of payment and premium features
 * 
 * This file handles payment integration with Razorpay and
 * verification code validation for premium features
 */

// PaymentAuth class - global handler for premium features
class PaymentAuth {
    // Static properties
    static isPaid = false;
    static paymentExpiry = null;
    static user = null;
    static initialized = false;
    
    /**
     * Initialize the payment authentication service
     */
    static async init() {
        console.log('Initializing Payment Authentication Service');
        
        // Prevent double initialization
        if (this.initialized) return;
        this.initialized = true;
        
        try {
            // Check if user is already logged in
            if (window.Auth && window.Auth.isLoggedIn && window.Auth.user) {
                this.user = window.Auth.user;
                
                // Get user data to check payment status
                await this.refreshPaymentStatus();
            }
}

// Initialize the PaymentAuth service when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing PaymentAuth');
    // Initialize immediately rather than with a timeout
    PaymentAuth.init();
});

// For Auth module initialization event
document.addEventListener('authInitialized', () => {
    console.log('Auth initialized, ensuring PaymentAuth is initialized');
    // Ensure PaymentAuth is initialized after Auth
    PaymentAuth.init();
});

// Expose PaymentAuth globally
window.PaymentAuth = PaymentAuth;
            
            // Listen for auth state changes
            document.addEventListener('authStateChanged', async (event) => {
                if (event.detail && event.detail.uid) {
                    this.user = event.detail;
                    await this.refreshPaymentStatus();
                } else {
                    // Reset payment status when user logs out
                    this.isPaid = false;
                    this.paymentExpiry = null;
                    this.user = null;
                    this.updateUI();
                }
            });
            
            // Set up event handlers
            this.setupPremiumFeatures();
            
            // Initial UI update
            this.updateUI();
            
            // Add event listener for dynamically added premium elements
            this.observeDOMChanges();
            
            console.log('Payment Authentication Service initialized successfully');
        } catch (error) {
            console.error('Error initializing Payment Authentication Service:', error);
        }
    }
    
    /**
     * Observe DOM changes to handle dynamically added premium elements
     */
    static observeDOMChanges() {
        // Create a new observer for DOM changes
        const observer = new MutationObserver((mutations) => {
            let premiumElementsAdded = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    // Check each added node for premium elements
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check if this element has premium attribute
                            if (node.hasAttribute && node.hasAttribute('data-requires-premium')) {
                                premiumElementsAdded = true;
                            }
                            
                            // Check children for premium attributes
                            if (node.querySelectorAll) {
                                const premiumChildren = node.querySelectorAll('[data-requires-premium="true"]');
                                if (premiumChildren.length > 0) {
                                    premiumElementsAdded = true;
                                }
                            }
                        }
                    });
                }
            });
            
            // If premium elements were added, re-setup the handlers
            if (premiumElementsAdded) {
                this.setupPremiumFeatures();
            }
        });
        
        // Start observing with appropriate configuration
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Refresh payment status from user data
     */
    static async refreshPaymentStatus() {
        if (!this.user) return;
        
        try {
            // Use UserService if available
            if (window.UserService) {
                // Get user data from Firestore via UserService
                const userData = await window.UserService.getUserData(this.user);
                
                if (userData) {
                    this.isPaid = Boolean(userData.isPaid);
                    this.paymentExpiry = userData.paymentExpiry || null;
                    
                    // Check if payment has expired
                    if (this.isPaid && this.paymentExpiry) {
                        const now = new Date();
                        const expiryDate = new Date(this.paymentExpiry);
                        
                        if (now > expiryDate) {
                            // Payment has expired
                            this.isPaid = false;
                            
                            // Update user profile to reflect expired status
                            if (window.UserService.updateUserProfile) {
                                await window.UserService.updateUserProfile(this.user, {
                                    isPaid: false
                                });
                            }
                            
                            console.log('Premium subscription has expired');
                        } else {
                            // Payment is valid
                            console.log(`Premium active until: ${expiryDate.toLocaleDateString()}`);
                        }
                    }
                }
            } else {
                // Fallback: Try to get data from localStorage
                const storedData = localStorage.getItem(`user_payment_status_${this.user.uid}`);
                if (storedData) {
                    try {
                        const data = JSON.parse(storedData);
                        this.isPaid = Boolean(data.isPaid);
                        this.paymentExpiry = data.paymentExpiry || null;
                        
                        // Check expiry
                        if (this.isPaid && this.paymentExpiry) {
                            const now = new Date();
                            const expiryDate = new Date(this.paymentExpiry);
                            
                            if (now > expiryDate) {
                                this.isPaid = false;
                                localStorage.setItem(`user_payment_status_${this.user.uid}`, JSON.stringify({
                                    isPaid: false
                                }));
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing stored payment data:', e);
                    }
                }
            }
            
            // Update UI to reflect payment status
            this.updateUI();
        } catch (error) {
            console.error('Error refreshing payment status:', error);
        }
    }
    
    /**
     * Setup premium feature handlers
     */
    static setupPremiumFeatures() {
        console.log('Setting up premium feature handlers');
        
        // Add handlers to elements with data-requires-premium="true"
        document.querySelectorAll('[data-requires-premium="true"]').forEach(element => {
            // Remove existing handler if any (to prevent duplicates)
            element.removeEventListener('click', this.premiumClickHandler);
            
            // Add premium-disabled class initially if not paid
            if (!this.isPaid) {
                element.classList.add('premium-disabled');
                
                // For anchor tags, store href in data-href and remove href
                if (element.tagName === 'A' && element.hasAttribute('href')) {
                    // Only store if we haven't already
                    if (!element.hasAttribute('data-href')) {
                        element.setAttribute('data-href', element.getAttribute('href'));
                    }
                    element.removeAttribute('href');
                }
                
                // For buttons, don't disable as we want the click handler to run
                // but add visual cues via the premium-disabled class
            } else {
                element.classList.remove('premium-disabled');
                
                // For anchor tags, restore href from data-href
                if (element.tagName === 'A' && element.hasAttribute('data-href')) {
                    element.href = element.getAttribute('data-href');
                }
            }
            
            // Add click handler to show payment modal for non-premium users
            element.addEventListener('click', this.premiumClickHandler);
        });
        
        // Add show premium modal handler to all premium buttons
        const premiumButtons = document.querySelectorAll('.premium-btn');
        premiumButtons.forEach(button => {
            // Remove existing handler to prevent duplicates
            button.removeEventListener('click', () => this.showPaymentModal());
            
            // Add new handler
            button.addEventListener('click', () => {
                this.showPaymentModal();
            });
        });
        
        // Add CSS for premium-disabled elements
        this.addPremiumStyles();
    }
    
    /**
     * Handler for clicks on premium elements
     */
    static premiumClickHandler = function(e) {
        if (!PaymentAuth.isPaid) {
            // Stop all default actions
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Premium feature clicked but not paid, showing payment modal');
            
            // Check if user is logged in first
            if (!window.Auth || !window.Auth.isLoggedIn) {
                if (window.Modal && typeof window.Modal.show === 'function') {
                    window.Modal.show();
                } else {
                    console.log('Login required');
                    alert('Please login to access premium features');
                }
                return;
            }
            
            // Show payment modal for logged-in users
            PaymentAuth.showPaymentModal();
            return false;
        }
    };
    
    /**
     * Add CSS styles for premium features
     */
    static addPremiumStyles() {
        // Check if styles already exist
        if (document.getElementById('premium-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'premium-styles';
        
        styleEl.innerHTML = `
            .premium-disabled {
                position: relative;
                cursor: not-allowed !important;
                opacity: 0.85;
            }
            
            /* Add a crown icon overlay */
            .premium-disabled::before {
                content: "👑";
                position: absolute;
                top: -5px;
                right: -5px;
                background: #FFD700;
                color: #000;
                font-size: 12px;
                padding: 2px 4px;
                border-radius: 50%;
                z-index: 10;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                cursor: pointer;
            }
            
            .premium-disabled::after {
                content: "Premium Feature";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: 5;
            }
            
            .premium-disabled:hover::after {
                opacity: 1;
            }
            
            /* Style for premium badge */
            .premium-badge {
                display: inline-block;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                color: #000;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Update UI based on payment status
     */
    static updateUI() {
        console.log('Updating UI based on payment status. isPaid:', this.isPaid);
        
        // Update premium elements visibility and functionality
        document.querySelectorAll('[data-requires-premium="true"]').forEach(element => {
            if (this.isPaid) {
                element.classList.remove('premium-disabled');
                
                // If it's an anchor tag with data-href, restore the href
                if (element.tagName === 'A' && element.hasAttribute('data-href')) {
                    element.href = element.getAttribute('data-href');
                }
                
                // For buttons, enable them
                if (element.tagName === 'BUTTON') {
                    element.disabled = false;
                }
            } else {
                element.classList.add('premium-disabled');
                
                // For anchor tags, remove the href to prevent navigation
                if (element.tagName === 'A' && element.hasAttribute('href')) {
                    if (!element.hasAttribute('data-href')) {
                        element.setAttribute('data-href', element.getAttribute('href'));
                    }
                    element.removeAttribute('href');
                }
                
                // For buttons, don't disable as we want the click handler to run
                // but we can add visual cues via the premium-disabled class
            }
        });
        
        // Update payment status indicator if it exists
        const statusIndicator = document.getElementById('payment-status-indicator');
        if (statusIndicator) {
            if (this.isPaid) {
                statusIndicator.innerHTML = `
                    <span class="premium-badge">
                        <i class="fas fa-crown"></i> Premium
                    </span>
                `;
            } else if (window.Auth && window.Auth.isLoggedIn) {
                statusIndicator.innerHTML = `
                    <a href="#" onclick="PaymentAuth.showPaymentModal(); return false;" class="upgrade-link">
                        <i class="fas fa-crown"></i> Upgrade
                    </a>
                `;
            } else {
                statusIndicator.innerHTML = ''; // No indicator when not logged in
            }
        }
        
        // Update user dropdown menu if exists
        this.updateUserDropdown();
    }
    
    /**
     * Update user dropdown menu with premium option
     */
    static updateUserDropdown() {
        if (!window.Auth || !window.Auth.isLoggedIn) return;
        
        const userDropdown = document.querySelector('.user-dropdown-menu');
        if (!userDropdown) return;
        
        // Remove existing upgrade link if any
        const existingUpgradeLink = userDropdown.querySelector('.upgrade-link');
        if (existingUpgradeLink) {
            existingUpgradeLink.remove();
        }
        
        // Add upgrade link if not premium
        if (!this.isPaid) {
            const logoutLink = userDropdown.querySelector('.logout-link');
            
            if (logoutLink) {
                const upgradeLink = document.createElement('a');
                upgradeLink.href = '#';
                upgradeLink.className = 'upgrade-link';
                upgradeLink.innerHTML = '<i class="fas fa-crown"></i> Upgrade to Premium';
                upgradeLink.onclick = (e) => {
                    e.preventDefault();
                    this.showPaymentModal();
                    return false;
                };
                
                userDropdown.insertBefore(upgradeLink, logoutLink);
            }
        }
    }
    
    /**
     * Show payment modal with options
     */
    static showPaymentModal() {
        // Check if user is logged in
        if (!window.Auth || !window.Auth.isLoggedIn) {
            if (window.Modal && typeof window.Modal.show === 'function') {
                window.Modal.show();
                return;
            } else {
                alert('Please login first');
                return;
            }
        }
        
        // Create or get payment modal
        let paymentModal = document.getElementById('paymentModal');
        
        if (!paymentModal) {
            paymentModal = document.createElement('div');
            paymentModal.id = 'paymentModal';
            paymentModal.className = 'modal payment-modal';
            
            paymentModal.innerHTML = `
                <div class="modal-content payment-modal-content">
                    <span class="close">&times;</span>
                    <h2><i class="fas fa-crown"></i> Upgrade to Premium</h2>
                    <p>Unlock all premium features and get the most out of our college preference tools.</p>
                    
                    <div class="payment-options">
                        <div class="payment-option">
                            <h3>Pay with Razorpay</h3>
                            <p>Secure online payment</p>
                            <button id="razorpay-button" class="btn payment-btn">
                                <i class="fas fa-credit-card"></i> Pay ₹499
                            </button>
                        </div>
                        
                        <div class="payment-option">
                            <h3>Have a Verification Code?</h3>
                            <p>Enter your code to get premium access</p>
                            <div class="verification-form">
                                <input type="text" id="verification-code" placeholder="Enter code" maxlength="12">
                                <button id="verify-code-button" class="btn verify-btn">
                                    <i class="fas fa-check"></i> Verify
                                </button>
                            </div>
                            <div id="verification-error" class="error-message"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(paymentModal);
            
            // Add event listeners
            const closeBtn = paymentModal.querySelector('.close');
            closeBtn.addEventListener('click', () => {
                paymentModal.style.display = 'none';
            });
            
            // Close when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === paymentModal) {
                    paymentModal.style.display = 'none';
                }
            });
            
            // Razorpay button
            const razorpayBtn = document.getElementById('razorpay-button');
            razorpayBtn.addEventListener('click', () => {
                this.initializeRazorpayPayment();
            });
            
            // Verification button
            const verifyBtn = document.getElementById('verify-code-button');
            verifyBtn.addEventListener('click', () => {
                const codeInput = document.getElementById('verification-code');
                const code = codeInput.value.trim();
                
                if (code) {
                    this.verifyCode(code);
                } else {
                    this.showVerificationError('Please enter a verification code');
                }
            });
            
            // Add payment modal styles
            this.addPaymentModalStyles();
        }
        
        // Show the modal
        paymentModal.style.display = 'block';
    }
    
    /**
     * Add payment modal styles
     */
    static addPaymentModalStyles() {
        // Check if styles already exist
        if (document.getElementById('payment-modal-styles')) return;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'payment-modal-styles';
        
        styleEl.innerHTML = `
            .payment-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.4);
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .payment-modal-content {
                background-color: #ffffff;
                margin: 5% auto;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                width: 90%;
                max-width: 600px;
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .payment-modal-content h2 {
                color: #333;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .payment-modal-content h2 i {
                color: #FFD700;
            }
            
            .payment-options {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-top: 25px;
            }
            
            .payment-option {
                border: 1px solid #eee;
                border-radius: 8px;
                padding: 20px;
                transition: all 0.3s ease;
            }
            
            .payment-option:hover {
                border-color: #FFD700;
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.1);
            }
            
            .payment-option h3 {
                margin-top: 0;
                color: #333;
            }
            
            .payment-btn {
                background-color: #2D88FF;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 4px;
                width: 100%;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            
            .payment-btn:hover {
                background-color: #1A73E8;
                transform: translateY(-2px);
            }
            
            .verification-form {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            
            .verification-form input {
                flex: 1;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 16px;
                text-transform: uppercase;
            }
            
            .verification-form input:focus {
                border-color: #006B6B;
                outline: none;
            }
            
            .verify-btn {
                background-color: #006B6B;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
                min-width: 100px;
            }
            
            .verify-btn:hover {
                background-color: #005757;
                transform: translateY(-2px);
            }
            
            .error-message {
                color: #d32f2f;
                font-size: 14px;
                margin-top: 10px;
                min-height: 20px;
            }
        `;
        
        document.head.appendChild(styleEl);
    }
    
    /**
     * Initialize Razorpay payment
     */
    static async initializeRazorpayPayment() {
        if (!window.Auth || !window.Auth.isLoggedIn) {
            if (window.showToast) {
                window.showToast('Please log in first', 'warning');
            }
            return;
        }
        
        try {
            // Show loading state
            const button = document.getElementById('razorpay-button');
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
            }
            
            // Create a Razorpay order via Firebase Function
            const firebase = window.firebase;
            const functions = firebase.functions();
            
            // Call the createOrder function
            const createOrder = firebase.functions().httpsCallable('createOrder');
            
            const orderData = {
                amount: 49900, // ₹499 in paise
                currency: 'INR',
                package: 'premium',
                duration: '1 year'
            };
            
            // Create the order
            const response = await createOrder(orderData);
            const { orderId, amount, currency } = response.data;
            
            // Load Razorpay script if not already loaded
            await this.loadRazorpayScript();
            
            // Configure Razorpay options
            const options = {
                key: 'rzp_live_GgEM5tXGq55aA0', // Replace with your actual key
                amount: amount,
                currency: currency,
                name: 'NextStep',
                description: 'Premium Membership',
                order_id: orderId,
                image: '/nextstep_logo.jpeg',
                prefill: {
                    name: window.Auth.user.displayName || '',
                    email: window.Auth.user.email || '',
                },
                theme: {
                    color: '#006B6B'
                },
                handler: function(response) {
                    // This function is called when payment succeeds
                    PaymentAuth.verifyPaymentWithServer(response);
                }
            };
            
            // Initialize Razorpay
            const razorpay = new window.Razorpay(options);
            razorpay.open();
            
            // Hide modal when opening Razorpay
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                paymentModal.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error initializing payment:', error);
            
            if (window.showToast) {
                window.showToast('Failed to initialize payment. Please try again.', 'error');
            }
        } finally {
            // Reset button state
            const button = document.getElementById('razorpay-button');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-credit-card"></i> Pay ₹499';
            }
        }
    }
    
    /**
     * Load Razorpay script
     * @returns {Promise} Resolves when script is loaded
     */
    static loadRazorpayScript() {
        return new Promise((resolve, reject) => {
            // If already loaded, resolve immediately
            if (window.Razorpay) {
                resolve();
                return;
            }
            
            // Load the script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    /**
     * Store payment data in localStorage as backup
     */
    static storePaymentData() {
        if (!this.user || !this.user.uid) return;
        
        try {
            const paymentData = {
                isPaid: this.isPaid,
                paymentExpiry: this.paymentExpiry,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem(`user_payment_status_${this.user.uid}`, JSON.stringify(paymentData));
        } catch (error) {
            console.error('Error storing payment data:', error);
        }
    }
    
    /**
     * Verify payment with server
     * @param {Object} paymentResponse - Response from Razorpay
     */
    static async verifyPaymentWithServer(paymentResponse) {
        if (!window.Auth || !window.Auth.isLoggedIn) return;
        
        try {
            if (window.showToast) {
                window.showToast('Verifying payment...', 'info');
            }
            
            // Call the verifyPayment function
            const firebase = window.firebase;
            const verifyPayment = firebase.functions().httpsCallable('verifyPayment');
            const response = await verifyPayment(paymentResponse);
            
            if (response.data.success) {
                // Update local payment status
                this.isPaid = true;
                this.paymentExpiry = response.data.expiryDate;
                
                // Store in localStorage for backup access
                this.storePaymentData();
                
                // Update UI
                this.updateUI();
                
                if (window.showToast) {
                    window.showToast('Payment successful! Premium features activated.', 'success');
                }
            } else {
                if (window.showToast) {
                    window.showToast('Payment verification failed. Please contact support.', 'error');
                }
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            
            if (window.showToast) {
                window.showToast('Error verifying payment. Please contact support.', 'error');
            }
        }
    }
    
    /**
     * Show verification error message
     * @param {string} message - Error message to show
     */
    static showVerificationError(message) {
        const errorElement = document.getElementById('verification-error');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    /**
     * Verify a verification code
     * @param {string} code - The verification code to verify
     */
    static async verifyCode(code) {
        if (!window.Auth || !window.Auth.isLoggedIn) {
            if (window.showToast) {
                window.showToast('Please log in first', 'warning');
            }
            return;
        }
        
        try {
            // Show loading state
            const button = document.getElementById('verify-code-button');
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            }
            
            // Clear any previous error
            this.showVerificationError('');
            
            // Connect to Firestore
            const firebase = window.firebase;
            const db = firebase.firestore();
            
            // Query for the verification code
            const codesRef = db.collection('verificationCodes');
            const query = codesRef.where('code', '==', code.toUpperCase())
                               .where('isActive', '==', true)
                               .limit(1);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                this.showVerificationError('Invalid verification code. Please check and try again.');
                return;
            }
            
            const codeDoc = snapshot.docs[0];
            const codeData = codeDoc.data();
            
            // Check if code has reached max uses
            if (codeData.usedCount >= codeData.maxUses) {
                this.showVerificationError('This code has already been used the maximum number of times.');
                return;
            }
            
            // Check if user has already used this code
            if (codeData.usedBy && codeData.usedBy.includes(window.Auth.user.uid)) {
                this.showVerificationError('You have already used this code.');
                return;
            }
            
            // Use a transaction to update the code usage and user status
            await db.runTransaction(async (transaction) => {
                // Get fresh code document in transaction
                const codeRef = codeDoc.ref;
                const freshCodeDoc = await transaction.get(codeRef);
                
                if (!freshCodeDoc.exists) {
                    throw new Error('Code no longer exists');
                }
                
                const freshCodeData = freshCodeDoc.data();
                
                // Check if still valid in transaction
                if (!freshCodeData.isActive) {
                    throw new Error('Code is no longer active');
                }
                
                if (freshCodeData.usedCount >= freshCodeData.maxUses) {
                    throw new Error('Code has reached maximum usage limit');
                }
                
                if (freshCodeData.usedBy && freshCodeData.usedBy.includes(window.Auth.user.uid)) {
                    throw new Error('You have already used this code');
                }
                
                // Calculate expiry date
                const now = new Date();
                const expiryDate = new Date(now);
                expiryDate.setDate(expiryDate.getDate() + freshCodeData.expiryDays);
                
                // Update code document
                transaction.update(codeRef, {
                    usedCount: firebase.firestore.FieldValue.increment(1),
                    usedBy: firebase.firestore.FieldValue.arrayUnion(window.Auth.user.uid),
                    lastUsedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Update user document
                const userRef = db.collection('users').doc(window.Auth.user.uid);
                transaction.update(userRef, {
                    isPaid: true,
                    paymentExpiry: expiryDate.toISOString(),
                    verificationCode: code,
                    verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    paymentHistory: firebase.firestore.FieldValue.arrayUnion({
                        type: 'verification_code',
                        code: code,
                        timestamp: now.toISOString(),
                        expiryDate: expiryDate.toISOString()
                    })
                });
                
                // Save expiry date for local use
                this.paymentExpiry = expiryDate.toISOString();
                return expiryDate.toISOString();
            });
            
            // Code verification successful
            this.isPaid = true;
            
            // Store in localStorage for backup access
            this.storePaymentData();
            
            // Update UI
            this.updateUI();
            
            // Close the payment modal
            const paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                paymentModal.style.display = 'none';
            }
            
            if (window.showToast) {
                window.showToast('Verification successful! Premium features activated.', 'success');
            }
        } catch (error) {
            console.error('Error verifying code:', error);
            
            // Show error message
            this.showVerificationError(error.message || 'Failed to verify code. Please try again.');
            
            if (window.showToast) {
                window.showToast('Verification failed. Please try again.', 'error');
            }
        } finally {
            // Reset button state
            const button = document.getElementById('verify-code-button');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-check"></i> Verify';
            }
        }
