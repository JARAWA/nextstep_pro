// PaymentModal.js - Updated to handle Firebase availability properly
const PaymentModal = {
    // Store selected plan data
    selectedPlan: {
        type: 'monthly',
        name: '1 Month Premium',
        price: 499,
        discountAmount: 0,
        totalPrice: 499
    },
    
    // Flag to track Firebase availability
    firebaseAvailable: false,
    
    // Initialize the payment modal
    init: function() {
        console.log('Initializing PaymentModal');
        
        // Check Firebase availability first
        this.checkFirebaseStatus();
        
        // Check if the modal exists in the DOM
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) {
            console.error('Payment modal not found in the DOM');
            return;
        }
        
        // First, hide all forms
        const forms = paymentModal.querySelectorAll('.payment-form');
        forms.forEach(form => {
            form.classList.remove('active');
        });
        
        // Show only the payment form initially
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.classList.add('active');
        }
        
        // Add close button event listeners with direct binding
        const closeButtons = paymentModal.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal());
        });
        
        // Setup plan selection buttons
        const planOptions = paymentModal.querySelectorAll('.plan-option');
        planOptions.forEach(plan => {
            plan.addEventListener('click', () => {
                const planType = plan.getAttribute('data-plan');
                this.selectPlan(planType, plan);
            });
        });
        
        // Setup coupon toggle
        const couponToggle = paymentModal.querySelector('.coupon-toggle');
        if (couponToggle) {
            couponToggle.addEventListener('click', () => this.toggleCoupon());
        }
        
        // Setup coupon apply button
        const applyButton = paymentModal.querySelector('.coupon-btn');
        if (applyButton) {
            applyButton.addEventListener('click', () => this.applyCoupon());
        }
        
        // Setup payment button
        const paymentButton = paymentModal.querySelector('.payment-btn');
        if (paymentButton) {
            paymentButton.removeEventListener('click', this.initiatePayment);
            paymentButton.addEventListener('click', () => this.initiatePayment());
        }
        
        // Setup redemption link
        const redemptionLink = paymentModal.querySelector('.redemption-option a');
        if (redemptionLink) {
            redemptionLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRedemptionForm();
            });
        }
        
        // Setup back to payment link
        const backToPaymentLink = paymentModal.querySelector('.redemption-footer a');
        if (backToPaymentLink) {
            backToPaymentLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPaymentForm();
            });
        }
        
        // Setup redemption button
        const redeemButton = paymentModal.querySelector('.redemption-btn');
        if (redeemButton) {
            redeemButton.addEventListener('click', () => this.redeemCode());
        }
        
        // Setup success button
        const successButton = paymentModal.querySelector('.success-btn');
        if (successButton) {
            successButton.addEventListener('click', () => this.closeModal());
        }
        
        // Setup retry button
        const retryButton = paymentModal.querySelector('.retry-btn');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                console.log('Retry button clicked');
                this.showPaymentForm();
            });
        }
        
        console.log('Payment modal initialization completed');
    },
    
    // Check Firebase availability and adjust UI accordingly
    checkFirebaseStatus: function() {
        if (!window.firebase || !window.firebase.auth || !window.firebase.firestore) {
            console.warn('Firebase not detected. Payment functionality will be limited.');
            
            // Set flag to indicate Firebase is not available
            this.firebaseAvailable = false;
            
            // Try to initialize Firebase if the FirebaseInit helper is available
            if (window.FirebaseInit) {
                window.FirebaseInit.initializeFirebase()
                    .then(() => {
                        console.log('Firebase initialized successfully via FirebaseInit');
                        this.firebaseAvailable = true;
                        
                        // Update UI to show Firebase is now available
                        this.updateUIForFirebaseStatus(true);
                    })
                    .catch(err => {
                        console.error('Firebase initialization failed:', err);
                        // Keep UI in limited mode
                        this.updateUIForFirebaseStatus(false);
                    });
            } else {
                // If FirebaseInit is not available, update UI for limited functionality
                this.updateUIForFirebaseStatus(false);
            }
        } else {
            this.firebaseAvailable = true;
            console.log('Firebase is available. Full payment functionality enabled.');
            this.updateUIForFirebaseStatus(true);
        }
    },
    
    // Update UI based on Firebase availability
    updateUIForFirebaseStatus: function(isAvailable) {
        if (!isAvailable) {
            // Adjust UI for Firebase unavailability
            const paymentModal = document.getElementById('paymentModal');
            if (!paymentModal) return;
            
            // Update payment button to direct to redemption form
            const paymentButton = paymentModal.querySelector('.payment-btn');
            if (paymentButton) {
                paymentButton.textContent = 'Use Redemption Code';
                
                // Remove existing listeners and add one for redemption
                paymentButton.replaceWith(paymentButton.cloneNode(true));
                const newPaymentButton = paymentModal.querySelector('.payment-btn');
                newPaymentButton.addEventListener('click', () => this.showRedemptionForm());
            }
            
            // Add notification about limited functionality
            const paymentHeader = paymentModal.querySelector('.payment-header');
            if (paymentHeader) {
                const notificationExists = paymentModal.querySelector('.firebase-notification');
                if (!notificationExists) {
                    const notification = document.createElement('div');
                    notification.className = 'firebase-notification';
                    notification.style.backgroundColor = '#fff3cd';
                    notification.style.color = '#856404';
                    notification.style.padding = '10px';
                    notification.style.marginBottom = '15px';
                    notification.style.borderRadius = '4px';
                    notification.style.fontSize = '14px';
                    notification.textContent = 'Online payment is currently unavailable. Please use a redemption code.';
                    
                    paymentHeader.parentNode.insertBefore(notification, paymentHeader.nextSibling);
                }
            }
            
            // Hide elements that require Firebase
            const elementsRequiringFirebase = paymentModal.querySelectorAll('.requires-firebase');
            elementsRequiringFirebase.forEach(el => {
                el.style.display = 'none';
            });
        } else {
            // Firebase is available, ensure normal UI
            const paymentModal = document.getElementById('paymentModal');
            if (!paymentModal) return;
            
            // Remove notification if it exists
            const notification = paymentModal.querySelector('.firebase-notification');
            if (notification) {
                notification.remove();
            }
            
            // Restore payment button
            const paymentButton = paymentModal.querySelector('.payment-btn');
            if (paymentButton && paymentButton.textContent === 'Use Redemption Code') {
                paymentButton.textContent = 'Proceed to Payment';
                
                // Remove existing listeners and add the normal one
                paymentButton.replaceWith(paymentButton.cloneNode(true));
                const newPaymentButton = paymentModal.querySelector('.payment-btn');
                newPaymentButton.addEventListener('click', () => this.initiatePayment());
            }
            
            // Show elements that require Firebase
            const elementsRequiringFirebase = paymentModal.querySelectorAll('.requires-firebase');
            elementsRequiringFirebase.forEach(el => {
                el.style.display = '';
            });
        }
    },
    
    // Open the payment modal
    openModal: function() {
        console.log('Opening payment modal');
        const modal = document.getElementById('paymentModal');
        if (modal) {
            // Reset any previously active forms
            const allForms = modal.querySelectorAll('.payment-form');
            allForms.forEach(form => {
                form.classList.remove('active');
            });
            
            // Show the main payment form
            const paymentForm = document.getElementById('paymentForm');
            if (paymentForm) {
                paymentForm.classList.add('active');
            }
            
            // Display the modal
            modal.style.display = 'block';
            
            // Update the payment summary
            this.updateSummary();
            
            // Check Firebase status again when opening the modal
            this.checkFirebaseStatus();
            
            console.log('Payment modal opened successfully');
        } else {
            console.error('Payment modal not found in the DOM');
        }
    },
    
    // Initiate payment process
    initiatePayment: function() {
        console.log('Initiating payment process');
        
        // Check if Firebase is required but not available
        if (!this.firebaseAvailable) {
            console.log('Firebase not available, redirecting to redemption flow');
            this.showRedemptionForm();
            return;
        }
        
        this.showLoading();
        
        // Get current user before proceeding
        const currentUser = window.firebase.auth().currentUser;
        if (!currentUser) {
            console.error('User not logged in - cannot proceed with payment');
            setTimeout(() => {
                this.showError('Please login again before making a payment.');
            }, 1000);
            return;
        }
        
        // Continue with simulated payment process
        setTimeout(() => {
            try {
                // In a real implementation, call your backend API here
                // For now, show an appropriate message
                this.showError('Payment system is currently in testing mode. Please use a redemption code instead.');
            } catch (error) {
                console.error('Payment initialization error:', error);
                this.showError('Failed to initialize payment. Please try redemption code instead.');
            }
        }, 1500);
    },
    
    // Process redemption code with proper Firestore integration
    redeemCode: function() {
        console.log('Processing redemption code');
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
        
        // Check Firebase availability
        if (!this.firebaseAvailable) {
            console.error('Firebase is not available - cannot verify code');
            
            // Fallback to localStorage-only mode for testing
            setTimeout(() => {
                try {
                    // For testing purposes without Firebase
                    // Accept any code that starts with "TEST" or specific codes
                    if (code.toUpperCase().startsWith('TEST') || 
                        code.toUpperCase() === 'STUDENT50' || 
                        code.toUpperCase() === 'WELCOME10' ||
                        code.toUpperCase() === 'NEXTSTEP') {
                        
                        // Calculate expiry date (30 days from now)
                        const now = new Date();
                        const expiryDate = new Date(now);
                        expiryDate.setDate(expiryDate.getDate() + 30);
                        
                        // Success handling - update localStorage
                        localStorage.setItem('isPremium', 'true');
                        localStorage.setItem('premiumExpiry', expiryDate.toISOString());
                        
                        // Show success message
                        this.showSuccess();
                        
                        // Trigger an event for any listeners
                        window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                            detail: { 
                                isPaid: true,
                                expiryDate: expiryDate.toISOString()
                            }
                        }));
                    } else {
                        // Invalid code
                        this.showRedemptionForm();
                        if (errorElement) {
                            errorElement.textContent = 'Invalid or expired redemption code';
                        }
                    }
                } catch (error) {
                    console.error('Redemption error:', error);
                    this.showError('Error processing redemption code. Please try again later.');
                }
            }, 1500);
            return;
        }
        
        // Get current user
        const currentUser = window.firebase.auth().currentUser;
        if (!currentUser) {
            console.error('User not logged in - cannot verify code');
            setTimeout(() => {
                this.showError('Please login again before verifying your code.');
            }, 1000);
            return;
        }
        
        // Get Firestore reference
        const db = window.firebase.firestore();
        const userId = currentUser.uid;
        
        // Check the verification code in Firestore
        db.collection('verificationCodes')
            .where('code', '==', code)
            .where('isActive', '==', true)
            .get()
            .then((querySnapshot) => {
                if (querySnapshot.empty) {
                    // No matching code found
                    this.showRedemptionForm();
                    if (errorElement) {
                        errorElement.textContent = 'Invalid or expired redemption code';
                    }
                    return;
                }
                
                // Get the first (should be only) matching document
                const codeDoc = querySnapshot.docs[0];
                const codeData = codeDoc.data();
                
                // Check if code has reached max uses
                if (codeData.usedCount >= codeData.maxUses) {
                    this.showRedemptionForm();
                    if (errorElement) {
                        errorElement.textContent = 'This code has reached its maximum number of uses';
                    }
                    return;
                }
                
                // Check if user has already used this code
                let usedBy = [];
                try {
                    // Try to parse the usedBy field if it's stored as a JSON string
                    if (typeof codeData.usedBy === 'string') {
                        usedBy = JSON.parse(codeData.usedBy);
                    } else if (Array.isArray(codeData.usedBy)) {
                        usedBy = codeData.usedBy;
                    }
                } catch (e) {
                    console.error('Error parsing usedBy data:', e);
                    // Continue with empty array if parsing fails
                }
                
                if (usedBy.includes(userId)) {
                    this.showRedemptionForm();
                    if (errorElement) {
                        errorElement.textContent = 'You have already used this code';
                    }
                    return;
                }
                
                // Code is valid - process it
                
                // Calculate expiry date based on expiryDays field
                const now = new Date();
                const expiryDate = new Date(now);
                expiryDate.setDate(expiryDate.getDate() + (codeData.expiryDays || 30)); // Default to 30 if not specified
                
                // Update the code usage in Firestore
                // First, update the usedBy array
                if (typeof codeData.usedBy === 'string') {
                    // If stored as JSON string, parse, update and stringify again
                    try {
                        let usedByArray = JSON.parse(codeData.usedBy);
                        usedByArray.push(userId);
                        usedBy = JSON.stringify(usedByArray);
                    } catch (e) {
                        // If parsing fails, create new array with just this user
                        usedBy = JSON.stringify([userId]);
                    }
                } else {
                    // If it's already an array, use Firestore array union
                    usedBy = window.firebase.firestore.FieldValue.arrayUnion(userId);
                }
                
                // Update the verification code document
                const codeRef = db.collection('verificationCodes').doc(codeDoc.id);
                codeRef.update({
                    usedCount: window.firebase.firestore.FieldValue.increment(1),
                    usedBy: usedBy,
                    // If code has reached max uses, set isActive to false
                    isActive: (codeData.usedCount + 1 < codeData.maxUses)
                })
                .then(() => {
                    // Success - now update user's premium status
                    return db.collection('users').doc(userId).update({
                        isPaid: true,
                        paymentExpiry: expiryDate.toISOString(),
                        paymentHistory: window.firebase.firestore.FieldValue.arrayUnion({
                            type: 'redemption',
                            code: code,
                            timestamp: now.toISOString(),
                            expiryDate: expiryDate.toISOString()
                        })
                    });
                })
                .then(() => {
                    // Update local storage
                    localStorage.setItem('isPremium', 'true');
                    localStorage.setItem('premiumExpiry', expiryDate.toISOString());
                    
                    // Show success
                    this.showSuccess();
                    
                    // Notify system about payment status change
                    setTimeout(() => {
                        // Update UI
                        if (window.PaymentAuth) {
                            window.PaymentAuth.isPaid = true;
                            window.PaymentAuth.paymentExpiry = expiryDate.toISOString();
                            window.PaymentAuth.updateUI();
                        }
                        
                        // Dispatch event
                        window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                            detail: { 
                                isPaid: true,
                                expiryDate: expiryDate.toISOString()
                            }
                        }));
                    }, 1500);
                })
                .catch((error) => {
                    console.error('Error updating code usage:', error);
                    this.showError('Error processing your redemption code. Please try again later.');
                });
            })
            .catch((error) => {
                console.error('Error checking redemption code:', error);
                this.showError('Error verifying code. Please try again later.');
            });
    },
    
    // Other methods remain unchanged
    // ...
    
    // Show payment form
    showPaymentForm: function() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the payment form
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.classList.add('active');
            // Update the payment summary
            this.updateSummary();
        }
    },
    
    // Show redemption form
    showRedemptionForm: function() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the redemption form
        const redemptionForm = document.getElementById('redemptionForm');
        if (redemptionForm) {
            redemptionForm.classList.add('active');
        }
    },
    
    // Show loading state
    showLoading: function() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the loading form
        const loadingForm = document.getElementById('paymentLoading');
        if (loadingForm) {
            loadingForm.classList.add('active');
        }
    },
    
    // Show success message
    showSuccess: function() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the success form
        const successForm = document.getElementById('paymentSuccess');
        if (successForm) {
            successForm.classList.add('active');
        }
    },
    
    // Show error message
    showError: function(message) {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Update the error message if provided
        if (message) {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
        
        // Then show the error form
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
    
    // Close the payment modal
    closeModal: function() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('Payment modal closed');
        }
    }
};

// Export the PaymentModal object for use in other scripts
window.PaymentModal = PaymentModal;

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Don't initialize immediately - wait for Firebase initialization
    // FirebaseInit will call PaymentModal.init() after it completes
    
    // Fallback initialization if FirebaseInit doesn't exist
    // or doesn't call init within 3 seconds
    setTimeout(function() {
        if (document.getElementById('paymentModal') && 
            (!window.FirebaseInit || !window.firebase)) {
            console.log('Firebase initialization timeout - initializing PaymentModal directly');
            PaymentModal.init();
        }
    }, 3000);
});
