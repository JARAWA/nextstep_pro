// payment-modal.js - Updated for Firebase v9 compatibility

// Get Firebase functions from global scope
const auth = window.firebaseAuth || firebase.auth();

// Access Firestore if available via the global firebase object
let db, collection, query, where, getDocs, doc, updateDoc, increment, arrayUnion;

try {
    // Try to get Firestore from global firebase object
    db = firebase.firestore();
    
    // Get Firestore functions
    collection = firebase.firestore.collection;
    query = firebase.firestore.query;
    where = firebase.firestore.where;
    getDocs = firebase.firestore.getDocs;
    doc = firebase.firestore.doc;
    updateDoc = firebase.firestore.updateDoc;
    increment = firebase.firestore.increment;
    arrayUnion = firebase.firestore.arrayUnion;
} catch (error) {
    console.warn('Firestore not available in global scope:', error);
    // Initialize empty functions that will be checked before use
    collection = query = where = getDocs = doc = updateDoc = increment = arrayUnion = function() {
        console.warn('Firestore function called but Firestore is not available');
        return null;
    };
}

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
        const redemptionLink = paymentModal.querySelector('.redemption-link');
        if (redemptionLink) {
            redemptionLink.removeAttribute('onclick');
            redemptionLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showRedemptionForm();
            });
        }
        
        // Setup back to payment link
        const backToPaymentLink = paymentModal.querySelector('.back-to-payment');
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
    
    // Check Firebase availability and adjust UI accordingly
    static checkFirebaseStatus() {
        try {
            if (!db || !auth) {
                console.warn('Firebase not detected. Payment functionality will be limited.');
                this.firebaseAvailable = false;
                this.updateUIForFirebaseStatus(false);
            } else {
                // Additional check to make sure Firebase is properly initialized
                if (typeof auth.onAuthStateChanged !== 'function') {
                    console.warn('Firebase auth not properly initialized');
                    this.firebaseAvailable = false;
                    this.updateUIForFirebaseStatus(false);
                    return;
                }
                
                this.firebaseAvailable = true;
                console.log('Firebase is available. Full payment functionality enabled.');
                this.updateUIForFirebaseStatus(true);
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
        const modal = document.getElementById('paymentModal');
        if (modal) {
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
        } else {
            console.error('Payment modal not found in the DOM');
        }
    }
    
    // Process redemption code - updated for Firebase v9 with improved error handling
    static async redeemCode() {
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
        
        // Check Firebase availability
        if (!this.firebaseAvailable) {
            console.warn('Firebase is not available - using localStorage fallback');
            
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
            
            // Query for verification code using Firebase v9 syntax
            const codesRef = collection(db, 'verificationCodes');
            const codeQuery = query(codesRef, 
                where('code', '==', code),
                where('isActive', '==', true)
            );
            
            try {
                const querySnapshot = await getDocs(codeQuery);
                
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
                
                // Update the code usage in Firestore using Firebase v9 syntax
                try {
                    // Get a reference to the code document
                    const codeRef = doc(db, 'verificationCodes', codeDoc.id);
                    
                    // Prepare the update data
                    const updateData = {
                        usedCount: increment(1),
                        isActive: (codeData.usedCount + 1 < codeData.maxUses)
                    };
                    
                    // Update usedBy based on whether it's a string or array
                    if (typeof codeData.usedBy === 'string') {
                        // If stored as JSON string, parse, update and stringify again
                        try {
                            let usedByArray = JSON.parse(codeData.usedBy);
                            usedByArray.push(userId);
                            updateData.usedBy = JSON.stringify(usedByArray);
                        } catch (e) {
                            // If parsing fails, create new array with just this user
                            updateData.usedBy = JSON.stringify([userId]);
                        }
                    } else {
                        // For array type, use arrayUnion
                        updateData.usedBy = arrayUnion(userId);
                    }
                    
                    // Perform the update
                    await updateDoc(codeRef, updateData);
                    
                    // Now update user's premium status
                    try {
                        const userRef = doc(db, 'users', userId);
                        await updateDoc(userRef, {
                            isPaid: true,
                            paymentExpiry: expiryDate.toISOString(),
                            paymentHistory: arrayUnion({
                                type: 'redemption',
                                code: code,
                                timestamp: now.toISOString(),
                                expiryDate: expiryDate.toISOString()
                            })
                        });
                        
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
                    } catch (userUpdateError) {
                        console.error('Error updating user document:', userUpdateError);
                        
                        // Handle insufficient permissions for user document
                        if (userUpdateError.code === 'permission-denied') {
                            // Use local storage fallback if user document can't be updated
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
                        } else {
                            this.showError('Error updating your account. Please contact support.');
                        }
                    }
                } catch (codeUpdateError) {
                    console.error('Error updating code document:', codeUpdateError);
                    
                    // If we can't update the code but it's valid, still give access via localStorage
                    if (codeUpdateError.code === 'permission-denied') {
                        // Calculate expiry date
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + 30);
                        
                        // Use local storage fallback
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
                    } else {
                        this.showError('Error processing your code. Please try again later.');
                    }
                }
            } catch (queryError) {
                console.error('Error querying verification codes:', queryError);
                
                // Handle insufficient permissions error specifically
                if (queryError.code === 'permission-denied') {
                    console.log('Permission denied for verification codes. Using fallback mode.');
                    
                    // Fallback to test codes in case of permission issues
                    if (code.toUpperCase().startsWith('TEST') || 
                        code.toUpperCase() === 'STUDENT50' || 
                        code.toUpperCase() === 'WELCOME10' ||
                        code.toUpperCase() === 'NEXTSTEP') {
                        
                        // Calculate expiry date
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + 30);
                        
                        // Use local storage
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
                    } else {
                        this.showRedemptionForm();
                        if (errorElement) {
                            errorElement.textContent = 'Invalid or expired redemption code';
                        }
                    }
                } else {
                    this.showError('Error verifying code. Please try again later.');
                }
            }
        } catch (error) {
            console.error('Error processing redemption code:', error);
            this.showError('Error processing your request. Please try again later.');
        } finally {
            this.isProcessing = false;
        }
    }
    
    // Initiate payment process with prevention of duplicate submissions
    static async initiatePayment() {
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

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize directly with a small delay to ensure DOM is ready
    setTimeout(() => {
        if (document.getElementById('paymentModal')) {
            PaymentModal.init();
            console.log('PaymentModal initialized from DOMContentLoaded event');
        }
    }, 1000);
});

// Handle page re-renders for SPA (Single Page Applications)
// This ensures the modal is initialized even if the DOM changes after initial load
document.addEventListener('DOMNodeInserted', function(e) {
    // Check if the inserted node might contain our modal
    if (e.target && e.target.id === 'paymentModal' || 
        (e.target.querySelector && e.target.querySelector('#paymentModal'))) {
        // Reinitialize with a small delay
        setTimeout(() => {
            if (document.getElementById('paymentModal')) {
                PaymentModal.init();
                console.log('PaymentModal reinitialized after DOM change');
            }
        }, 500);
    }
});

// Make PaymentModal available globally
window.PaymentModal = PaymentModal;
console.log('PaymentModal added to global scope');
