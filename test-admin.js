import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { execSync } from 'child_process';

async function main() {
  try {
    console.log("Getting OAuth2 access token from gcloud...");
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
    console.log("Token retrieved successfully.");

    process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'faa-test-guide-v2';

    initializeApp({
      credential: {
        getAccessToken: () => ({
          access_token: token,
          expires_in: 3600
        })
      },
      projectId: 'faa-test-guide-v2'
    });
    console.log("Successfully initialized firebase-admin!");

    const auth = getAuth();
    const user = await auth.getUserByEmail('reviewer@strike.eg');
    console.log("Found user:", user.email, "UID:", user.uid);
  } catch (error) {
    console.error("Failed to authenticate or retrieve user:", error);
  }
}

main();
