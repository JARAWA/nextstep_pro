// Firebase configuration and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
    getFirestore
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyC7tvZe9NeHRhYuTVrQnkaSG7Nkj3ZS40U",
    authDomain: "nextstep-log.firebaseapp.com",
    projectId: "nextstep-log",
    storageBucket: "nextstep-log.appspot.com", // Corrected storage bucket URL
    messagingSenderId: "9308831285",
    appId: "1:9308831285:web:d55ed6865804c50f743b7c",
    measurementId: "G-BPGP3TBN3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Test Firestore connection
async function testFirestoreConnection() {
    try {
        console.log("Testing Firestore connection...");
        
        // Importing needed functions here to avoid circular dependencies
        const { doc, setDoc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js");
        
        // Test if we can write to a test collection
        const testDocRef = doc(db, "system_test", "connection_test");
        await setDoc(testDocRef, {
            timestamp: new Date().toISOString(),
            test: "Connection test"
        });
        
        console.log("Firestore write test successful");
        
        // Test if we can read from the test collection
        const docSnap = await getDoc(testDocRef);
        if (docSnap.exists()) {
            console.log("Firestore read test successful:", docSnap.data());
            return true;
        } else {
            console.error("Firestore read test failed: Document not found");
            return false;
        }
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        return false;
    }
}

export { 
    app, 
    auth, 
    db, 
    googleProvider,
    testFirestoreConnection
};
