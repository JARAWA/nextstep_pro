/**
 * User Dropdown Module
 * Creates and manages a dropdown menu in the user-info container
 * that shows username and role-based navigation options
 */
import { AuthService, UserService } from './auth/index.js';

// Main class for user dropdown functionality
class UserDropdown {
    constructor() {
        this.container = document.getElementById('user-info');
        this.currentUser = null;
        this.userRole = 'student'; // Default role
        this.isOpen = false;
    }

    /**
     * Initialize the dropdown functionality
     */
    init() {
        this.container = document.getElementById('user-info'); // Re-get the container in case DOM has updated
        
        if (!this.container) {
            console.error('User info container not found');
            return;
        }

        console.log('User dropdown initialized successfully');
        
        // Listen for authentication state changes
        this.setupAuthListener();
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (this.container && !this.container.contains(event.target) && this.isOpen) {
                this.closeDropdown();
            }
        });
    }

    /**
     * Set up listener for authentication state changes
     */
    setupAuthListener() {
        // Use AuthService if available
        if (window.Auth && window.Auth.AuthService) {
            // Check if already logged in
            if (window.Auth.isLoggedIn) {
                const user = window.Auth.user;
                this.handleUserLogin(user);
            }
            
            // Listen for auth state changes
            window.firebaseAuth.onAuthStateChanged((user) => {
                if (user) {
                    this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });
        } else if (window.firebaseAuth) {
            // Fallback to direct Firebase auth
            window.firebaseAuth.onAuthStateChanged((user) => {
                if (user) {
                    this.handleUserLogin(user);
                } else {
                    this.handleUserLogout();
                }
            });
        } else {
            console.error('Authentication service not available');
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
            // Try to use the UserService if available
            if (window.Auth && window.Auth.UserService) {
                const userData = await window.Auth.UserService.getUserData(this.currentUser);
                this.userRole = userData?.role || 'student';
            } else {
                // Fallback to direct Firestore access
                const db = firebase.firestore();
                const userDoc = await db.collection('users').doc(userId).get();
                
                if (userDoc.exists) {
                    this.userRole = userDoc.data()?.role || 'student';
                } else {
                    this.userRole = 'student';
                }
            }
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
        
        // Create dropdown HTML
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
        
        // Set innerHTML
        this.container.innerHTML = dropdownHTML;
        
        // Add event listeners
        this.addEventListeners();
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
            } else if (window.firebaseAuth) {
                // Fallback to direct Firebase auth
                await window.firebaseAuth.signOut();
            }
            
            // Optionally redirect to home page or show success message
            window.location.href = '/';
        } catch (error) {
            console.error('Error during logout:', error);
            if (window.showToast) {
                window.showToast('Failed to log out. Please try again.', 'error');
            }
        }
    }
}

// Create and export singleton instance
const userDropdown = new UserDropdown();
export default userDropdown;

// Remove self-initialization - will be handled by main.js
