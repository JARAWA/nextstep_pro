import Auth from './auth/index.js';
import Modal from './modal.js';
import userDropdown from './user-dropdown.js';

document.addEventListener('DOMContentLoaded', function() {
    // Load all components
    Promise.all([
        loadComponent('header-container', 'components/header.html'),
        loadComponent('nav-container', 'components/nav.html'),
        loadComponent('footer-container', 'components/footer.html'),
        loadComponent('modal-container', 'components/modal.html')
    ]).then(() => {
        // Ensure Modal and Auth are properly initialized
        console.log('Initializing Modal and Auth');
        
        if (typeof Modal.init === 'function') {
            Modal.init();
        } else {
            console.error('Modal.init is not a function');
        }

        // Initialize the enhanced auth service
        if (typeof Auth.initExtended === 'function') {
            Auth.initExtended() // Use the enhanced version with additional user data collection
                .then(() => {
                    // Initialize user dropdown AFTER components are loaded and auth is initialized
                    // Add a small delay to ensure DOM is fully updated
                    setTimeout(() => {
                        if (document.getElementById('user-info')) {
                            userDropdown.init();
                        } else {
                            console.error('User info container still not found after loading components');
                        }
                    }, 300);
                });
        } else if (typeof Auth.init === 'function') {
            Auth.init() // Fallback to standard initialization
                .then(() => {
                    // Initialize user dropdown AFTER components are loaded and auth is initialized
                    setTimeout(() => {
                        if (document.getElementById('user-info')) {
                            userDropdown.init();
                        } else {
                            console.error('User info container still not found after loading components');
                        }
                    }, 300);
                });
            console.warn('Enhanced auth features not available');
        } else {
            console.error('Auth.init is not a function');
            // Still try to initialize the dropdown after a delay
            setTimeout(() => {
                if (document.getElementById('user-info')) {
                    userDropdown.init();
                } else {
                    console.error('User info container still not found after loading components');
                }
            }, 300);
        }
    }).catch(error => {
        console.error('Error loading components:', error);
    });
});

// Function to load components
async function loadComponent(containerId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const data = await response.text();
        document.getElementById(containerId).innerHTML = data;
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        throw error;
    }
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }, 100);
}

// Expose showToast globally
window.showToast = showToast;
