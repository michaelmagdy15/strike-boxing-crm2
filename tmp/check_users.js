const admin = require('firebase-admin');
const fs = require('fs');
const svcKey = JSON.parse(fs.readFileSync('C:/Users/Mi5a/strike-boxing-crm2/functions/serviceAccountKey.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(svcKey) });
const db = admin.firestore();

async function check() {
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    console.log(doc.id + ' | ' + (d.name || d.email) + ' | role: ' + d.role);
  });
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
