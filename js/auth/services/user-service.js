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
import { TokenManager } from '../utils/token-manager.js';

class UserService {
    static userData = null;
    static fetchInProgress = false;
    static lastFetchTimestamp = null;
    static _retryCount = 0;
    static MAX_RETRIES = 3;
    
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
        console.log("createUserProfile received profileData:", JSON.stringify(profileData));
  
        try {
            // Ensure we have a fresh token before creating the profile
            const token = await user.getIdToken(true);
            console.log("Using fresh token for profile creation:", !!token);
            
            // Use retry mechanism for Firestore operations
            const { success, error } = await ErrorHandler.retryOperation(async () => {
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    ...profileData,
                    email: user.email, // Ensure email is stored for security rule matching
                    uid: user.uid,     // Store UID explicitly for double verification
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
                
                // Store profile data in localStorage as fallback
                this.storeProfileInLocalStorage(user.uid, profileData);
                
                return false;
            }
        } catch (error) {
            console.error("Error creating user profile:", error);
            
            // Store profile data in localStorage as fallback
            this.storeProfileInLocalStorage(user.uid, profileData);
            
            return false;
        }
    }
    
    /**
     * Store profile data temporarily in localStorage as fallback
     * @param {string} uid - User ID
     * @param {Object} profileData - User profile data
     */
    static storeProfileInLocalStorage(uid, profileData) {
        try {
            const key = `pending_profile_${uid}`;
            localStorage.setItem(key, JSON.stringify({
                ...profileData,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                pendingSince: new Date().toISOString()
            }));
            console.log("Stored profile data in localStorage for later sync");
        } catch (e) {
            console.error("Failed to store profile in localStorage:", e);
        }
    }
    
    /**
     * Get pending profile data from localStorage
     * @param {string} uid - User ID
     * @returns {Object|null} Pending profile data or null
     */
    static getPendingProfileFromLocalStorage(uid) {
        try {
            const key = `pending_profile_${uid}`;
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (e) {
            console.error("Failed to get pending profile from localStorage:", e);
            return null;
        }
    }
    
    /**
     * Clear pending profile data from localStorage
     * @param {string} uid - User ID
     */
    static clearPendingProfileFromLocalStorage(uid) {
        try {
            const key = `pending_profile_${uid}`;
            localStorage.removeItem(key);
        } catch (e) {
            console.error("Failed to clear pending profile from localStorage:", e);
        }
    }
    
    /**
     * Attempt to sync any pending profile data to Firestore
     * @param {Object} user - Firebase user object
     * @returns {Promise<boolean>} Whether sync was successful
     */
    static async syncPendingProfile(user) {
        if (!user || !user.uid) return false;
        
        const pendingData = this.getPendingProfileFromLocalStorage(user.uid);
        if (!pendingData) return false;
        
        try {
            console.log("Attempting to sync pending profile data to Firestore");
            
            // Check if user already has a profile
            const userDoc = await this.fetchUserProfile(user);
            
            if (userDoc) {
                // User already has a profile, just update it with pending data
                await this.updateUserProfile(user, pendingData);
            } else {
                // Create new profile with pending data
                await this.createUserProfile(user, pendingData);
            }
            
            // Clear pending data if successful
            this.clearPendingProfileFromLocalStorage(user.uid);
            
            console.log("Successfully synced pending profile data");
            return true;
        } catch (error) {
            console.error("Failed to sync pending profile data:", error);
            return false;
        }
    }
    
    /**
     * Try to create a test document in system_test collection
     * @param {Object} user - Firebase user object
     * @returns {Promise<boolean>} Whether the operation succeeded
     */
    static async testFirestoreConnection(user) {
        if (!user || !user.uid) {
            console.error("Invalid user for connection test");
            return false;
        }
        
        try {
            console.log("=== TESTING FIRESTORE CONNECTION ===");
            
            // Get a fresh token
            const token = await user.getIdToken(true);
            console.log("Test using fresh token:", !!token);
            
            // Try to write to system_test collection (which has less restrictive permissions)
            const testDocRef = doc(db, "system_test", `test_${user.uid}_${Date.now()}`);
            await setDoc(testDocRef, {
                timestamp: new Date().toISOString(),
                uid: user.uid,
                test: "Connection test"
            });
            
            console.log("Test write successful");
            
            // Try to read it back
            const testDoc = await getDoc(testDocRef);
            console.log("Test read successful:", testDoc.exists());
            
            console.log("=== FIRESTORE CONNECTION TEST PASSED ===");
            return true;
        } catch (error) {
            console.error("=== FIRESTORE CONNECTION TEST FAILED ===");
            console.error("Error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
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
        
        if (this.fetchInProgress) {
            console.log("Profile fetch already in progress, waiting...");
            await new Promise(resolve => setTimeout(resolve, 500));
            return this.userData; // Return cached data if available
        }
        
        this.fetchInProgress = true;
        
        try {
            console.log("Attempting to fetch profile for user:", user.uid);
            
            // First test the connection to isolate permission vs. connection issues
            const connectionTest = await this.testFirestoreConnection(user);
            if (!connectionTest) {
                console.error("Firestore connection test failed, aborting profile fetch");
                this.fetchInProgress = false;
                return null;
            }
            
            // Always get a fresh token directly from user object
            console.log("Getting fresh token for profile fetch");
            const freshToken = await user.getIdToken(true);
            if (freshToken) {
                localStorage.setItem('authToken', freshToken);
                console.log("Fresh token stored for profile fetch, length:", freshToken.length);
            } else {
                console.error("Failed to get fresh token for profile fetch");
                this.fetchInProgress = false;
                return null;
            }
            
            // Add a delay to ensure token propagation
            console.log("Waiting for token propagation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const userDocRef = doc(db, "users", user.uid);
            console.log("Fetching document at path:", `users/${user.uid}`);
            
            try {
                // Try to create a basic profile first if it doesn't exist
                // This can help bypass initial permission issues
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    userRole: 'user' // Default role
                }, { merge: true });
                console.log("Created/updated basic profile");
            } catch (createError) {
                console.warn("Could not create basic profile:", createError);
                // Continue anyway to try reading
            }
            
            // Now try to read the profile
            const userDoc = await getDoc(userDocRef);
            
            console.log("Document fetch result:", userDoc.exists() ? "Document exists" : "Document doesn't exist");
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                console.log("User profile data loaded:", userData);
                // Cache user data
                this.userData = userData;
                this.lastFetchTimestamp = Date.now();
                this._retryCount = 0; // Reset retry counter on success
                this.fetchInProgress = false;
                return userData;
            } else {
                console.log("No user profile found. Creating default profile.");
                
                // Check if we have pending profile data in localStorage
                const pendingData = this.getPendingProfileFromLocalStorage(user.uid);
                if (pendingData) {
                    console.log("Found pending profile data in localStorage");
                    this.userData = pendingData;
                    
                    // Try to create the profile with the pending data
                    try {
                        await this.createUserProfile(user, {
                            ...pendingData,
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            userRole: 'user' // Default role
                        });
                        this.clearPendingProfileFromLocalStorage(user.uid);
                    } catch (createError) {
                        console.error("Error creating profile from pending data:", createError);
                    }
                    
                    this.fetchInProgress = false;
                    return pendingData;
                } else {
                    // No profile exists, create a new one with basic data
                    const basicProfile = {
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        userRole: 'user', // Default role
                        createdAt: new Date().toISOString()
                    };
                    
                    try {
                        await this.createUserProfile(user, basicProfile);
                        this.userData = basicProfile;
                        this.fetchInProgress = false;
                        return basicProfile;
                    } catch (createError) {
                        console.error("Error creating basic profile:", createError);
                        this.storeProfileInLocalStorage(user.uid, basicProfile);
                        this.fetchInProgress = false;
                        return basicProfile;
                    }
                }
            }
        } catch (error) {
            console.error("Detailed fetch error:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            
            this._retryCount++;
            
            // Implement exponential backoff for retries
            if (this._retryCount <= this.MAX_RETRIES) {
                console.log(`Retrying fetch (attempt ${this._retryCount} of ${this.MAX_RETRIES})...`);
                this.fetchInProgress = false;
                
                // Wait with exponential backoff (1s, 2s, 4s...)
                const backoffTime = Math.pow(2, this._retryCount - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                
                // Recursive retry with fresh token
                try {
                    await user.getIdToken(true); // Force token refresh
                    return await this.fetchUserProfile(user);
                } catch (retryError) {
                    console.error("Retry failed:", retryError);
                }
            }
            
            // Fall back to localStorage if Firestore fails after all retries
            const pendingData = this.getPendingProfileFromLocalStorage(user.uid);
            if (pendingData) {
                console.log("Using pending profile data from localStorage due to Firestore error");
                this.userData = pendingData;
                this.fetchInProgress = false;
                return pendingData;
            }
            
            this.fetchInProgress = false;
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
            // Ensure we have a fresh token
            await user.getIdToken(true);
            
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
            
            // Clear any pending data as we've successfully updated
            this.clearPendingProfileFromLocalStorage(user.uid);
            
            return true;
        } catch (error) {
            console.error("Error updating user profile:", error);
            
            // Store update data in localStorage for later sync
            const pendingData = this.getPendingProfileFromLocalStorage(user.uid) || {};
            this.storeProfileInLocalStorage(user.uid, {
                ...pendingData,
                ...updateData
            });
            
            return false;
        }
    }
    
    /**
     * Get cached user data or fetch from Firestore if not available
     * @param {Object} user - Firebase user object
     * @returns {Promise<Object|null>} User profile data or null
     */
    static async getUserData(user) {
        // Return cached data if available and not too old (within 5 minutes)
        const now = Date.now();
        if (this.userData && this.lastFetchTimestamp && now - this.lastFetchTimestamp < 300000) {
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
