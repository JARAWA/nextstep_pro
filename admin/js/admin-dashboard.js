// Import Firebase modules
import { 
    getAuth, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    query, 
    where, 
    orderBy, 
    limit,
    Timestamp,
    startAfter,
    endBefore,
    limitToLast 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Admin Dashboard Controller
class AdminDashboard {
    // Class properties
    constructor() {
        this.auth = getAuth();
        this.db = getFirestore();
        this.currentUser = null;
        this.stats = {
            totalUsers: 0,
            newSignups: 0,
            jeeStudents: 0,
            neetStudents: 0
        };
        this.recentUsers = [];
        this.examDistributionData = [];
        this.setupEventListeners();
        this.initializeAdminDashboard();
    }

    // Set up event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        // Chart period filters
        const chartFilters = document.querySelectorAll('.chart-filter');
        chartFilters.forEach(filter => {
            filter.addEventListener('click', (e) => {
                chartFilters.forEach(f => f.classList.remove('active'));
                e.target.classList.add('active');
                this.updateExamDistributionChart(e.target.dataset.period);
            });
        });
    }

    // Initialize dashboard
    async initializeAdminDashboard() {
        try {
            // Check authentication state
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    this.currentUser = user;
                    
                    // Verify admin status
                    const isAdmin = await this.verifyAdminStatus(user.uid);
                    
                    if (!isAdmin) {
                        alert('You do not have admin permissions');
                        await this.handleLogout();
                        return;
                    }
                    
                    // Update admin name in header
                    const adminNameElement = document.querySelector('.admin-name');
                    if (adminNameElement) {
                        adminNameElement.textContent = user.displayName || user.email;
                    }
                    
                    // Initialize dashboard data
                    await this.loadDashboardData();
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = '../index.html';
                }
            });
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showToast('Error initializing dashboard', 'error');
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

    // Load all dashboard data
    async loadDashboardData() {
        try {
            // Update last updated time
            document.getElementById('last-updated-time').textContent = new Date().toLocaleString();
            
            // Load statistics in parallel
            await Promise.all([
                this.loadUserStatistics(),
                this.loadRecentUsers(),
                this.loadExamDistributionData()
            ]);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('Error loading dashboard data', 'error');
        }
    }

    // Load user statistics
    async loadUserStatistics() {
        try {
            // Get total users count
            const usersSnapshot = await getDocs(collection(this.db, "users"));
            this.stats.totalUsers = usersSnapshot.size;
            
            // Get new signups (last 7 days)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const newSignupsQuery = query(
                collection(this.db, "users"),
                where("createdAt", ">=", oneWeekAgo.toISOString())
            );
            
            const newSignupsSnapshot = await getDocs(newSignupsQuery);
            this.stats.newSignups = newSignupsSnapshot.size;
            
            // Get JEE students count
            const jeeQuery = query(
                collection(this.db, "users"),
                where("examData.JeeMain", "!=", null)
            );
            
            const jeeSnapshot = await getDocs(jeeQuery);
            this.stats.jeeStudents = jeeSnapshot.size;
            
            // Get NEET students count
            const neetQuery = query(
                collection(this.db, "users"),
                where("examData.Neet", "!=", null)
            );
            
            const neetSnapshot = await getDocs(neetQuery);
            this.stats.neetStudents = neetSnapshot.size;
            
            // Update UI
            document.getElementById('total-users').textContent = this.stats.totalUsers;
            document.getElementById('new-signups').textContent = this.stats.newSignups;
            document.getElementById('jee-students').textContent = this.stats.jeeStudents;
            document.getElementById('neet-students').textContent = this.stats.neetStudents;
            
        } catch (error) {
            console.error('Error loading user statistics:', error);
            this.showToast('Error loading statistics', 'error');
        }
    }

    // Load recent users
    async loadRecentUsers() {
        try {
            const recentUsersQuery = query(
                collection(this.db, "users"),
                orderBy("createdAt", "desc"),
                limit(5)
            );
            
            const querySnapshot = await getDocs(recentUsersQuery);
            
            this.recentUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Update UI
            this.renderRecentUsersTable();
            
        } catch (error) {
            console.error('Error loading recent users:', error);
            this.showToast('Error loading recent users', 'error');
        }
    }

    // Render recent users table
    renderRecentUsersTable() {
        const tableBody = document.querySelector('#recent-users-table tbody');
        
        if (!tableBody || !this.recentUsers.length) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-cell">No recent users found</td></tr>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        this.recentUsers.forEach(user => {
            const examLabels = [];
            
            if (user.examData) {
                if (user.examData.JeeMain) examLabels.push('JEE Main');
                if (user.examData.JeeAdvanced) examLabels.push('JEE Advanced');
                if (user.examData.Mhtcet) examLabels.push('MHT-CET');
                if (user.examData.Neet) examLabels.push('NEET-UG');
            }
            
            const createdDate = new Date(user.createdAt).toLocaleDateString();
            
            tableBody.innerHTML += `
                <tr>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.mobileNumber || 'N/A'}</td>
                    <td>${examLabels.length ? examLabels.join(', ') : 'None'}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                            ${user.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="actions-cell">
                        <button class="action-btn view" title="View User" onclick="adminDashboard.viewUser('${user.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" title="Edit User" onclick="adminDashboard.editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    // Load exam distribution data
    async loadExamDistributionData() {
        try {
            // Get users with JEE Main
            const jeeMainQuery = query(
                collection(this.db, "users"),
                where("examData.JeeMain", "!=", null)
            );
            const jeeMainCount = (await getDocs(jeeMainQuery)).size;
            
            // Get users with JEE Advanced
            const jeeAdvQuery = query(
                collection(this.db, "users"),
                where("examData.JeeAdvanced", "!=", null)
            );
            const jeeAdvCount = (await getDocs(jeeAdvQuery)).size;
            
            // Get users with MHT-CET
            const mhtcetQuery = query(
                collection(this.db, "users"),
                where("examData.Mhtcet", "!=", null)
            );
            const mhtcetCount = (await getDocs(mhtcetQuery)).size;
            
            // Get users with NEET-UG
            const neetQuery = query(
                collection(this.db, "users"),
                where("examData.Neet", "!=", null)
            );
            const neetCount = (await getDocs(neetQuery)).size;
            
            this.examDistributionData = [
                { label: 'JEE Main', value: jeeMainCount },
                { label: 'JEE Advanced', value: jeeAdvCount },
                { label: 'MHT-CET', value: mhtcetCount },
                { label: 'NEET-UG', value: neetCount }
            ];
            
            // Render chart
            this.renderExamDistributionChart();
            
        } catch (error) {
            console.error('Error loading exam distribution data:', error);
            this.showToast('Error loading chart data', 'error');
        }
    }

    // Render exam distribution chart
    renderExamDistributionChart() {
        const chartContainer = document.getElementById('exam-distribution-chart');
        
        if (!chartContainer || !this.examDistributionData.length) {
            return;
        }
        
        // Clear previous chart
        chartContainer.innerHTML = '<canvas id="examChart"></canvas>';
        
        const ctx = document.getElementById('examChart').getContext('2d');
        
        const colors = [
            '#4285F4', // Google Blue
            '#EA4335', // Google Red
            '#FBBC05', // Google Yellow
            '#34A853'  // Google Green
        ];
        
        const data = {
            labels: this.examDistributionData.map(item => item.label),
            datasets: [{
                data: this.examDistributionData.map(item => item.value),
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 15
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        boxWidth: 15,
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 10,
                    bodyFont: {
                        family: "'Poppins', sans-serif",
                        size: 12
                    },
                    titleFont: {
                        family: "'Poppins', sans-serif",
                        size: 14
                    }
                }
            }
        };
        
        // Create the chart
        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }

    // Update exam distribution chart based on period
    updateExamDistributionChart(period) {
        // In a real app, you would load different data based on period
        console.log(`Updating chart for period: ${period}`);
        // For this demo, we'll just re-render the same data
        this.renderExamDistributionChart();
    }

    // View user profile
    viewUser(userId) {
        // Redirect to user detail page
         window.location.href = `users.html?action=edit&id=${userId}`;
    }

    // Edit user 
    editUser(userId) {
        // Redirect to user management page with user ID
        window.location.href = `users.html?action=edit&id=${userId}`;
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

// Initialize the dashboard
const adminDashboard = new AdminDashboard();

// Expose to global scope for event handlers
window.adminDashboard = adminDashboard;
