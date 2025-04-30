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
        let authInitPromise;
        
        if (typeof Auth.initExtended === 'function') {
            authInitPromise = Auth.initExtended(); // Use the enhanced version with additional user data collection
        } else if (typeof Auth.init === 'function') {
            authInitPromise = Auth.init(); // Fallback to standard initialization
            console.warn('Enhanced auth features not available');
        } else {
            console.error('Auth.init is not a function');
            authInitPromise = Promise.resolve(); // Empty promise to allow chain to continue
        }
        
        // Continue initialization flow after auth init attempt
        authInitPromise.then(() => {
            // Add a small delay to ensure DOM is fully updated
            setTimeout(() => {
                if (document.getElementById('user-info')) {
                    // We don't need to initialize dropdown here - Auth will handle it
                    console.log('Auth initialized successfully');
                    
                    // Add payment status indicator next to user-info
                    const userInfo = document.getElementById('user-info');
                    if (!document.getElementById('payment-status-indicator')) {
                        const paymentIndicator = document.createElement('div');
                        paymentIndicator.id = 'payment-status-indicator';
                        userInfo.parentNode.insertBefore(paymentIndicator, userInfo.nextSibling);
                    }
                } else {
                    console.error('User info container still not found after loading components');
                }
            }, 300);
        }).catch(error => {
            console.error('Error initializing auth:', error);
        });
        
        // Add premium CSS styles
        addPremiumStyles();
        
        // Initialize PaymentAuth after Auth is loaded
        window.addEventListener('authLoaded', function() {
            // Load the Payment Auth script
            if (window.PaymentAuth) {
                console.log('Payment Auth script already loaded');
                window.PaymentAuth.init();
            } else {
                console.log('Loading Payment Auth script');
                loadScript('js/payment-auth.js')
                    .then(() => {
                        console.log('Payment Auth script loaded');
                    })
                    .catch(error => {
                        console.error('Error loading PaymentAuth:', error);
                    });
            }
        });
        
        // Dispatch auth loaded event once Auth is ready
        setTimeout(() => {
            window.dispatchEvent(new Event('authLoaded'));
        }, 1000);
        
    }).catch(error => {
        console.error('Error loading components:', error);
    });
});

// Function to load a script dynamically
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Function to add premium CSS styles
function addPremiumStyles() {
    if (document.getElementById('premium-styles')) return;
    
    const styleEl = document.createElement('style');
    styleEl.id = 'premium-styles';
    
    styleEl.innerHTML = `
        /* Premium feature styling */
        .premium-disabled {
            position: relative;
            overflow: hidden;
        }

        .premium-disabled::after {
            content: "Premium Feature";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            z-index: 10;
        }

        .premium-badge {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #333;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .premium-badge i {
            margin-right: 4px;
        }
        
        .upgrade-link {
            display: inline-flex;
            align-items: center;
            color: #FFD700;
            padding: 8px 16px;
            font-weight: bold;
            text-decoration: none;
        }
        
        .upgrade-link:hover {
            background-color: rgba(255, 215, 0, 0.1);
        }
        
        .upgrade-link i {
            margin-right: 6px;
        }
    `;
    
    document.head.appendChild(styleEl);
}

// Function to initialize user dropdown using UserService - used for manual refresh
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

// Function to update the UI with user data - used for manual refresh
function updateUserInfoUI(userData) {
    const userInfoElement = document.getElementById('user-info');
    if (!userInfoElement) return;
    
    // Create user dropdown UI
    userInfoElement.innerHTML = `
        <div class="user-dropdown">
            <button class="user-dropdown-toggle">
                <i class="fas fa-user-circle"></i>
                <span class="username">${userData.displayName || userData.name || userData.email}</span>
                <i class="fas fa-chevron-down"></i>
            </button>
            <div class="user-dropdown-menu">
                ${getRoleSpecificMenuItems(userData.userRole)}
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

// Get role-specific menu items - mirrors Auth service functionality
function getRoleSpecificMenuItems(userRole) {
    switch (userRole) {
        case 'admin':
            return `
                <a href="/admin/dashboard.html" class="dashboard-link">
                    <i class="fas fa-tachometer-alt"></i> Admin Dashboard
                </a>
                <a href="/admin/users.html" class="users-link">
                    <i class="fas fa-users"></i> Manage Users
                </a>`;
        case 'teacher':
            return `
                <a href="/teacher/dashboard.html" class="dashboard-link">
                    <i class="fas fa-chalkboard-teacher"></i> Teacher Dashboard
                </a>
                <a href="/teacher/classes.html" class="classes-link">
                    <i class="fas fa-book"></i> My Classes
                </a>`;
        default: // student or any other role
            return `
                <a href="/profile.html" class="profile-link">
                    <i class="fas fa-user"></i> My Profile
                </a>
                <a href="/courses.html" class="courses-link">
                    <i class="fas fa-graduation-cap"></i> My Courses
                </a>`;
    }
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

// Manual refresh function that can be called when needed
function refreshUserUI() {
    if (Auth.user) {
        initializeUserDropdown();
    }
}

// Expose functions globally
window.showToast = showToast;
window.refreshUserUI = refreshUserUI;
