// Migration script to add allowJoin field to existing classrooms
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDaTd8HjylE4w21l0zqyJP2aBf52Frues4",
    authDomain: "improvewritingapp.firebaseapp.com",
    projectId: "improvewritingapp",
    storageBucket: "improvewritingapp.firebasestorage.app",
    messagingSenderId: "952876432551",
    appId: "1:952876432551:web:9a900b5c1f40c805b96f82",
    measurementId: "G-46P9LL4GXJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateClassrooms() {
    try {
        console.log('Starting classroom migration...');
        
        const classroomsRef = collection(db, 'classrooms');
        const snapshot = await getDocs(classroomsRef);
        
        let updateCount = 0;
        
        for (const docSnapshot of snapshot.docs) {
            const data = docSnapshot.data();
            
            // Check if allowJoin field is missing
            if (data.allowJoin === undefined) {
                console.log(`Updating classroom: ${data.className} (${docSnapshot.id})`);
                
                await updateDoc(doc(db, 'classrooms', docSnapshot.id), {
                    allowJoin: true,
                    maxStudents: data.maxStudents || 50,
                    isActive: data.isActive !== false // Default to true if not set
                });
                
                updateCount++;
            }
        }
        
        console.log(`Migration completed! Updated ${updateCount} classrooms.`);
        
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Run migration
migrateClassrooms();