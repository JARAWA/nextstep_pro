import Auth from './auth/index.js';
import Modal from './modal.js';
import UserService from './user-dropdown.js'; // This imports the UserService class

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
                            initializeUserDropdown();
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
                            initializeUserDropdown();
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
                    initializeUserDropdown();
                } else {
                    console.error('User info container still not found after loading components');
                }
            }, 300);
        }
    }).catch(error => {
        console.error('Error loading components:', error);
    });
});

// Function to initialize user dropdown using UserService
function initializeUserDropdown() {
    // Get current user from Auth
    const currentUser = Auth.user; // Using Auth.user getter property
    
    if (currentUser) {
        // Use UserService to get user data
        UserService.getUserData(currentUser)
            .then(userData => {
                if (userData) {
                    updateUserInfoUI(userData);
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
    }
}

// Function to update the UI with user data
function updateUserInfoUI(userData) {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) return;
    
    // Check if dropdown already exists
    if (userInfoElement.querySelector('.user-dropdown')) {
        console.log('User dropdown already initialized');
        return;
    }
    
    // Create user dropdown UI similar to what AuthService.updateUI() does
    userInfoElement.innerHTML = `
        <div class="user-dropdown">
            <button class="user-dropdown-toggle">
                <i class="fas fa-user-circle"></i>
                <span class="username">${userData.displayName || userData.name || userData.email}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown-menu">
                <a href="${userData.userRole === 'admin' ? '/admin/dashboard.html' : '/admin/users.html'}" class="dashboard-link">
                    <i class="fas ${userData.userRole === 'admin' ? 'fa-tachometer-alt' : 'fa-user'}"></i> 
                    ${userData.userRole === 'admin' ? 'Admin Dashboard' : 'My Profile'}
                </a>
                <a href="#" class="logout-link" onclick="Auth.logout(); return false;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </div>
    `;
    
    // Add event listener to toggle dropdown
    const toggleButton = userInfoElement.querySelector('.user-dropdown-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            const dropdownMenu = userInfoElement.querySelector('.user-dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('active');
            }
        });
    }
    
    // Close the dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!userInfoElement.contains(event.target)) {
            const dropdownMenu = userInfoElement.querySelector('.user-dropdown-menu');
            if (dropdownMenu && dropdownMenu.classList.contains('active')) {
                dropdownMenu.classList.remove('active');
            }
        }
    });
}

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
