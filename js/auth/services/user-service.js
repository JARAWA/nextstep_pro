/**
 * User service for managing user profile data in Firestore
 */
import { 
    doc, 
    setDoc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { db } from './firebase-config.js';
import { ErrorHandler } from '../utils/error-handler.js';

class UserService {
    static userData = null;
    
    /**
     * Create a new user profile in Firestore
     * @param {Object} user - Firebase user object
     * @param {Object} profileData - User profile data
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async createUserProfile(user, profileData) {
        if (!user || !user.uid) {
            console.error('Invalid user object provided');
            return false;
        }
        
        try {
            // Use retry mechanism for Firestore operations
            const { success, error } = await ErrorHandler.retryOperation(async () => {
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    ...profileData,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
                return true;
            });
            
            if (success) {
                console.log("User profile created successfully for:", user.uid);
                // Cache user data
                this.userData = profileData;
                return true;
            } else {
                console.error("Failed to create user profile:", error);
                return false;
            }
        } catch (error) {
            console.error("Error creating user profile:", error);
            return false;
        }
    }
    
    /**
     * Fetch user profile from Firestore
     * @param {Object} user - Firebase user object
     * @returns {Promise<Object|null>} User profile data or null if not found
     */
    static async fetchUserProfile(user) {
        if (!user || !user.uid) {
            console.error('Invalid user object provided');
            return null;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("User profile data loaded:", userData);
                // Cache user data
                this.userData = userData;
                return userData;
            } else {
                console.log("No user profile found");
                return null;
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    }
    
    /**
     * Update user profile data in Firestore
     * @param {Object} user - Firebase user object
     * @param {Object} updateData - Data to update
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async updateUserProfile(user, updateData) {
        if (!user || !user.uid) {
            console.error('Invalid user object provided');
            return false;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            
            // First check if the user profile exists
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                // If no profile exists, create one
                return await this.createUserProfile(user, updateData);
            }
            
            // Otherwise update the existing profile
            await updateDoc(userDocRef, {
                ...updateData,
                lastUpdated: new Date().toISOString()
            });
            
            console.log("User profile updated successfully");
            
            // Update cached user data
            if (this.userData) {
                this.userData = { ...this.userData, ...updateData };
            }
            
            return true;
        } catch (error) {
            console.error("Error updating user profile:", error);
            return false;
        }
    }
    
    /**
     * Get cached user data or fetch from Firestore if not available
     * @param {Object} user - Firebase user object
     * @returns {Promise<Object|null>} User profile data or null
     */
    static async getUserData(user) {
        // Return cached data if available
        if (this.userData) {
            return this.userData;
        }
        
        // Otherwise fetch from Firestore
        return await this.fetchUserProfile(user);
    }
    
    /**
     * Find users by email
     * @param {string} email - Email to search for
     * @returns {Promise<Object|null>} User data or null if not found
     */
    static async findUserByEmail(email) {
        if (!email) return null;
        
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email.trim()));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return null;
            }
            
            // Return the first matching user
            return {
                id: querySnapshot.docs[0].id,
                ...querySnapshot.docs[0].data()
            };
        } catch (error) {
            console.error("Error finding user by email:", error);
            return null;
        }
    }
    
    /**
     * Check if user has admin role
     * @param {Object} user - Firebase user object
     * @returns {Promise<boolean>} Whether user has admin role
     */
    static async isUserAdmin(user) {
        if (!user || !user.uid) return false;
        
        try {
            const userData = await this.getUserData(user);
            return userData && userData.userRole === 'admin';
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    }
}

export default UserService;
