// Script to check user roles via Firebase REST API
const apiKey = 'AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI';
const projectId = 'faa-test-guide-v2';

async function main() {
  // Sign in with email/password to get ID token
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@strike.eg',
        password: 'StrikeAdmin2026!',
        returnSecureToken: true
      })
    }
  );
  
  if (!signInRes.ok) {
    console.error('Sign-in failed:', await signInRes.text());
    process.exit(1);
  }
  
  const { idToken } = await signInRes.json();
  
  // Query users collection
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=50`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${idToken}` }
  });
  
  if (!res.ok) {
    console.error('Firestore query failed:', await res.text());
    process.exit(1);
  }
  
  const data = await res.json();
  
  if (!data.documents) {
    console.log('No documents found');
    process.exit(0);
  }
  
  data.documents.forEach(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || fields.email?.stringValue || 'NO_NAME';
    const role = fields.role?.stringValue || 'NO_ROLE';
    const email = fields.email?.stringValue || '';
    console.log(`${id} | ${name} | role: ${role} | email: ${email}`);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
