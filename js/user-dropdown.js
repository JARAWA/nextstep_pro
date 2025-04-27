/**
 * User Dropdown Module
 * Creates and manages a dropdown menu in the user-info container
 * that shows username and role-based navigation options
 */
import { AuthService, UserService } from './auth/index.js';

// Main class for user dropdown functionality
class UserDropdown {
    constructor() {
        this.container = null;
        this.currentUser = null;
        this.userRole = 'student'; // Default role
        this.isOpen = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 3;
        this.initialized = false;
    }

    /**
     * Initialize the dropdown functionality
     */
    init() {
        // Use a more reliable approach to get container
        this.container = document.getElementById('user-info');
        
        if (!this.container) {
            console.error('User info container not found, will retry');
            
            // Try again after a delay to ensure DOM is fully loaded
            if (this.initAttempts < this.maxInitAttempts) {
                this.initAttempts++;
                setTimeout(() => {
                    console.log(`Retry attempt ${this.initAttempts} to initialize user dropdown`);
                    this.init();
                }, 1000);
            } else {
                console.error(`Failed to initialize user dropdown after ${this.maxInitAttempts} attempts`);
            }
            return;
        }

        if (this.initialized) {
            console.log('User dropdown already initialized, skipping');
            return;
        }

        this.initialized = true;
        console.log('User dropdown initialized successfully');
        
        // Listen for authentication state changes
        this.setupAuthListener();
        this.setupDomListeners();
        
        // Check current auth state immediately
        this.checkCurrentAuthState();
    }

    /**
     * Set up DOM event listeners
     */
    setupDomListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (this.container && !this.container.contains(event.target) && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    /**
     * Check the current authentication state
     */
    checkCurrentAuthState() {
        // Directly use Auth module if available
        if (window.Auth) {
            if (window.Auth.isLoggedIn && window.Auth.user) {
                console.log('User is already logged in, initializing dropdown');
                this.handleUserLogin(window.Auth.user);
            } else {
                console.log('User is not logged in');
                this.handleUserLogout();
            }
        }
    }

    /**
     * Set up listener for authentication state changes
     */
    setupAuthListener() {
        // Use AuthService if available through direct import
        if (typeof AuthService !== 'undefined' && AuthService) {
            console.log('Using imported AuthService for auth state changes');
            
            // Check if we can directly access the current user
            if (AuthService.isLoggedIn && AuthService.user) {
                this.handleUserLogin(AuthService.user);
            }
        }
        
        // Use global Auth object as fallback
        else if (window.Auth) {
            console.log('Using global Auth object for auth state changes');
            
            // Set up a custom listener that checks Auth.user regularly
            this.authCheckInterval = setInterval(() => {
                if (window.Auth.isLoggedIn && window.Auth.user) {
                    if (!this.currentUser || this.currentUser.uid !== window.Auth.user.uid) {
                        console.log('User state changed, updating dropdown');
                        this.handleUserLogin(window.Auth.user);
                    }
                } else if (this.currentUser) {
                    console.log('User logged out, updating dropdown');
                    this.handleUserLogout();
                }
            }, 2000); // Check every 2 seconds
        }
        
        // Try to use Firebase auth directly as last resort
        else if (window.firebase && window.firebase.auth) {
            console.log('Using Firebase auth directly for auth state changes');
            window.firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });
        } else {
            console.warn('No auth service available for dropdown, will use manual checks');
            
            // Set up a manual check that runs every few seconds to look for auth changes
            this.authCheckInterval = setInterval(() => {
                const userInfo = document.querySelector('.user-info');
                const hasUserInfo = userInfo && userInfo.innerHTML.includes('user-dropdown');
                
                if (window.Auth && window.Auth.isLoggedIn && window.Auth.user) {
                    if (!this.currentUser) {
                        this.handleUserLogin(window.Auth.user);
                    }
                } else if (this.currentUser && !window.Auth?.isLoggedIn) {
                    this.handleUserLogout();
                }
            }, 2000);
        }
    }

    /**
     * Handle user login event
     * @param {Object} user - Firebase user object
     */
    async handleUserLogin(user) {
        if (!user) return;
        
        this.currentUser = user;
        
        // Get user role from Firestore
        try {
            await this.getUserRole(user.uid);
            this.renderDropdown();
        } catch (error) {
            console.error('Error getting user role:', error);
            // Fallback to default role
            this.userRole = 'student';
            this.renderDropdown();
        }
    }

    /**
     * Handle user logout event
     */
    handleUserLogout() {
        this.currentUser = null;
        this.userRole = 'student';
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * Get user role from database
     * @param {string} userId - User ID
     */
    async getUserRole(userId) {
        try {
            // Try to use UserService directly if imported
            if (typeof UserService !== 'undefined' && UserService) {
                const userData = await UserService.getUserData(this.currentUser);
                if (userData) {
                    this.userRole = userData.userRole || 'student';
                    return;
                }
            }
            
            // Try to use the global Auth.getUserData
            if (window.Auth && typeof window.Auth.getUserData === 'function') {
                const userData = await window.Auth.getUserData();
                if (userData) {
                    this.userRole = userData.userRole || 'student';
                    return;
                }
            }
            
            // Try using Auth.UserService directly
            if (window.Auth && window.Auth.UserService && typeof window.Auth.UserService.getUserData === 'function') {
                const userData = await window.Auth.UserService.getUserData(this.currentUser);
                if (userData) {
                    this.userRole = userData.userRole || 'student';
                    return;
                }
            }
            
            // If no user data found or the above methods failed, default to student role
            console.warn('Could not retrieve user role, defaulting to student');
            this.userRole = 'student';
        } catch (error) {
            console.error('Error fetching user role:', error);
            this.userRole = 'student';
        }
    }

    /**
     * Render the dropdown UI
     */
    renderDropdown() {
        if (!this.container || !this.currentUser) return;
        
        const displayName = this.currentUser.displayName || this.currentUser.email || 'User';
        
        // Create dropdown HTML with improved styling hooks
        const dropdownHTML = `
            <div class="user-dropdown">
                <button class="user-dropdown-toggle">
                    <i class="fas fa-user-circle"></i>
                    <span class="username">${displayName}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown-menu">
                    <a href="${this.userRole === 'admin' ? '/admin/dashboard.html' : '/admin/users.html'}" class="dashboard-link">
                        <i class="fas ${this.userRole === 'admin' ? 'fa-tachometer-alt' : 'fa-user'}"></i> 
                        ${this.userRole === 'admin' ? 'Admin Dashboard' : 'My Profile'}
                    </a>
                    <a href="#" class="logout-link">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        `;
        
        // Check if dropdown already exists to avoid unnecessary DOM updates
        if (this.container.querySelector('.user-dropdown')) {
            const nameElement = this.container.querySelector('.username');
            if (nameElement && nameElement.textContent !== displayName) {
                nameElement.textContent = displayName;
            }
        } else {
            // Set innerHTML
            this.container.innerHTML = dropdownHTML;
            
            // Add event listeners
            this.addEventListeners();
            
            // Add default styles if not already present
            this.addDropdownStyles();
        }
    }

    /**
     * Add event listeners to dropdown elements
     */
    addEventListeners() {
        const toggleButton = this.container.querySelector('.user-dropdown-toggle');
        const logoutLink = this.container.querySelector('.logout-link');
        
        if (toggleButton) {
            toggleButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.toggleDropdown();
            });
        }
        
        if (logoutLink) {
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault();
                this.handleLogout();
            });
        }
    }

    /**
     * Add default dropdown styles if not present in CSS
     */
    addDropdownStyles() {
        // Check if styles are already added
        if (document.getElementById('user-dropdown-styles')) {
            return;
        }
        
        const styleEl = document.createElement('style');
        styleEl.id = 'user-dropdown-styles';
        styleEl.textContent = `
            .user-dropdown {
                position: relative;
                display: inline-block;
            }
            
            .user-dropdown-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background-color: transparent;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                color: var(--text-color, #333);
            }
            
            .user-dropdown-toggle:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .user-dropdown-menu {
                position: absolute;
                right: 0;
                top: 100%;
                margin-top: 4px;
                min-width: 200px;
                background-color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                z-index: 1000;
                display: none;
            }
            
            .user-dropdown-menu.active {
                display: block;
                animation: dropdownFade 0.2s ease-out;
            }
            
            .user-dropdown-menu a {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 15px;
                color: var(--text-color, #333);
                text-decoration: none;
                transition: background-color 0.2s;
            }
            
            .user-dropdown-menu a:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
            
            .logout-link {
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            @keyframes dropdownFade {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        
        document.head.appendChild(styleEl);
    }

    /**
     * Toggle dropdown open/closed state
     */
    toggleDropdown() {
        const dropdownMenu = this.container.querySelector('.user-dropdown-menu');
        if (dropdownMenu) {
            this.isOpen = !this.isOpen;
            dropdownMenu.classList.toggle('active', this.isOpen);
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown() {
        const dropdownMenu = this.container.querySelector('.user-dropdown-menu');
        if (dropdownMenu) {
            this.isOpen = false;
            dropdownMenu.classList.remove('active');
        }
    }

    /**
     * Handle logout action
     */
    async handleLogout() {
        try {
            // Try to use Auth module first
            if (window.Auth && typeof window.Auth.logout === 'function') {
                await window.Auth.logout();
            } else if (typeof AuthService !== 'undefined' && AuthService && typeof AuthService.logout === 'function') {
                await AuthService.logout();
            } else if (window.firebase && window.firebase.auth) {
                // Fallback to direct Firebase auth
                await window.firebase.auth().signOut();
            }
            
            // Show success message
            if (window.showToast) {
                window.showToast('Logged out successfully', 'success');
            }
            
            // Optionally redirect to home page
            window.location.href = '/';
        } catch (error) {
            console.error('Error during logout:', error);
            if (window.showToast) {
                window.showToast('Failed to log out. Please try again.', 'error');
            }
        }
    }
    
    /**
     * Clean up resources when the module is no longer needed
     */
    cleanup() {
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
        }
    }
}

// Create and export singleton instance
const userDropdown = new UserDropdown();
export default userDropdown;

// Auto-initialize on page load for convenience
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => userDropdown.init(), 500); // Slight delay to ensure DOM is ready
});

// Expose to global scope for debugging and manual initialization
window.userDropdown = userDropdown;
