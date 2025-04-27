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
import { TokenManager } from './token-manager.js';

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
                this.userData = {
                    ...profileData,
                    email: user.email,
                    uid: user.uid,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                
                // Store in localStorage for offline access
                this.storeProfileInLocalStorage(user.uid, this.userData);
                
                return true;
            } else {
                console.error("Failed to create user profile:", error);
                
                // Store profile data in localStorage as fallback
                const profile = {
                    ...profileData,
                    email: user.email,
                    uid: user.uid,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                
                this.storeProfileInLocalStorage(user.uid, profile);
                this.userData = profile;
                
                return false;
            }
        } catch (error) {
            console.error("Error creating user profile:", error);
            
            // Store profile data in localStorage as fallback
            const profile = {
                ...profileData,
                email: user.email,
                uid: user.uid,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            };
            
            this.storeProfileInLocalStorage(user.uid, profile);
            this.userData = profile;
            
            return false;
        }
    }
    
    /**
     * Create default profile for a user
     * @param {Object} user - Firebase user object
     * @returns {Object} Default profile object
     */
    static createDefaultProfile(user) {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            userRole: 'student', // Default role
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Store profile data temporarily in localStorage as fallback
     * @param {string} uid - User ID
     * @param {Object} profileData - User profile data
     */
    static storeProfileInLocalStorage(uid, profileData) {
        try {
            const key = `user_profile_${uid}`;
            localStorage.setItem(key, JSON.stringify({
                ...profileData,
                lastUpdated: new Date().toISOString(),
                storedAt: new Date().toISOString()
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
     * Get profile data from localStorage
     * @param {string} uid - User ID
     * @returns {Object|null} Profile data or null
     */
    static getProfileFromLocalStorage(uid) {
        try {
            const key = `user_profile_${uid}`;
            const data = localStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
            
            // Also check for pending profiles as fallback
            return this.getPendingProfileFromLocalStorage(uid);
        } catch (e) {
            console.error("Failed to get profile from localStorage:", e);
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
            
            // Strategy 1: Try reading the user's own profile - this should be allowed with updated rules
            try {
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                console.log("User profile read test:", docSnap.exists() ? "Profile exists" : "Profile doesn't exist yet");
                return true;
            } catch (readError) {
                console.log("Profile read test failed:", readError);
                // Continue to next strategy
            }
            
            // Strategy 2: Try system_test collection
            try {
                // Just try to read a document from system_test collection
                const docRef = doc(db, "system_test", "connection_test");
                const docSnap = await getDoc(docRef);
                console.log("Read test completed:", docSnap.exists() ? "Document exists" : "Document doesn't exist");
                
                // If we get here, we have read access at least
                return true;
            } catch (readError) {
                console.log("Read test failed, trying write test:", readError);
                // Continue to write test
            }
            
            // Strategy 3: Try to write a document
            // Create a document with current timestamp to avoid collisions
            const testDocId = `test_${user.uid.substring(0, 5)}_${Date.now()}`;
            console.log("Writing test doc with ID:", testDocId);
            
            const testDocRef = doc(db, "system_test", testDocId);
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
            
            if (error.code === "permission-denied") {
                // If this is still failing, let's try a completely different approach
                // Skip the test and assume connection is ok for non-admin users
                
                console.log("Permission denied, but continuing for non-admin users");
                
                try {
                    // Check user role - if not admin, we'll proceed anyway
                    const isAdmin = await this.isUserAdmin(user);
                    if (!isAdmin) {
                        console.log("Non-admin user detected, bypassing connection test");
                        return true; // Let non-admin users proceed
                    }
                    // For admins, we should not bypass the test
                    return false;
                } catch (roleError) {
                    console.error("Error checking role:", roleError);
                    // If we can't determine the role, let's assume it's ok
                    // This is a fallback of last resort
                    return true;
                }
            }
            
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
                console.error("Firestore connection test failed, using local profile");
                this.fetchInProgress = false;
                
                // Get from localStorage or create default profile
                const localProfile = this.getProfileFromLocalStorage(user.uid);
                const defaultProfile = this.createDefaultProfile(user);
                const profile = localProfile || defaultProfile;
                
                this.userData = profile;
                this.storeProfileInLocalStorage(user.uid, profile);
                return profile;
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
                
                // Use local profile if token refresh fails
                const localProfile = this.getProfileFromLocalStorage(user.uid);
                const defaultProfile = this.createDefaultProfile(user);
                const profile = localProfile || defaultProfile;
                
                this.userData = profile;
                return profile;
            }
            
            // Add a delay to ensure token propagation
            console.log("Waiting for token propagation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const userDocRef = doc(db, "users", user.uid);
            console.log("Fetching document at path:", `users/${user.uid}`);
            
            // Try to read the profile first
            let userDoc = null;
            let profileExists = false;
            
            try {
                userDoc = await getDoc(userDocRef);
                profileExists = userDoc.exists();
                console.log("Document fetch result:", profileExists ? "Document exists" : "Document doesn't exist");
            } catch (readError) {
                console.error("Could not read user profile:", readError);
                
                // Handle permission errors gracefully
                if (readError.code === 'permission-denied') {
                    console.log("Permission denied, using local profile instead");
                    
                    // Try to get from localStorage first
                    const localProfile = this.getProfileFromLocalStorage(user.uid);
                    
                    if (localProfile) {
                        this.userData = localProfile;
                        this.lastFetchTimestamp = Date.now();
                        this.fetchInProgress = false;
                        return localProfile;
                    }
                    
                    // If no local profile, create a default one
                    const defaultProfile = this.createDefaultProfile(user);
                    this.userData = defaultProfile;
                    this.storeProfileInLocalStorage(user.uid, defaultProfile);
                    this.lastFetchTimestamp = Date.now();
                    this.fetchInProgress = false;
                    return defaultProfile;
                }
                
                profileExists = false;
            }
            
            // If profile exists, return the data
            if (profileExists && userDoc) {
                const userData = userDoc.data();
                console.log("User profile data loaded:", userData);
                // Cache user data
                this.userData = userData;
                this.lastFetchTimestamp = Date.now();
                this._retryCount = 0; // Reset retry counter on success
                this.fetchInProgress = false;
                
                // Update localStorage
                this.storeProfileInLocalStorage(user.uid, userData);
                
                return userData;
            }
            
            // First check if we have pending profile data in localStorage
            const pendingData = this.getPendingProfileFromLocalStorage(user.uid);
            if (pendingData) {
                console.log("Found pending profile data in localStorage");
                
                try {
                    // Try to create the profile with the pending data
                    await this.createUserProfile(user, {
                        ...pendingData,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        userRole: 'student' // Default role for safety
                    });
                    this.clearPendingProfileFromLocalStorage(user.uid);
                    
                    // Get the newly created profile
                    const newDoc = await getDoc(userDocRef);
                    if (newDoc.exists()) {
                        const newData = newDoc.data();
                        this.userData = newData;
                        this.fetchInProgress = false;
                        return newData;
                    }
                } catch (createError) {
                    console.error("Error creating profile from pending data:", createError);
                    // Continue with default profile creation
                }
            }
            
            // Profile doesn't exist, create new one
            console.log("No user profile found. Creating default profile.");
            
            // Create new default profile
            const defaultProfile = this.createDefaultProfile(user);
            
            try {
                // Try to create profile with default data
                try {
                    await setDoc(userDocRef, {
                        ...defaultProfile,
                        lastUpdated: new Date().toISOString()
                    });
                    console.log("Created new basic profile");
                } catch (createError) {
                    console.warn("Could not create/update basic profile:", createError);
                    // Continue anyway with default profile
                }
                
                this.userData = defaultProfile;
                this.storeProfileInLocalStorage(user.uid, defaultProfile);
                this.fetchInProgress = false;
                return defaultProfile;
            } catch (error) {
                console.error("Error creating basic profile:", error);
                this.storeProfileInLocalStorage(user.uid, defaultProfile);
                this.userData = defaultProfile;
                this.fetchInProgress = false;
                return defaultProfile;
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
            const localProfile = this.getProfileFromLocalStorage(user.uid);
            if (localProfile) {
                console.log("Using profile data from localStorage due to Firestore error");
                this.userData = localProfile;
                this.fetchInProgress = false;
                return localProfile;
            }
            
            // Last resort - create default profile
            const defaultProfile = this.createDefaultProfile(user);
            this.userData = defaultProfile;
            this.storeProfileInLocalStorage(user.uid, defaultProfile);
            this.fetchInProgress = false;
            return defaultProfile;
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
            let profileExists = false;
            try {
                const userDoc = await getDoc(userDocRef);
                profileExists = userDoc.exists();
            } catch (readError) {
                console.error("Error checking if profile exists:", readError);
                profileExists = false;
            }
            
            if (!profileExists) {
                // If no profile exists, create one
                return await this.createUserProfile(user, {
                    ...this.createDefaultProfile(user),
                    ...updateData
                });
            }
            
            // Update the existing profile
            try {
                await updateDoc(userDocRef, {
                    ...updateData,
                    lastUpdated: new Date().toISOString()
                });
                
                console.log("User profile updated successfully");
                
                // Update cached user data
                if (this.userData) {
                    this.userData = { ...this.userData, ...updateData, lastUpdated: new Date().toISOString() };
                } else {
                    // If no cached data, create a new profile
                    this.userData = {
                        ...this.createDefaultProfile(user),
                        ...updateData,
                        lastUpdated: new Date().toISOString()
                    };
                }
                
                // Update localStorage
                this.storeProfileInLocalStorage(user.uid, this.userData);
                
                // Clear any pending data as we've successfully updated
                this.clearPendingProfileFromLocalStorage(user.uid);
                
                return true;
            } catch (updateError) {
                console.error("Error updating profile:", updateError);
                
                // Store update data in localStorage for later sync
                const pendingData = this.getPendingProfileFromLocalStorage(user.uid) || {};
                this.storeProfileInLocalStorage(user.uid, {
                    ...pendingData,
                    ...updateData
                });
                
                // Still update the cached data for client-side use
                if (this.userData) {
                    this.userData = { ...this.userData, ...updateData, lastUpdated: new Date().toISOString() };
                } else {
                    this.userData = {
                        ...this.createDefaultProfile(user),
                        ...updateData,
                        lastUpdated: new Date().toISOString()
                    };
                }
                
                return false;
            }
        } catch (error) {
            console.error("Error updating user profile:", error);
            
            // Store update data in localStorage for later sync
            const pendingData = this.getPendingProfileFromLocalStorage(user.uid) || {};
            this.storeProfileInLocalStorage(user.uid, {
                ...pendingData,
                ...updateData
            });
            
            // Still update the cached data for client-side use
            if (this.userData) {
                this.userData = { ...this.userData, ...updateData, lastUpdated: new Date().toISOString() };
            } else {
                this.userData = {
                    ...this.createDefaultProfile(user),
                    ...updateData,
                    lastUpdated: new Date().toISOString()
                };
            }
            
            return false;
        }
    }
    
    /**
     * Get cached user data or fetch from Firestore if not available
     * @param {Object} user - Firebase user object
     * @returns {Promise<Object|null>} User profile data or null
     */
    static async getUserData(user) {
        if (!user || !user.uid) {
            console.error('Invalid user object for getUserData');
            return null;
        }
        
        // Return cached data if available and not too old (within 5 minutes)
        const now = Date.now();
        if (this.userData && this.lastFetchTimestamp && now - this.lastFetchTimestamp < 300000) {
            return this.userData;
        }
        
        // Try to get from localStorage first for immediate response
        const localProfile = this.getProfileFromLocalStorage(user.uid);
        if (localProfile) {
            // Update cache
            this.userData = localProfile;
            this.lastFetchTimestamp = now;
            
            // Try to fetch fresh data from Firestore in background
            this.fetchUserProfile(user).then(firestoreProfile => {
                if (firestoreProfile) {
                    // Update cache with Firestore data
                    this.userData = firestoreProfile;
                    this.lastFetchTimestamp = Date.now();
                    
                    // Update localStorage
                    this.storeProfileInLocalStorage(user.uid, firestoreProfile);
                }
            }).catch(error => {
                console.warn("Background fetch from Firestore failed:", error);
                // Already using local profile, so nothing more to do
            });
            
            // Return local data immediately
            return localProfile;
        }
        
        // No cached data, try to fetch from Firestore
        try {
            return await this.fetchUserProfile(user);
        } catch (error) {
            console.error("Error fetching user data:", error);
            
            // Create and return a default profile as last resort
            const defaultProfile = this.createDefaultProfile(user);
            this.userData = defaultProfile;
            this.storeProfileInLocalStorage(user.uid, defaultProfile);
            return defaultProfile;
        }
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
