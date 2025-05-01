// payment-modal.js - Non-module version with improved initialization

// Define safer references to Firebase objects
let auth, db, collection, query, where, getDocs, doc, updateDoc, increment, arrayUnion;

// Using window.firebaseAuth from index.html
auth = { 
  currentUser: window.Auth && window.Auth.user ? window.Auth.user : null 
};
console.log('Auth object available:', !!auth);

// Define placeholder functions that will be replaced if Firestore is available
db = null;
collection = query = where = getDocs = doc = updateDoc = increment = arrayUnion = function() {
    console.warn('Firestore function called but Firestore is not initialized');
    return null;
};

// We'll check Firebase availability in the init method
console.log('PaymentModal script loaded - will check Firebase availability during initialization');

// PaymentModal class - handles payment modal functionality
class PaymentModal {
    // Class properties
    static selectedPlan = {
        type: 'monthly',
        name: '1 Month Premium',
        price: 499,
        discountAmount: 0,
        totalPrice: 499
    };
    
    // Flag to track Firebase availability
    static firebaseAvailable = false;
    
    // Add a flag to prevent duplicate initiations
    static isProcessing = false;
    
    // Initialize the payment modal
static init() {
    console.log('Initializing PaymentModal');
    
    // Check Firebase availability first
    this.checkFirebaseStatus();
    
    // Check if the modal exists in the DOM
    const paymentModal = document.getElementById('paymentModal');
    if (!paymentModal) {
        console.log('Payment modal not found in the DOM, attempting to load it');
        // Try to load the payment modal HTML
        this.loadHTML();
        return; // Exit initialization, it will be called again after HTML is loaded
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
        
        // Add close button event listeners
        const closeButtons = paymentModal.querySelectorAll('.close');
        closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default action
                e.stopPropagation(); // Stop propagation
                this.closeModal();
            });
        });
        
        // Fix potential duplicate event listeners for payment button
        const paymentButton = paymentModal.querySelector('.payment-btn');
        if (paymentButton) {
            // Remove existing onclick attribute to prevent double triggering
            paymentButton.removeAttribute('onclick');
            
            // Add event listener directly
            paymentButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.initiatePayment();
            });
        }
        
        // Setup coupon toggle
        const couponToggle = paymentModal.querySelector('.coupon-toggle');
        if (couponToggle) {
            couponToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCoupon();
            });
        }
        
        // Setup coupon apply button
        const applyButton = paymentModal.querySelector('.coupon-btn');
        if (applyButton) {
            applyButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.applyCoupon();
            });
        }
        
        // Setup redemption button with proper event handling
        const redemptionButton = paymentModal.querySelector('.redemption-btn');
        if (redemptionButton) {
            redemptionButton.removeAttribute('onclick');
            redemptionButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.redeemCode();
            });
        }
        
        // Setup redemption link
        const redemptionLink = paymentModal.querySelector('.redemption-option a');
        if (redemptionLink) {
            redemptionLink.removeAttribute('onclick');
            redemptionLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showRedemptionForm();
            });
        }
        
        // Setup back to payment link
        const backToPaymentLink = paymentModal.querySelector('.redemption-footer a');
        if (backToPaymentLink) {
            backToPaymentLink.removeAttribute('onclick');
            backToPaymentLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPaymentForm();
            });
        }
        
        // Setup success button
        const successButton = paymentModal.querySelector('.success-btn');
        if (successButton) {
            successButton.removeAttribute('onclick');
            successButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            });
        }
        
        // Setup retry button
        const retryButton = paymentModal.querySelector('.retry-btn');
        if (retryButton) {
            retryButton.removeAttribute('onclick');
            retryButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPaymentForm();
            });
        }
        
        console.log('Payment modal initialization completed');
    }
    
    // Load payment modal HTML
    static loadHTML() {
        console.log('Attempting to load payment modal HTML');
        const modalContainer = document.getElementById('modal-container');
        
        if (!modalContainer) {
            console.error('Modal container not found!');
            return;
        }
        
        // Check if payment modal already exists
        if (document.getElementById('paymentModal')) {
            console.log('Payment modal already exists, initializing');
            this.init();
            return;
        }
        
        // Fetch the payment modal HTML and add it to the page
        fetch('components/payment-modal.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Create a temporary div to hold the HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Append the first child (the payment modal) to the modal container
                // Make sure we only append it if it doesn't exist yet
                if (!document.getElementById('paymentModal')) {
                    modalContainer.appendChild(tempDiv.firstChild);
                    console.log('Payment modal HTML loaded successfully');
                    
                    // Now initialize the payment modal
                    setTimeout(() => this.init(), 300);
                }
            })
            .catch(error => {
                console.error('Error loading payment modal HTML:', error);
            });
    }
    
static checkFirebaseStatus() {
      // Refresh the currentUser reference
    auth.currentUser = window.Auth && window.Auth.user ? window.Auth.user : null;
        try {
        if (window.firebase && window.firebase.firestore) {
            console.log('Firebase detected via window.firebase');

            // Declare the Firebase-related variables
            const auth = window.firebase.auth();
            const db = window.firebase.firestore();

            // Initialize helper functions
            const collection = function(path) {
                return db.collection(path);
            };

            const query = function(collRef, ...constraints) {
                let ref = collRef;
                constraints.forEach(constraint => {
                    if (constraint && constraint.field) {
                        ref = ref.where(constraint.field, constraint.op, constraint.value);
                    }
                });
                return ref;
            };

            const where = function(field, op, value) {
                return { field, op, value };
            };

            const getDocs = function(q) {
                return q.get();
            };

            const doc = function(collOrPath, ...pathSegments) {
                if (typeof collOrPath === 'string') {
                    return db.doc(collOrPath);
                } else {
                    return collOrPath.doc(pathSegments[0]);
                }
            };

            const updateDoc = function(docRef, data) {
                return docRef.update(data);
            };

            let increment, arrayUnion;
            if (window.firebase.firestore.FieldValue) {
                increment = function(val) {
                    return window.firebase.firestore.FieldValue.increment(val);
                };

                arrayUnion = function(...elements) {
                    return window.firebase.firestore.FieldValue.arrayUnion(...elements);
                };
            }

            this.firebaseAvailable = true;
            console.log('Firebase is available. Full payment functionality enabled.');
            this.updateUIForFirebaseStatus(true);
        } else {
            throw new Error("Firebase or Firestore not found in window object");
        }
    } catch (error) {
        console.error('Error checking Firebase status:', error);
        this.firebaseAvailable = false;
        this.updateUIForFirebaseStatus(false);
    }
}

    
    // Update UI based on Firebase availability
    static updateUIForFirebaseStatus(isAvailable) {
        if (!isAvailable) {
            // Adjust UI for Firebase unavailability
            const paymentModal = document.getElementById('paymentModal');
            if (!paymentModal) return;
            
            // Update payment button to direct to redemption form
            const paymentButton = paymentModal.querySelector('.payment-btn');
            if (paymentButton) {
                paymentButton.textContent = 'Use Redemption Code';
                
                // Remove existing listeners and add one for redemption
                paymentButton.removeEventListener('click', this.initiatePayment);
                paymentButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showRedemptionForm();
                });
            }
            
            // Add notification about limited functionality
            const paymentHeader = paymentModal.querySelector('h2');
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
                    notification.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Online payment is currently unavailable. Please use a redemption code.';
                    
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
                paymentButton.textContent = 'Proceed to Secure Payment';
                
                // Update event listener
                paymentButton.removeEventListener('click', this.showRedemptionForm);
                paymentButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.initiatePayment();
                });
            }
            
            // Show elements that require Firebase
            const elementsRequiringFirebase = paymentModal.querySelectorAll('.requires-firebase');
            elementsRequiringFirebase.forEach(el => {
                el.style.display = '';
            });
        }
    }
    
    // Open the payment modal
    static openModal() {
        console.log('Opening payment modal');
        
        // First, make sure the modal exists
        let modal = document.getElementById('paymentModal');
        
        // If it doesn't exist, load it
        if (!modal) {
            console.log('Payment modal not found, trying to load it');
            this.loadHTML();
            
            // Wait a bit for the modal to load, then try again
            setTimeout(() => {
                modal = document.getElementById('paymentModal');
                if (modal) {
                    this.finishOpeningModal(modal);
                } else {
                    console.error('Could not load payment modal');
                }
            }, 1000);
            return;
        }
        
        // If modal exists, open it
        this.finishOpeningModal(modal);
    }
    
    // Helper method to finish opening the modal
    static finishOpeningModal(modal) {
        // Reset processing flag
        this.isProcessing = false;
        
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
    }
    
    // Process redemption code - updated for Firebase v9 with improved error handling
static async redeemCode() {
      // Refresh the currentUser reference
    auth.currentUser = window.Auth && window.Auth.user ? window.Auth.user : null;
    
    // Prevent multiple submissions
    if (this.isProcessing) {
        console.log('Redemption already in progress, ignoring duplicate request');
        return;
    }
    
    this.isProcessing = true;
    console.log('Processing redemption code');
    
    const redemptionCode = document.getElementById('redemptionCode');
    if (!redemptionCode) {
        this.isProcessing = false;
        return;
    }
    
    const code = redemptionCode.value.trim();
    const errorElement = document.getElementById('redemptionCodeError');
    
    if (!code) {
        if (errorElement) {
            errorElement.textContent = 'Please enter a redemption code';
        }
        this.isProcessing = false;
        return;
    }
    
    // Clear previous errors
    if (errorElement) {
        errorElement.textContent = '';
    }
    
    // Show loading state
    this.showLoading();
    
    // Check Firebase availability - using fallback to localStorage if needed
    if (!window.firebase || !window.firebase.firestore) {
        console.warn('Firebase is not available - using localStorage fallback');
        
        // Fallback to localStorage-only mode for testing
        setTimeout(() => {
            try {
                // For testing purposes without Firebase
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
                
                this.isProcessing = false;
            } catch (error) {
                console.error('Redemption error:', error);
                this.showError('Error processing redemption code. Please try again later.');
                this.isProcessing = false;
            }
        }, 1500);
        return;
    }
    
    try {
        // Get current user with additional validation
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.error('User not logged in - cannot verify code');
            this.showError('You need to be logged in to verify your code. Please refresh the page and try again.');
            this.isProcessing = false;
            return;
        }
        
        const userId = currentUser.uid;
        
        // Direct access to Firestore - bypass wrapper functions
if (window.firebase && window.firebase.firestore) {
    // Create a reference to Firestore
    const firestore = window.firebase.firestore();
    
    // Run the query using the Firestore reference
    firestore.collection('verificationCodes')
        .where('code', '==', code)
        .where('isActive', '==', true)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                // No matching code found
                this.showRedemptionForm();
                if (errorElement) {
                    errorElement.textContent = 'Invalid or expired redemption code';
                }
                this.isProcessing = false;
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
                    this.isProcessing = false;
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
                    this.isProcessing = false;
                    return;
                }
                
                // Code is valid - process it
                
                // Calculate expiry date based on expiryDays field
                const now = new Date();
                const expiryDate = new Date(now);
                expiryDate.setDate(expiryDate.getDate() + (codeData.expiryDays || 30)); // Default to 30 if not specified
                
                // Update the code usage in Firestore - direct access
                const codeRef = window.firebase.firestore().collection('verificationCodes').doc(codeDoc.id);
                
                // Try to update the code document
                codeRef.update({
                    usedCount: window.firebase.firestore.FieldValue.increment(1),
                    isActive: (codeData.usedCount + 1 < codeData.maxUses)
                })
                .then(() => {
                    // Update user's premium status
                    window.firebase.firestore().collection('users').doc(userId).update({
                        isPaid: true,
                        paymentExpiry: expiryDate.toISOString()
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
                        }, 1000);
                        
                        this.isProcessing = false;
                    })
                    .catch((userUpdateError) => {
                        console.error('Error updating user document:', userUpdateError);
                        
                        // Fallback to localStorage if database update fails
                        localStorage.setItem('isPremium', 'true');
                        localStorage.setItem('premiumExpiry', expiryDate.toISOString());
                        
                        // Show success anyway since the code was valid
                        this.showSuccess();
                        
                        // Dispatch event
                        window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                            detail: { 
                                isPaid: true,
                                expiryDate: expiryDate.toISOString()
                            }
                        }));
                        
                        this.isProcessing = false;
                    });
                })
                .catch((codeUpdateError) => {
                    console.error('Error updating code document:', codeUpdateError);
                    
                    // If code is valid but we can't update it, still give access
                    localStorage.setItem('isPremium', 'true');
                    localStorage.setItem('premiumExpiry', expiryDate.toISOString());
                    
                    // Show success
                    this.showSuccess();
                    
                    // Dispatch event
                    window.dispatchEvent(new CustomEvent('paymentStatusChanged', {
                        detail: { 
                            isPaid: true,
                            expiryDate: expiryDate.toISOString()
                        }
                    }));
                    
                    this.isProcessing = false;
                });
            })
            .catch((error) => {
                console.error('Error querying verification codes:', error);
                this.showError('Error verifying code. Please try again later.');
                this.isProcessing = false;
            });
    } catch (error) {
        console.error('Error processing redemption code:', error);
        this.showError('Error processing your request. Please try again later.');
        this.isProcessing = false;
    }
}
    
    // Initiate payment process with prevention of duplicate submissions
    static async initiatePayment() {
          // Refresh the currentUser reference
    auth.currentUser = window.Auth && window.Auth.user ? window.Auth.user : null;
    
        // Prevent multiple submissions
        if (this.isProcessing) {
            console.log('Payment already in progress, ignoring duplicate request');
            return;
        }
        
        this.isProcessing = true;
        console.log('Initiating payment process');
        
        // Check if Firebase is required but not available
        if (!this.firebaseAvailable) {
            console.log('Firebase not available, redirecting to redemption flow');
            this.showRedemptionForm();
            this.isProcessing = false;
            return;
        }
        
        this.showLoading();
        
        try {
            // Get current user before proceeding
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.error('User not logged in - cannot proceed with payment');
                setTimeout(() => {
                    this.showError('Please login again before making a payment.');
                    this.isProcessing = false;
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
                } finally {
                    this.isProcessing = false;
                }
            }, 1500);
        } catch (error) {
            console.error('Error during payment initiation:', error);
            this.showError('An unexpected error occurred. Please try again later.');
            this.isProcessing = false;
        }
    }
    
    // Show payment form
    static showPaymentForm() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
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
    }
    
    // Show redemption form
    static showRedemptionForm() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the redemption form
        const redemptionForm = document.getElementById('redemptionForm');
        if (redemptionForm) {
            redemptionForm.classList.add('active');
            
            // Focus on the redemption code input
            const redemptionCode = document.getElementById('redemptionCode');
            if (redemptionCode) {
                setTimeout(() => redemptionCode.focus(), 100);
            }
        }
    }
    
    // Show loading state
    static showLoading() {
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
    }
    
    // Show success message
    static showSuccess() {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Hide all forms first
        const allForms = paymentModal.querySelectorAll('.payment-form');
        allForms.forEach(form => form.classList.remove('active'));
        
        // Then show the success form
        const successForm = document.getElementById('paymentSuccess');
        if (successForm) {
            successForm.classList.add('active');
        }
    }
    
    // Show error message
    static showError(message) {
        const paymentModal = document.getElementById('paymentModal');
        if (!paymentModal) return;
        
        // Reset processing flag
        this.isProcessing = false;
        
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
    }
    
    // Update payment summary
    static updateSummary() {
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
    }
    
    // Close the payment modal
    static closeModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.style.display = 'none';
            
            // Reset processing flag
            this.isProcessing = false;
            
            console.log('Payment modal closed');
        }
    }
    
    // Select a pricing plan
    static selectPlan(planType, element) {
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
    }
    
    // Toggle coupon input display
    static toggleCoupon() {
        const couponContainer = document.getElementById('couponContainer');
        const couponToggleText = document.getElementById('couponToggleText');
        
        if (!couponContainer || !couponToggleText) return;
        
        if (couponContainer.style.display === 'none' || couponContainer.style.display === '') {
            couponContainer.style.display = 'block';
            couponToggleText.textContent = 'Hide';
            
            // Focus on the coupon input
            const couponCode = document.getElementById('couponCode');
            if (couponCode) {
                setTimeout(() => couponCode.focus(), 100);
            }
        } else {
            couponContainer.style.display = 'none';
            couponToggleText.textContent = 'Click here';
        }
    }
    
    // Apply coupon code
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
    }
}

// Initialize with retry logic
let initAttempts = 0;
const maxInitAttempts = 5;

function initializeWithRetry() {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        PaymentModal.init();
        console.log('PaymentModal initialized successfully');
    } else if (initAttempts < maxInitAttempts) {
        initAttempts++;
        console.log(`Payment modal not found, retry attempt ${initAttempts}/${maxInitAttempts}`);
        
        // On the last attempt, try to load the payment modal HTML
        if (initAttempts === maxInitAttempts - 1) {
            loadPaymentModalHTML();
        } else {
            setTimeout(initializeWithRetry, 1000);
        }
    } else {
        console.error('Failed to find payment modal after multiple attempts');
    }
}

// Function to load the payment modal HTML
function loadPaymentModalHTML() {
    console.log('Attempting to load payment modal HTML');
    PaymentModal.loadHTML();
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with a delay to allow other scripts to run
    setTimeout(initializeWithRetry, 1500);
});

// Replace the DOMNodeInserted with MutationObserver (more modern approach)
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
                if (node.id === 'paymentModal' || 
                    (node.querySelector && node.querySelector('#paymentModal'))) {
                    console.log('Payment modal added to DOM via observer, initializing');
                    setTimeout(() => PaymentModal.init(), 300);
                    return;
                }
            }
        }
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });

// Make PaymentModal available globally
window.PaymentModal = PaymentModal;
console.log('PaymentModal added to global scope');

// Add a fallback check on window load
window.addEventListener('load', function() {
    setTimeout(function() {
        if (!document.getElementById('paymentModal') && window.PaymentModal) {
            console.log('Payment modal not found after window load, manually loading it');
            PaymentModal.loadHTML();
        }
    }, 3000);
});
