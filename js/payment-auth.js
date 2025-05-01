/**
 * payment-auth.js - Client-side implementation of payment and premium features
 * 
 * This module handles:
 * 1. Premium feature access control
 * 2. Payment verification 
 * 3. Redemption code verification
 * 4. UI updates based on payment status
 */

// PaymentAuth class - global handler for premium features
class PaymentAuth {
    // Static properties
    static isPaid = false;
    static paymentExpiry = null;
    static user = null;
    static initialized = false;
    static _handlers = new Map();
    
    /**
     * Initialize the payment authentication service
     */
    static async init() {
        console.log('Initializing Payment Authentication Service');
        
        // Prevent double initialization
        if (this.initialized) {
            console.log('PaymentAuth already initialized, skipping');
            return;
        }
        this.initialized = true;
        
        try {
            // Load the payment modal component
            await this.loadPaymentModal();
            
            // Check if user is already logged in
            if (window.Auth && window.Auth.isLoggedIn && window.Auth.user) {
                this.user = window.Auth.user;
                
                // Get user data to check payment status
                await this.refreshPaymentStatus();
            }
            
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
     * Load payment modal HTML
     */
    static loadPaymentModal() {
        return new Promise((resolve, reject) => {
            // Check if modal already exists
            if (document.getElementById('paymentModal')) {
                console.log('Payment modal already exists, skipping load');
                resolve();
                return;
            }
            
            fetch('components/payment-modal.html')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load payment modal: ${response.status} ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Add the payment modal to the document
                    const tempContainer = document.createElement('div');
                    tempContainer.innerHTML = html;
                    document.body.appendChild(tempContainer.firstElementChild);
                    
                    console.log('Payment modal HTML loaded successfully');
                    
                    // Initialize PaymentModal if available
                    if (window.PaymentModal && typeof window.PaymentModal.init === 'function') {
                        setTimeout(() => window.PaymentModal.init(), 100);
                    }
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading payment modal HTML:', error);
                    reject(error);
                });
        });
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
                            if (window.UserService && window.UserService.updateUserProfile) {
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
            // Skip elements that already have handlers attached
            if (this._handlers.has(element)) {
                return;
            }
            
            // Create a new handler bound to this element
            const handler = (e) => {
                if (!this.isPaid) {
                    // Stop all default actions
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('Premium feature clicked but not paid, showing payment modal');
                    
                    // Check if user is logged in first
                    if (!window.Auth || !window.Auth.isLoggedIn) {
                        if (window.Modal && typeof window.Modal.show === 'function') {
                            window.Modal.show();
                        } else {
                            alert('Please login to access premium features');
                        }
                        return false;
                    }
                    
                    // Show the premium feature notification
                    this.showPremiumFeatureNotification(e.currentTarget);
                    
                    // Show payment modal after a short delay
                    setTimeout(() => {
                        if (window.PaymentModal && typeof window.PaymentModal.openModal === 'function') {
                            window.PaymentModal.openModal();
                        } else {
                            this.showPaymentModal();
                        }
                    }, 300);
                    
                    return false;
                }
            };
            
            // Store the handler reference for future removal
            this._handlers.set(element, handler);
            
            // Add premium-disabled class initially if not paid
            this.updateElementStatus(element);
            
            // Add the click handler
            element.addEventListener('click', handler);
        });
        
        // Add show premium modal handler to all premium buttons
        document.querySelectorAll('.premium-btn').forEach(button => {
            if (!this._handlers.has(button)) {
                const handler = () => this.showPaymentModal();
                this._handlers.set(button, handler);
                button.addEventListener('click', handler);
            }
        });
        
        // Add CSS for premium-disabled elements
        this.addPremiumStyles();
    }
    
    /**
     * Update individual element status based on payment state
     * @param {HTMLElement} element - Element to update
     */
    static updateElementStatus(element) {
        if (!element) return;
        
        if (this.isPaid) {
            element.classList.remove('premium-disabled');
            
            // For anchor tags, restore href from data-href
            if (element.tagName === 'A' && element.hasAttribute('data-href')) {
                element.href = element.getAttribute('data-href');
            }
            
            // For buttons, make sure they're enabled
            if (element.tagName === 'BUTTON') {
                element.disabled = false;
            }
        } else {
            element.classList.add('premium-disabled');
            
            // For anchor tags, store href in data-href and remove href
            if (element.tagName === 'A' && element.hasAttribute('href')) {
                // Only store if we haven't already
                if (!element.hasAttribute('data-href')) {
                    element.setAttribute('data-href', element.getAttribute('href'));
                }
                element.removeAttribute('href');
            }
        }
    }
    
    /**
     * Show a brief "premium feature" notification that's properly positioned
     * @param {HTMLElement} element - The element that was clicked
     */
    static showPremiumFeatureNotification(element) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('premium-feature-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'premium-feature-notification';
            notification.className = 'premium-notification';
            notification.style.position = 'fixed';
            notification.style.padding = '8px 16px';
            notification.style.backgroundColor = '#006B6B';
            notification.style.color = 'white';
            notification.style.borderRadius = '20px';
            notification.style.fontWeight = 'bold';
            notification.style.fontSize = '14px';
            notification.style.boxShadow = '0 3px 6px rgba(0,0,0,0.2)';
            notification.style.zIndex = '9999';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.display = 'flex';
            notification.style.alignItems = 'center';
            notification.style.gap = '8px';
            notification.innerHTML = '<i class="fas fa-crown" style="color: gold;"></i> Premium Feature';
            
            document.body.appendChild(notification);
        }
        
        // Position the notification near the element
        const rect = element.getBoundingClientRect();
        notification.style.top = `${rect.top - 40}px`;
        notification.style.left = `${rect.left + (rect.width / 2) - 85}px`;
        
        // Show notification
        notification.style.opacity = '1';
        
        // Hide after delay
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 1000);
    }
    
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
            
            /* Premium badge */
            .premium-badge {
                display: inline-flex;
                align-items: center;
                background: linear-gradient(45deg, #FFD700, #FFA500);
                color: #000;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            
            /* Premium notification */
            .premium-notification {
                pointer-events: none;
                font-family: 'Poppins', sans-serif;
            }
            
            /* Upgrade link */
            .upgrade-link {
                display: inline-flex;
                align-items: center;
                color: #FFD700;
                padding: 8px 16px;
                font-weight: bold;
                text-decoration: none;
                transition: all 0.3s ease;
            }
            
            .upgrade-link:hover {
                background-color: rgba(255, 215, 0, 0.1);
                text-decoration: none;
            }
            
            .upgrade-link i {
                margin-right: 6px;
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
            this.updateElementStatus(element);
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
        
        // Check if dedicated payment modal is available
        if (window.PaymentModal && typeof window.PaymentModal.openModal === 'function') {
            console.log('Using dedicated PaymentModal.openModal()');
            window.PaymentModal.openModal();
            return;
        }
        
        // Otherwise look for the modal directly
        let paymentModal = document.getElementById('paymentModal');
        
        if (paymentModal) {
            // Show the modal directly
            paymentModal.style.display = 'block';
            console.log('Showing payment modal directly');
            return;
        }
        
        // As a last resort, try to load the payment modal
        this.loadPaymentModal().then(() => {
            paymentModal = document.getElementById('paymentModal');
            if (paymentModal) {
                paymentModal.style.display = 'block';
            } else {
                console.error('Failed to load payment modal');
            }
        }).catch(error => {
            console.error('Error loading payment modal:', error);
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
     * Verify and activate a redemption code
     * @param {string} code - The redemption code to verify
     * @returns {Promise<boolean>} Whether verification was successful
     */
    static async verifyRedemptionCode(code) {
        if (!code || !this.user) return false;
        
        // For testing/demo purposes until Firebase implementation is complete
        if (code.toUpperCase() === 'NEXTSTEP123' || 
            code.toUpperCase() === 'DEMO2024' ||
            code.toUpperCase() === 'WELCOME10') {
            
            // Create expiry date (30 days from now)
            const now = new Date();
            const expiryDate = new Date(now);
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            // Set payment status
            this.isPaid = true;
            this.paymentExpiry = expiryDate.toISOString();
            
            // Store in localStorage
            this.storePaymentData();
            
            // Update UI
            this.updateUI();
            
            // Notify listeners
            window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                detail: { 
                    isPaid: true,
                    expiryDate: expiryDate.toISOString()
                }
            }));
            
            return true;
        }
        
        return false;
    }
}

// Initialize PaymentAuth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing PaymentAuth');
    setTimeout(() => PaymentAuth.init(), 100);
});

// Also initialize when Auth is ready
document.addEventListener('authInitialized', () => {
    console.log('Auth initialized, ensuring PaymentAuth is initialized');
    PaymentAuth.init();
});

// Expose PaymentAuth globally
window.PaymentAuth = PaymentAuth;
