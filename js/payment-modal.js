// PaymentModal.js - Handles payment modal functionality
const PaymentModal = {
    // Store selected plan data
    selectedPlan: {
        type: 'monthly',
        name: '1 Month Premium',
        price: 499,
        discountAmount: 0,
        totalPrice: 499
    },
    
    // Initialize the payment modal
    init: function() {
        // Check if the modal exists in the DOM
        const modalContainer = document.getElementById('paymentModal');
        if (!modalContainer) {
            console.error('Payment modal not found in the DOM');
            return;
        }
        
        // Add close button event listener
        const closeButtons = document.querySelectorAll('#paymentModal .close');
        closeButtons.forEach(button => {
            button.addEventListener('click', this.closeModal);
        });
        
        // Listen for clicks outside the modal
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('paymentModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
        
        // Set up plan selection
        const monthlyPlan = document.querySelector('.plan-option[data-plan="monthly"]');
        const annualPlan = document.querySelector('.plan-option[data-plan="annual"]');
        
        if (monthlyPlan) {
            monthlyPlan.addEventListener('click', () => this.selectPlan('monthly', monthlyPlan));
        }
        
        if (annualPlan) {
            annualPlan.addEventListener('click', () => this.selectPlan('annual', annualPlan));
        }
        
        // Set up coupon toggle
        const couponToggle = document.getElementById('couponToggleText');
        if (couponToggle) {
            const couponToggleContainer = couponToggle.parentElement;
            couponToggleContainer.addEventListener('click', this.toggleCoupon);
        }
        
        // Set up coupon apply button
        const applyButton = document.querySelector('.coupon-btn');
        if (applyButton) {
            applyButton.addEventListener('click', this.applyCoupon.bind(this));
        }
        
        // Initialize payment button
        const paymentButton = document.querySelector('.payment-btn');
        if (paymentButton) {
            paymentButton.addEventListener('click', this.initiatePayment.bind(this));
        }
        
        // Initialize redemption link
        const redemptionLink = document.querySelector('.redemption-option a');
        if (redemptionLink) {
            redemptionLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRedemptionForm();
            });
        }
        
        // Initialize back to payment link
        const backToPaymentLink = document.querySelector('.redemption-footer a');
        if (backToPaymentLink) {
            backToPaymentLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPaymentForm();
            });
        }
        
        // Initialize redemption button
        const redeemButton = document.querySelector('.redemption-btn');
        if (redeemButton) {
            redeemButton.addEventListener('click', this.redeemCode.bind(this));
        }
        
        // Initialize success button
        const successButton = document.querySelector('.success-btn');
        if (successButton) {
            successButton.addEventListener('click', this.closeModal);
        }
        
        // Initialize retry button
        const retryButton = document.querySelector('.retry-btn');
        if (retryButton) {
            retryButton.addEventListener('click', this.showPaymentForm.bind(this));
        }
        
        console.log('Payment modal initialized');
    },
    
    // Open the payment modal
    openModal: function() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'block';
            this.showPaymentForm();
            console.log('Payment modal opened');
        } else {
            console.error('Payment modal not found in the DOM');
        }
    },
    
    // Close the payment modal
    closeModal: function() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('Payment modal closed');
        }
    },
    
    // Show payment form
    showPaymentForm: function() {
        this.hideAllForms();
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.classList.add('active');
            this.updateSummary();
        }
    },
    
    // Show redemption form
    showRedemptionForm: function() {
        this.hideAllForms();
        const redemptionForm = document.getElementById('redemptionForm');
        if (redemptionForm) {
            redemptionForm.classList.add('active');
        }
    },
    
    // Show loading state
    showLoading: function() {
        this.hideAllForms();
        const loadingForm = document.getElementById('paymentLoading');
        if (loadingForm) {
            loadingForm.classList.add('active');
        }
    },
    
    // Show success message
    showSuccess: function() {
        this.hideAllForms();
        const successForm = document.getElementById('paymentSuccess');
        if (successForm) {
            successForm.classList.add('active');
        }
    },
    
    // Show error message
    showError: function(message) {
        this.hideAllForms();
        if (message) {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
        const errorForm = document.getElementById('paymentError');
        if (errorForm) {
            errorForm.classList.add('active');
        }
    },
    
    // Hide all forms
    hideAllForms: function() {
        const forms = document.querySelectorAll('.payment-form');
        forms.forEach(form => {
            form.classList.remove('active');
        });
    },
    
    // Select a pricing plan
    selectPlan: function(planType, element) {
        // Update UI
        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        if (element) {
            element.classList.add('selected');
        } else {
            // Find the plan element by data attribute and select it
            const planElement = document.querySelector(`.plan-option[data-plan="${planType}"]`);
            if (planElement) {
                planElement.classList.add('selected');
            }
        }
        
        // Update selected plan data
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
        
        // Update payment summary
        this.updateSummary();
        
        console.log(`Selected plan: ${planType}`);
    },
    
    // Toggle coupon input display
    toggleCoupon: function() {
        const couponContainer = document.getElementById('couponContainer');
        const couponToggleText = document.getElementById('couponToggleText');
        
        if (!couponContainer || !couponToggleText) return;
        
        if (couponContainer.style.display === 'none') {
            couponContainer.style.display = 'block';
            couponToggleText.textContent = 'Hide';
        } else {
            couponContainer.style.display = 'none';
            couponToggleText.textContent = 'Click here';
        }
    },
    
    // Apply coupon code
    applyCoupon: function() {
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
        
        // Show loading state
        if (couponMessage) {
            couponMessage.textContent = 'Validating coupon...';
            couponMessage.className = 'coupon-message';
        }
        
        // Simulate coupon validation (replace with actual API call)
        setTimeout(() => {
            // Example: WELCOME10 gives 10% off, STUDENT50 gives 50% off
            let discountPercentage = 0;
            let discountMessage = '';
            
            if (code.toUpperCase() === 'WELCOME10') {
                discountPercentage = 10;
                discountMessage = '10% discount applied!';
                if (couponMessage) {
                    couponMessage.className = 'coupon-message success';
                }
            } else if (code.toUpperCase() === 'STUDENT50') {
                discountPercentage = 50;
                discountMessage = '50% discount applied!';
                if (couponMessage) {
                    couponMessage.className = 'coupon-message success';
                }
            } else {
                discountMessage = 'Invalid or expired coupon code';
                if (couponMessage) {
                    couponMessage.className = 'coupon-message error';
                }
            }
            
            if (couponMessage) {
                couponMessage.textContent = discountMessage;
            }
            
            if (discountPercentage > 0) {
                // Calculate discount
                const discount = Math.round(this.selectedPlan.price * (discountPercentage / 100));
                this.selectedPlan.discountAmount = discount;
                this.selectedPlan.totalPrice = this.selectedPlan.price - discount;
                
                // Update summary
                this.updateSummary();
                
                // Show discount row
                const discountRow = document.getElementById('discountRow');
                if (discountRow) {
                    discountRow.style.display = 'flex';
                }
            } else {
                // Reset discount if invalid coupon
                this.selectedPlan.discountAmount = 0;
                this.selectedPlan.totalPrice = this.selectedPlan.price;
                
                // Update summary
                this.updateSummary();
                
                // Hide discount row
                const discountRow = document.getElementById('discountRow');
                if (discountRow) {
                    discountRow.style.display = 'none';
                }
            }
        }, 1000);
    },
    
    // Update payment summary
    updateSummary: function() {
        const summaryPlan = document.getElementById('summaryPlan');
        const summaryPrice = document.getElementById('summaryPrice');
        const summaryDiscount = document.getElementById('summaryDiscount');
        const summaryTotal = document.getElementById('summaryTotal');
        const discountRow = document.getElementById('discountRow');
        
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
            if (this.selectedPlan.discountAmount > 0) {
                discountRow.style.display = 'flex';
            } else {
                discountRow.style.display = 'none';
            }
        }
    },
    
    // Initiate payment process
    initiatePayment: function() {
        this.showLoading();
        
        // In a real implementation, you would make an API call to your backend to create an order
        // Here we simulate the process
        setTimeout(() => {
            // Check if we can use window.firebase
            let firebaseAvailable = false;
            try {
                firebaseAvailable = !!(window.firebase && window.firebase.auth);
            } catch (e) {
                console.error('Firebase not available:', e);
            }
            
            if (!firebaseAvailable) {
                this.showError('Payment processing is currently unavailable. Please try again later or contact support.');
                return;
            }
            
            try {
                // Try to load Razorpay
                this.loadRazorpayScript()
                    .then(() => {
                        // Create a simulated order
                        const orderData = {
                            id: 'order_' + Math.random().toString(36).substring(2, 15),
                            amount: this.selectedPlan.totalPrice * 100, // Amount in paise
                            currency: 'INR',
                            receipt: 'receipt_' + Date.now()
                        };
                        
                        this.openRazorpayCheckout(orderData);
                    })
                    .catch(error => {
                        console.error('Failed to load Razorpay:', error);
                        this.showError('Payment gateway is currently unavailable. Please try again later.');
                    });
            } catch (error) {
                console.error('Payment initialization error:', error);
                this.showError('Failed to initialize payment. Please try again later.');
            }
        }, 1500);
    },
    
    // Load Razorpay script
    loadRazorpayScript: function() {
        return new Promise((resolve, reject) => {
            // If already loaded, resolve immediately
            if (window.Razorpay) {
                resolve();
                return;
            }
            
            // Load the script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
                console.log('Razorpay script loaded');
                resolve();
            };
            script.onerror = (error) => {
                console.error('Error loading Razorpay script:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    },
    
    // Open Razorpay checkout
    openRazorpayCheckout: function(orderData) {
        // In a real implementation, use your actual Razorpay key
        const options = {
            key: 'rzp_test_YourTestKeyHere', // Replace with your actual key in production
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'NextStep Educational Services',
            description: this.selectedPlan.name,
            order_id: orderData.id,
            image: 'nextstep_logo.jpeg',
            handler: function(response) {
                // This function runs after successful payment
                PaymentModal.processPaymentSuccess(response);
            },
            prefill: {
                name: '', // Could be populated from user profile
                email: '', // Could be populated from user profile
                contact: '' // Could be populated from user profile
            },
            theme: {
                color: '#006B6B'
            },
            modal: {
                ondismiss: function() {
                    // Handle case when user closes the Razorpay modal
                    PaymentModal.showPaymentForm();
                }
            }
        };
        
        try {
            const razorpayCheckout = new Razorpay(options);
            razorpayCheckout.open();
        } catch (error) {
            console.error('Razorpay error:', error);
            this.showError('Unable to initialize payment gateway. Please try again later.');
        }
    },
    
    // Process successful payment
    processPaymentSuccess: function(response) {
        console.log('Payment successful, processing...', response);
        
        // Show loading state while verifying payment
        this.showLoading();
        
        // In a real implementation, you would verify the payment with your backend
        // Here we simulate the verification process
        setTimeout(() => {
            try {
                // Get current user
                let currentUser = null;
                let firestore = null;
                
                try {
                    const firebase = window.firebase;
                    if (firebase && firebase.auth) {
                        currentUser = firebase.auth().currentUser;
                        firestore = firebase.firestore();
                    }
                } catch (error) {
                    console.error('Firebase error:', error);
                }
                
                if (!currentUser || !firestore) {
                    this.showError('User authentication error. Please log in again.');
                    return;
                }
                
                // Calculate expiry date (1 month or 1 year from now)
                const now = new Date();
                const expiryDate = new Date(now);
                
                if (this.selectedPlan.type === 'monthly') {
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                } else {
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                }
                
                // Update user's payment status in Firestore
                firestore.collection('users').doc(currentUser.uid).update({
                    isPaid: true,
                    paymentExpiry: expiryDate.toISOString(),
                    paymentHistory: firebase.firestore.FieldValue.arrayUnion({
                        plan: this.selectedPlan.name,
                        amount: this.selectedPlan.totalPrice,
                        paymentId: response.razorpay_payment_id,
                        orderId: response.razorpay_order_id,
                        timestamp: now.toISOString(),
                        expiryDate: expiryDate.toISOString()
                    })
                }).then(() => {
                    // Update local user status
                    localStorage.setItem('isPremium', 'true');
                    
                    // Show success and trigger any needed UI updates
                    this.showSuccess();
                    
                    // Refresh payment auth state after 2 seconds
                    setTimeout(() => {
                        // This would update the UI based on the new premium status
                        window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                            detail: { isPaid: true }
                        }));
                        
                        // Notify PaymentAuth if available
                        if (window.PaymentAuth) {
                            window.PaymentAuth.refreshPaymentStatus();
                        }
                    }, 2000);
                }).catch(error => {
                    console.error('Error updating user profile:', error);
                    this.showError('Payment was successful, but we could not update your account. Please contact support.');
                });
            } catch (error) {
                console.error('Payment verification error:', error);
                this.showError('Error processing payment. Please contact support.');
            }
        }, 2000);
    },
    
    // Process redemption code
    redeemCode: function() {
        const redemptionCode = document.getElementById('redemptionCode');
        if (!redemptionCode) return;
        
        const code = redemptionCode.value.trim();
        const errorElement = document.getElementById('redemptionCodeError');
        
        if (!code) {
            if (errorElement) {
                errorElement.textContent = 'Please enter a redemption code';
            }
            return;
        }
        
        // Clear previous errors
        if (errorElement) {
            errorElement.textContent = '';
        }
        
        // Show loading state
        this.showLoading();
        
        // In a real implementation, you would validate the redemption code with your backend
        // Here we simulate the validation process
        setTimeout(() => {
            try {
                // Check if Firebase is available
                let currentUser = null;
                let firestore = null;
                
                try {
                    const firebase = window.firebase;
                    if (firebase && firebase.auth) {
                        currentUser = firebase.auth().currentUser;
                        firestore = firebase.firestore();
                    }
                } catch (error) {
                    console.error('Firebase error:', error);
                }
                
                if (!currentUser || !firestore) {
                    this.showError('User authentication error. Please log in again.');
                    return;
                }
                
                // Example validation: codes starting with 'NEXTSTEP' are valid for 1 month
                if (code.toUpperCase().startsWith('NEXTSTEP')) {
                    // Calculate expiry date (30 days from now)
                    const now = new Date();
                    const expiryDate = new Date(now);
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    
                    // Update user's status in Firestore
                    firestore.collection('users').doc(currentUser.uid).update({
                        isPaid: true,
                        paymentExpiry: expiryDate.toISOString(),
                        redemptionCodes: firebase.firestore.FieldValue.arrayUnion({
                            code: code,
                            activatedAt: now.toISOString(),
                            expiresAt: expiryDate.toISOString()
                        })
                    }).then(() => {
                        // Update local user status
                        localStorage.setItem('isPremium', 'true');
                        
                        // Show success
                        this.showSuccess();
                        
                        // Refresh payment auth state after 2 seconds
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                                detail: { isPaid: true }
                            }));
                            
                            // Notify PaymentAuth if available
                            if (window.PaymentAuth) {
                                window.PaymentAuth.refreshPaymentStatus();
                            }
                        }, 2000);
                    }).catch(error => {
                        console.error('Error updating user profile:', error);
                        this.showError('Code was valid, but we could not update your account. Please contact support.');
                    });
                } else {
                    // Invalid code
                    this.showPaymentForm();
                    if (errorElement) {
                        errorElement.textContent = 'Invalid or expired redemption code';
                    }
                }
            } catch (error) {
                console.error('Redemption error:', error);
                this.showError('Error processing redemption code. Please try again later.');
            }
        }, 1500);
    }
};

// Export the PaymentModal object for use in other scripts
window.PaymentModal = PaymentModal;

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Delayed initialization to ensure modal HTML is loaded
    setTimeout(function() {
        if (document.getElementById('paymentModal')) {
            PaymentModal.init();
        }
    }, 1000);
});
