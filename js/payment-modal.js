/**
 * payment-modal.js - Handles payment modal UI interactions
 * FIXED VERSION - Redemption link fix
 */

// PaymentModal class
class PaymentModal {
    // Class properties
    static modal = null;
    static isInitialized = false;
    static isProcessing = false;
    static selectedPlan = {
        type: 'monthly',
        name: '1 Month Premium',
        price: 499,
        discountAmount: 0,
        totalPrice: 499
    };
    
    /**
     * Initialize the payment modal
     */
    static init() {
        console.log('Initializing PaymentModal');
        
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('PaymentModal already initialized');
            return;
        }
        
        // Get the modal element
        this.modal = document.getElementById('paymentModal');
        if (!this.modal) {
            console.log('Payment modal not found in DOM, attempting to load it');
            this.loadHTML();
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Show initial form
        this.showPaymentForm();
        
        // Set initialization flag
        this.isInitialized = true;
        
        console.log('PaymentModal initialized successfully');
    }
    
    /**
     * Load the payment modal HTML
     */
    static loadHTML() {
        console.log('Loading payment modal HTML');
        
        // Check if modal already exists
        if (document.getElementById('paymentModal')) {
            console.log('Payment modal already exists');
            this.init();
            return;
        }
        
        // Fetch the HTML
        fetch('components/payment-modal.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Create temporary container
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = html;
                
                // Append to body
                document.body.appendChild(tempContainer.firstElementChild);
                
                console.log('Payment modal HTML loaded successfully');
                
                // Initialize the modal
                setTimeout(() => this.init(), 300);
            })
            .catch(error => {
                console.error('Error loading payment modal HTML:', error);
            });
    }
    
    /**
     * Setup all event listeners
     */
    static setupEventListeners() {
        if (!this.modal) {
            console.error('Modal not found in setupEventListeners');
            return;
        }
        
        // Close buttons
        const closeButtons = this.modal.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });
        
        // Close when clicking outside the modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
            
        // Plan selection
        const planOptions = this.modal.querySelectorAll('.plan-option');
        planOptions.forEach(option => {
            option.addEventListener('click', () => {
                const planType = option.getAttribute('data-plan');
                this.selectPlan(planType, option);
            });
        });
        
        // Coupon toggle
        const couponToggle = this.modal.querySelector('.coupon-toggle');
        if (couponToggle) {
            couponToggle.addEventListener('click', () => this.toggleCoupon());
        }
        
        // Apply coupon button
        const couponButton = this.modal.querySelector('.coupon-btn');
        if (couponButton) {
            couponButton.addEventListener('click', () => this.applyCoupon());
        }
        
        // Payment button
        const paymentButton = this.modal.querySelector('.payment-btn');
        if (paymentButton) {
            paymentButton.addEventListener('click', () => this.initiatePayment());
        }
        
        // *** FIX: Redemption link - Clear any inline handlers and use a proper event listener ***
        const redemptionLink = this.modal.querySelector('.redemption-option a');
        if (redemptionLink) {
            // First, remove the inline onclick attribute to avoid conflicts
            redemptionLink.removeAttribute('onclick');
            
            // Then add our event listener
            redemptionLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Redemption link clicked');
                this.showRedemptionForm();
                return false;
            });
            console.log('Redemption link handler attached successfully');
        } else {
            console.error('Redemption link not found');
        }
        
        // Redemption button
        const redemptionButton = this.modal.querySelector('.redemption-btn');
        if (redemptionButton) {
            redemptionButton.addEventListener('click', () => this.redeemCode());
        }
        
        // Return to payment link
        const returnLink = this.modal.querySelector('.redemption-footer a');
        if (returnLink) {
            returnLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPaymentForm();
            });
        }
        
        // Success button
        const successButton = this.modal.querySelector('.success-btn');
        if (successButton) {
            successButton.addEventListener('click', () => this.closeModal());
        }
        
        // Retry button
        const retryButton = this.modal.querySelector('.retry-btn');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.showPaymentForm());
        }
    }
    
    /**
     * Open the payment modal
     */
    static openModal() {
        if (!this.modal) {
            // If modal isn't available yet, load it and retry opening
            this.loadHTML();
            setTimeout(() => this.openModal(), 500);
            return;
        }
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Show the payment form
        this.showPaymentForm();
        
        // Display the modal
        this.modal.style.display = 'block';
        
        console.log('Payment modal opened');
    }
    
    /**
     * Close the payment modal
     */
    static closeModal() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        this.isProcessing = false;
        
        console.log('Payment modal closed');
    }
    
    /**
     * Show the payment form
     */
    static showPaymentForm() {
        if (!this.modal) return;
        
        // Hide all forms
        const forms = this.modal.querySelectorAll('.payment-form');
        forms.forEach(form => form.classList.remove('active'));
        
        // Show payment form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.classList.add('active');
        }
        
        // Update summary
        this.updateSummary();
    }
    
    /**
     * Show the redemption form
     * *** FIXED METHOD ***
     */
    static showRedemptionForm() {
        if (!this.modal) {
            console.error('Modal not found when showing redemption form');
            return;
        }
        
        console.log('Showing redemption form');
        
        // Hide all forms
        const forms = this.modal.querySelectorAll('.payment-form');
        forms.forEach(form => {
            form.classList.remove('active');
            console.log(`Removed active class from form: ${form.id}`);
        });
        
        // Show redemption form
        const redemptionForm = document.getElementById('redemptionForm');
        if (redemptionForm) {
            redemptionForm.classList.add('active');
            console.log('Added active class to redemption form');
            
            // Focus on the redemption code input
            const codeInput = document.getElementById('redemptionCode');
            if (codeInput) {
                setTimeout(() => {
                    try {
                        codeInput.focus();
                        console.log('Focused on redemption code input');
                    } catch(e) {
                        console.error('Error focusing on redemption code input:', e);
                    }
                }, 100);
            }
        } else {
            console.error('Redemption form not found in DOM');
        }
    }
    
    /**
     * Show loading state
     */
    static showLoading() {
        if (!this.modal) return;
        
        // Hide all forms
        const forms = this.modal.querySelectorAll('.payment-form');
        forms.forEach(form => form.classList.remove('active'));
        
        // Show loading form
        const loadingForm = document.getElementById('paymentLoading');
        if (loadingForm) {
            loadingForm.classList.add('active');
        }
    }
    
    /**
     * Show success message
     */
    static showSuccess() {
        if (!this.modal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Hide all forms
        const forms = this.modal.querySelectorAll('.payment-form');
        forms.forEach(form => form.classList.remove('active'));
        
        // Show success form
        const successForm = document.getElementById('paymentSuccess');
        if (successForm) {
            successForm.classList.add('active');
        }
        
        // If PaymentAuth is available, update its state
        if (window.PaymentAuth) {
            // Trigger UI update
            setTimeout(() => {
                if (typeof window.PaymentAuth.updateUI === 'function') {
                    window.PaymentAuth.updateUI();
                }
            }, 500);
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    static showError(message) {
        if (!this.modal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Hide all forms
        const forms = this.modal.querySelectorAll('.payment-form');
        forms.forEach(form => form.classList.remove('active'));
        
        // Update error message
        const errorMessageEl = document.getElementById('errorMessage');
        if (errorMessageEl && message) {
            errorMessageEl.textContent = message;
        }
        
        // Show error form
        const errorForm = document.getElementById('paymentError');
        if (errorForm) {
            errorForm.classList.add('active');
        }
    }
    
    /**
     * Update payment summary
     */
    static updateSummary() {
        // Get summary elements
        const summaryPlan = document.getElementById('summaryPlan');
        const summaryPrice = document.getElementById('summaryPrice');
        const summaryDiscount = document.getElementById('summaryDiscount');
        const summaryTotal = document.getElementById('summaryTotal');
        const discountRow = document.getElementById('discountRow');
        
        // Update text content
        if (summaryPlan) {
            summaryPlan.textContent = this.selectedPlan.name;
        }
        
        if (summaryPrice) {
            summaryPrice.textContent = `₹${this.selectedPlan.price}`;
        }
        
        if (summaryDiscount) {
            summaryDiscount.textContent = `-₹${this.selectedPlan.discountAmount}`;
        }
        
        if (summaryTotal) {
            summaryTotal.textContent = `₹${this.selectedPlan.totalPrice}`;
        }
        
        // Show/hide discount row
        if (discountRow) {
            discountRow.style.display = this.selectedPlan.discountAmount > 0 ? 'flex' : 'none';
        }
    }
    
    /**
     * Select a pricing plan
     * @param {string} planType - The type of plan to select (monthly/annual)
     * @param {HTMLElement} element - The plan element that was clicked
     */
    static selectPlan(planType, element) {
        // Update UI
        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        if (element) {
            element.classList.add('selected');
        } else {
            // Find the element by data attribute
            const planElement = document.querySelector(`.plan-option[data-plan="${planType}"]`);
            if (planElement) {
                planElement.classList.add('selected');
            }
        }
        
        // Update plan data
        if (planType === 'monthly') {
            this.selectedPlan = {
                type: 'monthly',
                name: '1 Month Premium',
                price: 499,
                discountAmount: 0,
                totalPrice: 499
            };
        } else if (planType === 'annual') {
            this.selectedPlan = {
                type: 'annual',
                name: '1 Year Premium',
                price: 999,
                discountAmount: 0,
                totalPrice: 999
            };
        }
        
        // Update summary
        this.updateSummary();
        
        console.log(`Selected plan: ${planType}`);
    }
    
    /**
     * Toggle coupon input display
     */
    static toggleCoupon() {
        const couponContainer = document.getElementById('couponContainer');
        const couponToggleText = document.getElementById('couponToggleText');
        
        if (!couponContainer || !couponToggleText) return;
        
        if (couponContainer.style.display === 'none' || couponContainer.style.display === '') {
            couponContainer.style.display = 'block';
            couponToggleText.textContent = 'Hide';
            
            // Focus on coupon input
            const couponInput = document.getElementById('couponCode');
            if (couponInput) {
                setTimeout(() => couponInput.focus(), 100);
            }
        } else {
            couponContainer.style.display = 'none';
            couponToggleText.textContent = 'Click here';
        }
    }
    
    /**
     * Apply coupon code
     */
    static applyCoupon() {
        const couponCode = document.getElementById('couponCode');
        if (!couponCode) return;
        
        const code = couponCode.value.trim();
        const couponMessage = document.getElementById('couponMessage');
        
        if (!code) {
            if (couponMessage) {
                couponMessage.textContent = 'Please enter a coupon code';
                couponMessage.className = 'coupon-message error';
            }
            return;
        }
        
        // Show processing message
        if (couponMessage) {
            couponMessage.textContent = 'Validating coupon...';
            couponMessage.className = 'coupon-message';
        }
        
        // Process coupon code
        setTimeout(() => {
            // Valid coupon codes
            const validCoupons = {
                'WELCOME10': { discount: 10, message: '10% discount applied!' },
                'STUDENT50': { discount: 50, message: '50% discount applied!' },
                'SPRING2025': { discount: 15, message: '15% discount applied!' }
            };
            
            const couponInfo = validCoupons[code.toUpperCase()];
            
            if (couponInfo) {
                // Apply discount
                const discountPercentage = couponInfo.discount;
                const discountAmount = Math.round(this.selectedPlan.price * (discountPercentage / 100));
                
                this.selectedPlan.discountAmount = discountAmount;
                this.selectedPlan.totalPrice = this.selectedPlan.price - discountAmount;
                
                // Show success message
                if (couponMessage) {
                    couponMessage.textContent = couponInfo.message;
                    couponMessage.className = 'coupon-message success';
                }
            } else {
                // Invalid coupon
                if (couponMessage) {
                    couponMessage.textContent = 'Invalid or expired coupon code';
                    couponMessage.className = 'coupon-message error';
                }
                
                // Reset discount
                this.selectedPlan.discountAmount = 0;
                this.selectedPlan.totalPrice = this.selectedPlan.price;
            }
            
            // Update summary
            this.updateSummary();
        }, 800);
    }
    
    /**
     * Process redemption code
     */
    static redeemCode() {
        // Prevent multiple submissions
        if (this.isProcessing) {
            console.log('Redemption already in progress');
            return;
        }
        
        this.isProcessing = true;
        console.log('Processing redemption code');
        
        // Get code input
        const redemptionCode = document.getElementById('redemptionCode');
        if (!redemptionCode) {
            this.isProcessing = false;
            return;
        }
        
        const code = redemptionCode.value.trim();
        const errorElement = document.getElementById('redemptionCodeError');
        
        // Validate input
        if (!code) {
            if (errorElement) {
                errorElement.textContent = 'Please enter a redemption code';
            }
            this.isProcessing = false;
            return;
        }
        
        // Clear error
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        // Show loading state
        this.showLoading();
        
        // If PaymentAuth is available, use its verification method
        if (window.PaymentAuth && typeof window.PaymentAuth.verifyRedemptionCode === 'function') {
            window.PaymentAuth.verifyRedemptionCode(code)
                .then(isValid => {
                    if (isValid) {
                        this.showSuccess();
                        
                        if (window.showToast) {
                            window.showToast('Premium access activated successfully!', 'success');
                        }
                    } else {
                        this.showRedemptionForm();
                        if (errorElement) {
                            errorElement.textContent = 'Invalid or expired redemption code';
                        }
                        
                        if (window.showToast) {
                            window.showToast('Invalid redemption code', 'error');
                        }
                    }
                    this.isProcessing = false;
                })
                .catch(error => {
                    console.error('Redemption error:', error);
                    this.showError('Error processing redemption code. Please try again later.');
                    this.isProcessing = false;
                });
            return;
        }
        
        // Fallback implementation for testing
        setTimeout(() => {
            try {
                // For testing purposes - valid codes
                const validCodes = ['NEXTSTEP123', 'DEMO2024', 'WELCOME10'];
                
                if (validCodes.includes(code.toUpperCase())) {
                    // Calculate expiry date (30 days from now)
                    const now = new Date();
                    const expiryDate = new Date(now);
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    
                    // Update localStorage
                    localStorage.setItem('isPremium', 'true');
                    localStorage.setItem('premiumExpiry', expiryDate.toISOString());
                    
                    // Show success message
                    this.showSuccess();
                    
                    // Notify PaymentAuth if available
                    if (window.PaymentAuth) {
                        window.PaymentAuth.isPaid = true;
                        window.PaymentAuth.paymentExpiry = expiryDate.toISOString();
                        setTimeout(() => {
                            if (window.PaymentAuth.updateUI) {
                                window.PaymentAuth.updateUI();
                            }
                        }, 500);
                    }
                    
                    // Show toast notification
                    if (window.showToast) {
                        window.showToast('Premium access activated successfully!', 'success');
                    }
                } else {
                    // Invalid code
                    this.showRedemptionForm();
                    if (errorElement) {
                        errorElement.textContent = 'Invalid or expired redemption code';
                    }
                    
                    if (window.showToast) {
                        window.showToast('Invalid redemption code', 'error');
                    }
                }
                
                this.isProcessing = false;
            } catch (error) {
                console.error('Redemption error:', error);
                this.showError('Error processing redemption code. Please try again later.');
                this.isProcessing = false;
            }
        }, 1500);
    }
    
    /**
     * Initiate payment process
     */
    static initiatePayment() {
        // Prevent multiple submissions
        if (this.isProcessing) {
            console.log('Payment already in progress');
            return;
        }
        
        this.isProcessing = true;
        console.log('Initiating payment process');
        
        // Show loading state
        this.showLoading();
        
        // For demo purposes, we'll just show an error message
        // directing users to use redemption codes instead
        setTimeout(() => {
            this.showError('Payment system is currently in testing mode. Please use a redemption code instead.');
            this.isProcessing = false;
        }, 1500);
        
        // In a real implementation, this is where you would:
        // 1. Create an order via a server API
        // 2. Initialize Razorpay with the order details
        // 3. Open the Razorpay payment window
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => PaymentModal.init(), 1000);
});

// Watch for dynamically added payment modal
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
                if (node.id === 'paymentModal' || 
                    (node.querySelector && node.querySelector('#paymentModal'))) {
                    console.log('Payment modal added to DOM, initializing');
                    setTimeout(() => PaymentModal.init(), 300);
                    return;
                }
            }
        }
    }
});

// Start observing the document body
observer.observe(document.body, { childList: true, subtree: true });

// Make PaymentModal available globally
window.PaymentModal = PaymentModal;
console.log('PaymentModal added to global scope');

// Add a fallback check on window load
window.addEventListener('load', function() {
    setTimeout(function() {
        if (!document.getElementById('paymentModal') && typeof PaymentModal === 'object') {
            console.log('Payment modal not found after window load, attempting to load it');
            PaymentModal.loadHTML();
        }
    }, 3000);
});
