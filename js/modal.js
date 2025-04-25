export default class Modal {
    static modal = null;
    static passwordStrengthTimeout = null;

    static init() {
        try {
            this.modal = document.getElementById('loginModal');
            
            if (!this.modal) {
                console.error('Login modal not found');
                return;
            }

            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing modal:', error);
        }
    }

    static setupEventListeners() {
        const closeBtn = this.modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        window.onclick = (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        };

        // Password strength checker
        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) {
            signupPassword.addEventListener('input', (e) => {
                clearTimeout(this.passwordStrengthTimeout);
                this.passwordStrengthTimeout = setTimeout(() => {
                    this.checkPasswordStrength(e.target.value);
                }, 300);
            });
        }
    }

    static show() {
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.toggleForms('login');
        }
    }

    static hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.resetForms();
        }
    }

    static toggleForms(form) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');

        [loginForm, signupForm, forgotPasswordForm].forEach(formEl => {
            if (formEl) formEl.classList.remove('active');
        });

        switch(form) {
            case 'signup':
                if (signupForm) signupForm.classList.add('active');
                break;
            case 'forgot':
                if (forgotPasswordForm) forgotPasswordForm.classList.add('active');
                break;
            default:
                if (loginForm) loginForm.classList.add('active');
        }
    }

    static togglePasswordVisibility(inputId, icon) {
        const input = document.getElementById(inputId);
        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }

    static checkPasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };

        // Update requirement indicators
        Object.keys(requirements).forEach(req => {
            const element = document.getElementById(req);
            if (element) {
                const requirementElement = element.closest('.requirement');
                
                if (requirements[req]) {
                    requirementElement.classList.add('met');
                    element.classList.remove('fa-circle');
                    element.classList.add('fa-check-circle');
                } else {
                    requirementElement.classList.remove('met');
                    element.classList.remove('fa-check-circle');
                    element.classList.add('fa-circle');
                }
            }
        });

        // Calculate strength
        const strength = Object.values(requirements).filter(Boolean).length;
        const meterSections = document.querySelectorAll('.meter-section');
        const strengthText = document.querySelector('.strength-text');

        // Reset meter sections
        meterSections.forEach(section => {
            section.className = 'meter-section';
        });

        // Color meter sections based on strength
        meterSections.forEach((section, index) => {
            if (index < strength) {
                if (strength <= 2) section.classList.add('weak');
                else if (strength <= 4) section.classList.add('medium');
                else section.classList.add('strong');
            }
        });

        // Update strength text
        if (strengthText) {
            if (password.length === 0) {
                strengthText.textContent = 'Password Strength';
                strengthText.style.color = '';
            } else if (strength <= 2) {
                strengthText.textContent = 'Weak';
                strengthText.style.color = 'red';
            } else if (strength <= 4) {
                strengthText.textContent = 'Medium';
                strengthText.style.color = 'orange';
            } else {
                strengthText.textContent = 'Strong';
                strengthText.style.color = 'green';
            }
        }
    }

    static showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        } else {
            console.warn(`Error element ${elementId} not found`);
        }
    }

    static hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = ''; // Clear error text
        } else {
            console.warn(`Error element ${elementId} not found`);
        }
    }

    static resetForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => form.reset());

        // Reset password strength meter
        const meterSections = document.querySelectorAll('.meter-section');
        meterSections.forEach(section => {
            section.className = 'meter-section';
        });

        // Reset requirements
        const requirements = document.querySelectorAll('.requirement');
        requirements.forEach(req => {
            req.classList.remove('met');
            const icon = req.querySelector('i');
            icon.classList.remove('fa-check-circle');
            icon.classList.add('fa-circle');
        });

        // Hide all error messages
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.classList.remove('show'));
    }

    static showForgotPassword() {
        this.toggleForms('forgot');
    }
}

// Expose to global scope
window.Modal = Modal;
