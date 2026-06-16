const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Use GOOGLE_APPLICATION_CREDENTIALS or gcloud login
process.env.GCLOUD_PROJECT = 'faa-test-guide-v2';
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'faa-test-guide-v2' });

const app = initializeApp({
  projectId: 'faa-test-guide-v2'
});

const db = getFirestore(app);

async function main() {
  try {
    const snap = await db.collection('users').get();
    console.log('Total users: ' + snap.size);
    snap.forEach(doc => {
      const d = doc.data();
      console.log(doc.id + ' | ' + (d.name || d.email || 'NO_NAME') + ' | role: ' + (d.role || 'NO_ROLE'));
    });
  } catch(e) {
    console.error('Error: ' + e.message);
    // Let's try checking the client-side firebase instead
    console.log('\nFallback: checking firebase.ts config...');
  }
  process.exit(0);
}

main();
