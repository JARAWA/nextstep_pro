/**
 * Validation utilities for forms and input fields
 */

// Email validation
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
        isValid: emailRegex.test(email.trim()),
        error: 'Please enter a valid email address'
    };
}

// Password validation
function validatePassword(password) {
    const validations = [
        {
            test: (pw) => pw.length >= 8,
            message: 'Password must be at least 8 characters long'
        },
        {
            test: (pw) => /[A-Z]/.test(pw),
            message: 'Must contain at least one uppercase letter'
        },
        {
            test: (pw) => /[a-z]/.test(pw),
            message: 'Must contain at least one lowercase letter'
        },
        {
            test: (pw) => /[0-9]/.test(pw),
            message: 'Must contain at least one number'
        },
        {
            test: (pw) => /[!@#$%^&*]/.test(pw),
            message: 'Must contain at least one special character'
        }
    ];

    const failedValidation = validations.find(v => !v.test(password));
    return {
        isValid: !failedValidation,
        error: failedValidation ? failedValidation.message : ''
    };
}

// Name validation
function validateName(name) {
    return {
        isValid: name.trim().length >= 2,
        error: 'Name must be at least 2 characters long'
    };
}

// Mobile number validation (Indian format)
function validateMobileNumber(number) {
    // Indian mobile number validation - 10 digits
    const mobileRegex = /^[6-9]\d{9}$/;
    return {
        isValid: mobileRegex.test(number.trim()),
        error: 'Please enter a valid 10-digit mobile number'
    };
}

// General form validation function
function validateForm(inputs) {
    for (const input of inputs) {
        const validationFunction = input.validator;
        const { isValid, error } = validationFunction(input.value);
        
        if (!isValid) {
            // If an error display function is provided, use it
            if (input.displayError && typeof input.displayError === 'function') {
                input.displayError(input.errorField, error);
            } else if (window.showToast) {
                window.showToast(error, 'error');
            } else {
                console.error(error);
            }
            
            // Focus the input element if available
            if (input.element && typeof input.element.focus === 'function') {
                input.element.focus();
            }
            
            return false;
        }
    }
    
    return true;
}

// Form input validator object (for backward compatibility)
const Validator = {
    email: validateEmail,
    password: validatePassword,
    name: validateName,
    mobileNumber: validateMobileNumber
};

export {
    validateEmail,
    validatePassword,
    validateName,
    validateMobileNumber,
    validateForm,
    Validator
};