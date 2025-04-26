// Import Firebase modules
import { 
    getAuth, 
    signOut, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateEmail,
    updateProfile,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query, 
    where, 
    orderBy, 
    limit,
    startAfter,
    endBefore,
    limitToLast
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Admin User Management Controller
class AdminUserManagement {
    // Class properties
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        this.currentAdminData = null;
        
        // User data state
        this.users = [];
        this.filteredUsers = [];
        this.totalUsers = 0;
        this.currentPage = 1;
        this.pageSize = 10;
        this.lastVisible = null;
        this.firstVisible = null;
        this.selectedUserIds = new Set();
        
        // Filter state
        this.filters = {
            role: 'all',
            exam: 'all',
            status: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
        
        // Sort state
        this.sortField = 'createdAt';
        this.sortDirection = 'desc';
        
        // Initialize
        this.setupEventListeners();
        this.initializeAdminUserManagement();
    }

    // Set up event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Search input
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.searchTerm = e.target.value.trim().toLowerCase();
                this.debounceSearch();
            });
        }
        
        // Filter controls
        document.getElementById('apply-filters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
        
        // Role filter
        document.getElementById('role-filter')?.addEventListener('change', (e) => {
            this.filters.role = e.target.value;
        });
        
        // Exam filter
        document.getElementById('exam-filter')?.addEventListener('change', (e) => {
            this.filters.exam = e.target.value;
        });
        
        // Status filter
        document.getElementById('status-filter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });
        
        // Date filters
        document.getElementById('date-from')?.addEventListener('change', (e) => {
            this.filters.dateFrom = e.target.value ? new Date(e.target.value) : null;
        });
        
        document.getElementById('date-to')?.addEventListener('change', (e) => {
            this.filters.dateTo = e.target.value ? new Date(e.target.value) : null;
        });
        
        // Pagination controls
        document.getElementById('prev-page')?.addEventListener('click', () => this.previousPage());
        document.getElementById('next-page')?.addEventListener('click', () => this.nextPage());
        
        // Page size change
        document.getElementById('page-size')?.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadUsers();
        });
        
        // Table header sorting
        const sortableHeaders = document.querySelectorAll('th i.fa-sort');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const headerCell = e.target.closest('th');
                const fieldName = this.getFieldNameFromHeader(headerCell.textContent.trim());
                this.updateSort(fieldName);
            });
        });
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-users');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        }
        
        // Bulk action buttons
        document.getElementById('bulk-verify')?.addEventListener('click', () => this.bulkVerifyEmails());
        document.getElementById('bulk-deactivate')?.addEventListener('click', () => this.bulkDeactivateUsers());
        document.getElementById('bulk-activate')?.addEventListener('click', () => this.bulkActivateUsers());
        document.getElementById('bulk-delete')?.addEventListener('click', () => this.confirmBulkDelete());
        
        // Add new user button
        document.getElementById('add-user-btn')?.addEventListener('click', () => this.showAddUserModal());
        
        // Export users button
        document.getElementById('export-users-btn')?.addEventListener('click', () => this.exportUsers());
        
        // Edit user form submission
        document.getElementById('edit-user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUserChanges();
        });
        
        // Add user form submission
        document.getElementById('add-user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewUser();
        });
        
        // Modal close buttons
        document.querySelectorAll('.admin-modal-close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        
        // Confirmation modal confirm button
        document.querySelector('#confirmationModal .confirm-btn')?.addEventListener('click', () => {
            // The action to perform will be set when showing the confirmation modal
            if (typeof this.confirmationAction === 'function') {
                this.confirmationAction();
            }
            this.closeModal('confirmationModal');
        });
        
        // Setup exam checkbox events for edit form
        document.querySelectorAll('.edit-exam-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const examKey = e.target.id.replace('edit-', '').replace('-', '');
                const rankField = document.querySelector(`[data-exam="${examKey}"]`);
                if (rankField) {
                    rankField.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        });
    }

    // Initialize user management
    async initializeAdminUserManagement() {
        try {
            // Check authentication state
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    
                    // Verify admin status
                    const isAdmin = await this.verifyAdminStatus(user.uid);
                    
                    if (!isAdmin) {
                        alert('You do not have admin permissions');
                        await this.handleLogout();
                        return;
                    }
                    
                    // Get admin data
                    await this.loadAdminData();
                    
                    // Update admin name in header
                    const adminNameElement = document.querySelector('.admin-name');
                    if (adminNameElement) {
                        adminNameElement.textContent = this.currentAdminData?.name || user.displayName || user.email;
                    }
                    
                    // Check URL for action parameters
                    this.checkUrlParams();
                    
                    // Load users
                    await this.loadUsers();
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = '../index.html';
                }
            });
        } catch (error) {
            console.error('User management initialization error:', error);
            this.showToast('Error initializing user management', 'error');
        }
    }

    // Check URL parameters for actions
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const userId = urlParams.get('id');
        
        if (action === 'edit' && userId) {
            // Show edit modal for specific user
            this.editUser(userId);
        }
    }

    // Verify if user has admin role
    async verifyAdminStatus(uid) {
        try {
            const userDoc = await getDoc(doc(this.db, "users", uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return userData.userRole === 'admin';
            }
            
            return false;
        } catch (error) {
            console.error('Admin verification error:', error);
            return false;
        }
    }

    // Load admin data
    async loadAdminData() {
        try {
            if (!this.currentUser) return;
            
            const adminDoc = await getDoc(doc(this.db, "users", this.currentUser.uid));
            
            if (adminDoc.exists()) {
                this.currentAdminData = adminDoc.data();
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        }
    }

    // Load users with pagination
    async loadUsers(direction = 'next') {
        try {
            const tableBody = document.querySelector('#users-table tbody');
            
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading users...</td></tr>';
            }
            
            // Create base query
            let userQuery = query(
                collection(this.db, "users"),
                orderBy(this.sortField, this.sortDirection)
            );
            
            // Apply pagination
            if (direction === 'next' && this.lastVisible) {
                userQuery = query(userQuery, startAfter(this.lastVisible), limit(this.pageSize));
            } else if (direction === 'prev' && this.firstVisible) {
                userQuery = query(userQuery, endBefore(this.firstVisible), limitToLast(this.pageSize));
            } else {
                // First page or reset
                userQuery = query(userQuery, limit(this.pageSize));
            }
            
            // Execute query
            const querySnapshot = await getDocs(userQuery);
            
            // Store pagination cursors
            if (!querySnapshot.empty) {
                this.firstVisible = querySnapshot.docs[0];
                this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            }
            
            // Extract user data
            this.users = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Filter users based on current filters
            this.applyFiltersToUsers();
            
            // Render users table
            this.renderUsersTable();
            
            // Update pagination info
            this.updatePaginationInfo();
            
            // Get total users count for pagination
            await this.countTotalUsers();
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showToast('Error loading users', 'error');
        }
    }

    // Count total users for pagination
    async countTotalUsers() {
        try {
            const querySnapshot = await getDocs(collection(this.db, "users"));
            this.totalUsers = querySnapshot.size;
            this.updatePaginationControls();
        } catch (error) {
            console.error('Error counting users:', error);
        }
    }

    // Apply filters to loaded users
    applyFiltersToUsers() {
        // Start with all loaded users
        this.filteredUsers = [...this.users];
        
        // Apply role filter
        if (this.filters.role !== 'all') {
            this.filteredUsers = this.filteredUsers.filter(user => user.userRole === this.filters.role);
        }
        
        // Apply exam filter
        if (this.filters.exam !== 'all') {
            this.filteredUsers = this.filteredUsers.filter(user => {
                return user.examData && user.examData[this.filters.exam];
            });
        }
        
        // Apply status filter
        if (this.filters.status !== 'all') {
            if (this.filters.status === 'active') {
                this.filteredUsers = this.filteredUsers.filter(user => user.isActive === true);
            } else if (this.filters.status === 'inactive') {
                this.filteredUsers = this.filteredUsers.filter(user => user.isActive === false);
            } else if (this.filters.status === 'unverified') {
                // This would require info from Firebase Auth that we don't have in Firestore
                // For demo purposes, we'll just filter based on a hypothetical 'emailVerified' field
                this.filteredUsers = this.filteredUsers.filter(user => user.emailVerified === false);
            }
        }
        
        // Apply date filters
        if (this.filters.dateFrom) {
            this.filteredUsers = this.filteredUsers.filter(user => {
                const userDate = new Date(user.createdAt);
                return userDate >= this.filters.dateFrom;
            });
        }
        
        if (this.filters.dateTo) {
            // Set time to end of day for inclusive filtering
            const endDate = new Date(this.filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            
            this.filteredUsers = this.filteredUsers.filter(user => {
                const userDate = new Date(user.createdAt);
                return userDate <= endDate;
            });
        }
        
        // Apply search term
        if (this.filters.searchTerm) {
            this.filteredUsers = this.filteredUsers.filter(user => {
                return (
                    (user.name && user.name.toLowerCase().includes(this.filters.searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(this.filters.searchTerm)) ||
                    (user.mobileNumber && user.mobileNumber.includes(this.filters.searchTerm))
                );
            });
        }
    }

    // Render users table
    renderUsersTable() {
        const tableBody = document.querySelector('#users-table tbody');
        
        if (!tableBody) return;
        
        if (this.filteredUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" class="loading-cell">No users found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        this.filteredUsers.forEach(user => {
            const examLabels = [];
            
            if (user.examData) {
                if (user.examData.JeeMain) examLabels.push('JEE Main');
                if (user.examData.JeeAdvanced) examLabels.push('JEE Advanced');
                if (user.examData.Mhtcet) examLabels.push('MHT-CET');
                if (user.examData.Neet) examLabels.push('NEET-UG');
            }
            
            const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            
            const rowHtml = `
                <tr data-user-id="${user.id}">
                    <td>
                        <input type="checkbox" class="user-checkbox" 
                               ${this.selectedUserIds.has(user.id) ? 'checked' : ''}>
                    </td>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.mobileNumber || 'N/A'}</td>
                    <td>${examLabels.length ? examLabels.join(', ') : 'None'}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="status-badge ${this.getRoleBadgeClass(user.userRole)}">
                            ${user.userRole || 'Student'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="actions-cell">
                        <button class="action-btn view" title="View User" onclick="adminUserManager.viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Edit User" onclick="adminUserManager.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" title="Delete User" onclick="adminUserManager.confirmDeleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            
            tableBody.innerHTML += rowHtml;
        });
        
        // Add click handler for checkboxes
        document.querySelectorAll('.user-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const userId = e.target.closest('tr').dataset.userId;
                this.toggleUserSelection(userId, e.target.checked);
            });
        });
    }

    // Get role badge class
    getRoleBadgeClass(role) {
        switch(role) {
            case 'admin':
                return 'status-verified';
            default:
                return 'status-active';
        }
    }

    // Update pagination info
    updatePaginationInfo() {
        document.getElementById('showing-start').textContent = ((this.currentPage - 1) * this.pageSize) + 1;
        
        const end = Math.min(this.currentPage * this.pageSize, this.totalUsers);
        document.getElementById('showing-end').textContent = end;
        
        document.getElementById('total-users-count').textContent = this.totalUsers;
    }

    // Update pagination controls
    updatePaginationControls() {
        const totalPages = Math.ceil(this.totalUsers / this.pageSize);
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        // Update prev/next buttons
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
        }
        
        // Update page numbers
        const paginationNumbers = document.getElementById('pagination-numbers');
        if (paginationNumbers) {
            paginationNumbers.innerHTML = '';
            
            // Simple pagination logic - show 5 page numbers
            let startPage = Math.max(1, this.currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            
            if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const pageButton = document.createElement('button');
                pageButton.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
                pageButton.textContent = i;
                pageButton.addEventListener('click', () => this.goToPage(i));
                paginationNumbers.appendChild(pageButton);
            }
        }
    }

    // Go to specific page
    goToPage(pageNumber) {
        if (pageNumber === this.currentPage) return;
        
        // Reset pagination cursors if going back to first page
        if (pageNumber === 1) {
            this.firstVisible = null;
            this.lastVisible = null;
        }
        
        this.currentPage = pageNumber;
        this.loadUsers();
    }

    // Next page
    nextPage() {
        if (document.getElementById('next-page').disabled) return;
        
        this.currentPage++;
        this.loadUsers('next');
    }

    // Previous page
    previousPage() {
        if (document.getElementById('prev-page').disabled) return;
        
        this.currentPage--;
        this.loadUsers('prev');
    }

    // Apply filters
    applyFilters() {
        // Reset pagination
        this.currentPage = 1;
        this.firstVisible = null;
        this.lastVisible = null;
        
        // Load users with new filters
        this.loadUsers();
    }

    // Clear filters
    clearFilters() {
        this.filters = {
            role: 'all',
            exam: 'all',
            status: 'all',
            dateFrom: null,
            dateTo: null,
            searchTerm: ''
        };
        
        // Reset filter form
        document.getElementById('role-filter').value = 'all';
        document.getElementById('exam-filter').value = 'all';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('user-search').value = '';
        
        // Apply reset filters
        this.applyFilters();
    }

    // Debounce search to avoid too many queries
    debounceSearch() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        this.searchTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    // Update sort
    updateSort(field) {
        // If already sorting by this field, toggle direction
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        // Reset pagination
        this.currentPage = 1;
        this.firstVisible = null;
        this.lastVisible = null;
        
        // Load users with new sort
        this.loadUsers();
    }

    // Get field name from header text
    getFieldNameFromHeader(headerText) {
        const fieldMap = {
            'Name': 'name',
            'Email': 'email',
            'Registered': 'createdAt'
        };
        
        return fieldMap[headerText] || 'createdAt';
    }

    // Toggle user selection for bulk actions
    toggleUserSelection(userId, isSelected) {
        if (isSelected) {
            this.selectedUserIds.add(userId);
        } else {
            this.selectedUserIds.delete(userId);
        }
        
        this.updateBulkActionsVisibility();
    }

    // Handle select all checkboxes
    handleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.user-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const userId = checkbox.closest('tr').dataset.userId;
            this.toggleUserSelection(userId, selectAll);
        });
    }

    // Update bulk actions visibility
    updateBulkActionsVisibility() {
        const bulkActionsContainer = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (bulkActionsContainer) {
            bulkActionsContainer.style.display = this.selectedUserIds.size > 0 ? 'flex' : 'none';
        }
        
        if (selectedCount) {
            selectedCount.textContent = this.selectedUserIds.size;
        }
    }

    // View user details
    viewUser(userId) {
        // Redirect to user detail page
        window.location.href = `users.html?userId=${userId}`;
    }

    // Edit user 
    async editUser(userId) {
        try {
            // Get user data
            const userDoc = await getDoc(doc(this.db, "users", userId));
            
            if (!userDoc.exists()) {
                this.showToast('User not found', 'error');
                return;
            }
            
            const userData = userDoc.data();
            
            // Set form values
            document.getElementById('edit-user-id').value = userId;
            document.getElementById('edit-name').value = userData.name || '';
            document.getElementById('edit-email').value = userData.email || '';
            document.getElementById('edit-mobile').value = userData.mobileNumber || '';
            document.getElementById('edit-role').value = userData.userRole || 'student';
            document.getElementById('edit-status').value = userData.isActive ? 'active' : 'inactive';
            
            // Set exam checkboxes
            document.getElementById('edit-jee-main').checked = !!(userData.examData && userData.examData.JeeMain);
            document.getElementById('edit-jee-advanced').checked = !!(userData.examData && userData.examData.JeeAdvanced);
            document.getElementById('edit-mhtcet').checked = !!(userData.examData && userData.examData.Mhtcet);
            document.getElementById('edit-neet').checked = !!(userData.examData && userData.examData.Neet);
            
            // Set rank values
            if (userData.examData) {
                if (userData.examData.JeeMain) {
                    document.getElementById('edit-jee-main-rank').value = userData.examData.JeeMain.rank || '';
                    document.getElementById('verify-jee-main').checked = userData.examData.JeeMain.verified || false;
                }
                
                if (userData.examData.JeeAdvanced) {
                    document.getElementById('edit-jee-advanced-rank').value = userData.examData.JeeAdvanced.rank || '';
                    document.getElementById('verify-jee-advanced').checked = userData.examData.JeeAdvanced.verified || false;
                }
                
                if (userData.examData.Mhtcet) {
                    document.getElementById('edit-mhtcet-rank').value = userData.examData.Mhtcet.rank || '';
                    document.getElementById('verify-mhtcet').checked = userData.examData.Mhtcet.verified || false;
                }
                
                if (userData.examData.Neet) {
                    document.getElementById('edit-neet-rank').value = userData.examData.Neet.rank || '';
                    document.getElementById('verify-neet').checked = userData.examData.Neet.verified || false;
                }
            }
            
            // Set admin notes
            document.getElementById('admin-notes').value = userData.adminNotes || '';
            
            // Show/hide rank fields
            this.toggleExamRankFields();
            
            // Show edit modal
            this.showModal('userEditModal');
            
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showToast('Error loading user data', 'error');
        }
    }

    // Toggle rank fields based on exam checkbox states
    toggleExamRankFields() {
        document.querySelectorAll('#edit-rank-fields .rank-field').forEach(field => {
            const examKey = field.dataset.exam;
            const checkboxId = `edit-${examKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            const isChecked = document.getElementById(checkboxId).checked;
            field.style.display = isChecked ? 'block' : 'none';
        });
    }

    // Save user changes
    async saveUserChanges() {
        try {
            const userId = document.getElementById('edit-user-id').value;
            
            if (!userId) {
                this.showToast('User ID not found', 'error');
                return;
            }
            
            // Get form values
            const userData = {
                name: document.getElementById('edit-name').value.trim(),
                email: document.getElementById('edit-email').value.trim(),
                mobileNumber: document.getElementById('edit-mobile').value.trim(),
                userRole: document.getElementById('edit-role').value,
                isActive: document.getElementById('edit-status').value === 'active',
                adminNotes: document.getElementById('admin-notes').value.trim(),
                examData: {},
                updatedAt: new Date().toISOString(),
                updatedBy: this.currentUser.uid
            };
            
            // Get exam data
            if (document.getElementById('edit-jee-main').checked) {
                userData.examData.JeeMain = {
                    rank: parseInt(document.getElementById('edit-jee-main-rank').value) || null,
                    verified: document.getElementById('verify-jee-main').checked
                };
            }
            
            if (document.getElementById('edit-jee-advanced').checked) {
                userData.examData.JeeAdvanced = {
                    rank: parseInt(document.getElementById('edit-jee-advanced-rank').value) || null,
                    verified: document.getElementById('verify-jee-advanced').checked
                };
            }
            
            if (document.getElementById('edit-mhtcet').checked) {
                userData.examData.Mhtcet = {
                    rank: parseInt(document.getElementById('edit-mhtcet-rank').value) || null,
                    verified: document.getElementById('verify-mhtcet').checked
                };
            }
            
            if (document.getElementById('edit-neet').checked) {
                userData.examData.Neet = {
                    rank: parseInt(document.getElementById('edit-neet-rank').value) || null,
                    verified: document.getElementById('verify-neet').checked
                };
            }
            
            // Update user document in Firestore
            await updateDoc(doc(this.db, "users", userId), userData);
            
            this.showToast('User updated successfully', 'success');
            this.closeModal('userEditModal');
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error saving user changes:', error);
            this.showToast('Error saving changes', 'error');
        }
    }

    // Show add user modal
    showAddUserModal() {
        // Create the form dynamically if it doesn't exist
        const formContainer = document.querySelector('#addUserModal .admin-modal-body');
        
        if (formContainer) {
            formContainer.innerHTML = `
                <form id="add-user-form">
                    <div class="modal-form-grid">
                        <!-- Personal Information -->
                        <div class="form-section">
                            <h3>Personal Information</h3>
                            
                            <div class="form-group">
                                <label for="add-name">Full Name*</label>
                                <input type="text" id="add-name" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-email">Email Address*</label>
                                <input type="email" id="add-email" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-mobile">Mobile Number*</label>
                                <input type="tel" id="add-mobile" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-password">Password*</label>
                                <input type="password" id="add-password" required>
                                <div class="password-hint">Must be at least 8 characters with uppercase, lowercase, number and special character</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="add-role">User Role</label>
                                <select id="add-role" required>
                                    <option value="student">Student</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Exam Information -->
                        <div class="form-section">
                            <h3>Exam Information</h3>
                            
                            <div class="form-group checkbox-group">
                                <label>Applicable Exams:</label>
                                <div class="checkbox-grid">
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="add-jee-main" class="add-exam-checkbox">
                                        <label for="add-jee-main">JEE Main</label>
                                    </div>
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="add-jee-advanced" class="add-exam-checkbox">
                                        <label for="add-jee-advanced">JEE Advanced</label>
                                    </div>
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="add-mhtcet" class="add-exam-checkbox">
                                        <label for="add-mhtcet">MHT-CET</label>
                                    </div>
                                    <div class="checkbox-container">
                                        <input type="checkbox" id="add-neet" class="add-exam-checkbox">
                                        <label for="add-neet">NEET-UG</label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Dynamic rank fields -->
                            <div id="add-rank-fields">
                                <div class="form-group rank-field" data-exam="jeeMain" style="display: none;">
                                    <label for="add-jee-main-rank">JEE Main Rank</label>
                                    <div class="rank-input-group">
                                        <input type="number" id="add-jee-main-rank">
                                        <div class="verification-toggle">
                                            <input type="checkbox" id="add-verify-jee-main">
                                            <label for="add-verify-jee-main">Verified</label>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group rank-field" data-exam="jeeAdvanced" style="display: none;">
                                    <label for="add-jee-advanced-rank">JEE Advanced Rank</label>
                                    <div class="rank-input-group">
                                        <input type="number" id="add-jee-advanced-rank">
                                        <div class="verification-toggle">
                                            <input type="checkbox" id="add-verify-jee-advanced">
                                            <label for="add-verify-jee-advanced">Verified</label>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group rank-field" data-exam="mhtcet" style="display: none;">
                                    <label for="add-mhtcet-rank">MHT-CET Rank</label>
                                    <div class="rank-input-group">
                                        <input type="number" id="add-mhtcet-rank">
                                        <div class="verification-toggle">
                                            <input type="checkbox" id="add-verify-mhtcet">
                                            <label for="add-verify-mhtcet">Verified</label>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group rank-field" data-exam="neet" style="display: none;">
                                    <label for="add-neet-rank">NEET-UG Rank</label>
                                    <div class="rank-input-group">
                                        <input type="number" id="add-neet-rank">
                                        <div class="verification-toggle">
                                            <input type="checkbox" id="add-verify-neet">
                                            <label for="add-verify-neet">Verified</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group notes-group">
                        <label for="add-admin-notes">Admin Notes</label>
                        <textarea id="add-admin-notes" rows="3" placeholder="Add private notes about this user (only visible to admins)"></textarea>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary cancel-btn">Cancel</button>
                        <button type="submit" class="btn-primary save-btn">Create User</button>
                    </div>
                </form>
            `;
            
            // Setup exam checkbox events
            document.querySelectorAll('.add-exam-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const examName = e.target.id.replace('add-', '').replace(/-/g, '');
                    const rankField = document.querySelector(`#add-rank-fields [data-exam="${examName}"]`);
                    if (rankField) {
                        rankField.style.display = e.target.checked ? 'block' : 'none';
                    }
                });
            });
            
            // Setup form submission
            document.getElementById('add-user-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.createNewUser();
            });
        }
        
        this.showModal('addUserModal');
    }

    // Create new user
    async createNewUser() {
        try {
            // Get form values
            const email = document.getElementById('add-email').value.trim();
            const password = document.getElementById('add-password').value;
            
            // Validate password
            if (password.length < 8) {
                this.showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const uid = userCredential.user.uid;
            
            // Create user data
            const userData = {
                uid: uid,
                name: document.getElementById('add-name').value.trim(),
                email: email,
                mobileNumber: document.getElementById('add-mobile').value.trim(),
                userRole: document.getElementById('add-role').value,
                isActive: true,
                adminNotes: document.getElementById('add-admin-notes').value.trim(),
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.uid,
                examData: {}
            };
            
            // Get exam data
            if (document.getElementById('add-jee-main').checked) {
                userData.examData.JeeMain = {
                    rank: parseInt(document.getElementById('add-jee-main-rank').value) || null,
                    verified: document.getElementById('add-verify-jee-main').checked
                };
            }
            
            if (document.getElementById('add-jee-advanced').checked) {
                userData.examData.JeeAdvanced = {
                    rank: parseInt(document.getElementById('add-jee-advanced-rank').value) || null,
                    verified: document.getElementById('add-verify-jee-advanced').checked
                };
            }
            
            if (document.getElementById('add-mhtcet').checked) {
                userData.examData.Mhtcet = {
                    rank: parseInt(document.getElementById('add-mhtcet-rank').value) || null,
                    verified: document.getElementById('add-verify-mhtcet').checked
                };
            }
            
            if (document.getElementById('add-neet').checked) {
                userData.examData.Neet = {
                    rank: parseInt(document.getElementById('add-neet-rank').value) || null,
                    verified: document.getElementById('add-verify-neet').checked
                };
            }
            
            // Save user data to Firestore
            await setDoc(doc(this.db, "users", uid), userData);
            
            // Send verification email
            await sendEmailVerification(userCredential.user);
            
            this.showToast('User created successfully', 'success');
            this.closeModal('addUserModal');
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error creating user:', error);
            this.showToast('Error creating user: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    // Confirm delete user
    confirmDeleteUser(userId) {
        // Set up confirmation action
        this.confirmationAction = () => this.deleteUser(userId);
        
        // Show confirmation dialog
        document.getElementById('confirmation-message').textContent = 'Are you sure you want to delete this user? This action cannot be undone.';
        this.showModal('confirmationModal');
    }

    // Delete user
    async deleteUser(userId) {
        try {
            // Delete user document from Firestore
            await deleteDoc(doc(this.db, "users", userId));
            
            this.showToast('User deleted successfully', 'success');
            
            // Remove from selected users if present
            this.selectedUserIds.delete(userId);
            this.updateBulkActionsVisibility();
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('Error deleting user', 'error');
        }
    }

    // Confirm bulk delete
    confirmBulkDelete() {
        if (this.selectedUserIds.size === 0) return;
        
        // Set up confirmation action
        this.confirmationAction = () => this.bulkDeleteUsers();
        
        // Show confirmation dialog
        document.getElementById('confirmation-message').textContent = 
            `Are you sure you want to delete ${this.selectedUserIds.size} users? This action cannot be undone.`;
        
        this.showModal('confirmationModal');
    }

    // Bulk delete users
    async bulkDeleteUsers() {
        try {
            const deletePromises = Array.from(this.selectedUserIds).map(userId => 
                deleteDoc(doc(this.db, "users", userId))
            );
            
            await Promise.all(deletePromises);
            
            this.showToast(`${this.selectedUserIds.size} users deleted successfully`, 'success');
            
            // Clear selection
            this.selectedUserIds.clear();
            this.updateBulkActionsVisibility();
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error bulk deleting users:', error);
            this.showToast('Error deleting users', 'error');
        }
    }

    // Bulk verify emails
    bulkVerifyEmails() {
        this.showToast('Email verification functionality requires backend implementation', 'info');
    }

    // Bulk deactivate users
    async bulkDeactivateUsers() {
        try {
            const updatePromises = Array.from(this.selectedUserIds).map(userId => 
                updateDoc(doc(this.db, "users", userId), {
                    isActive: false,
                    updatedAt: new Date().toISOString(),
                    updatedBy: this.currentUser.uid
                })
            );
            
            await Promise.all(updatePromises);
            
            this.showToast(`${this.selectedUserIds.size} users deactivated successfully`, 'success');
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error deactivating users:', error);
            this.showToast('Error deactivating users', 'error');
        }
    }

    // Bulk activate users
    async bulkActivateUsers() {
        try {
            const updatePromises = Array.from(this.selectedUserIds).map(userId => 
                updateDoc(doc(this.db, "users", userId), {
                    isActive: true,
                    updatedAt: new Date().toISOString(),
                    updatedBy: this.currentUser.uid
                })
            );
            
            await Promise.all(updatePromises);
            
            this.showToast(`${this.selectedUserIds.size} users activated successfully`, 'success');
            
            // Reload users to reflect changes
            this.loadUsers();
            
        } catch (error) {
            console.error('Error activating users:', error);
            this.showToast('Error activating users', 'error');
        }
    }

    // Export users
    exportUsers() {
        try {
            // Create CSV content
            let csv = 'Name,Email,Mobile,Role,Status,Registration Date,Exams\n';
            
            this.users.forEach(user => {
                const exams = [];
                if (user.examData) {
                    if (user.examData.JeeMain) exams.push(`JEE Main (${user.examData.JeeMain.rank})`);
                    if (user.examData.JeeAdvanced) exams.push(`JEE Advanced (${user.examData.JeeAdvanced.rank})`);
                    if (user.examData.Mhtcet) exams.push(`MHT-CET (${user.examData.Mhtcet.rank})`);
                    if (user.examData.Neet) exams.push(`NEET-UG (${user.examData.Neet.rank})`);
                }
                
                const createdDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
                
                csv += `"${user.name || ''}","${user.email || ''}","${user.mobileNumber || ''}","${user.userRole || 'student'}","${user.isActive ? 'Active' : 'Inactive'}","${createdDate}","${exams.join('; ')}"\n`;
            });
            
            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'nextstep_users.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.showToast('Users exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting users:', error);
            this.showToast('Error exporting users', 'error');
        }
    }

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    // Close modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.admin-modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Handle logout
    async handleLogout() {
        try {
            await signOut(this.auth);
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out', 'error');
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Check if there's a global showToast function
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show toast with animation
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
}

// Initialize the user management
const adminUserManager = new AdminUserManagement();

// Expose to global scope for event handlers
window.adminUserManager = adminUserManager;
