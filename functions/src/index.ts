import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin for Firestore access
admin.initializeApp();
const db = admin.firestore();

// -------------------------------------------------------------
// SECRETS & CONFIGURATION
// -------------------------------------------------------------
// Simple secret to ensure only your Zapier account can add leads.
// You can set this in Zapier Headers as: X-Strike-Secret
const STRIKE_WEBHOOK_SECRET = "strike_zapier_secret_2026";


/**
 * Generic Webhook Endpoint for Zapier / Make.com
 * Accepts a POST request with name, phone, email, and source.
 */
export const metaWebhook = onRequest(async (req: any, res: any) => {
  logger.info(`[${req.method}] Webhook triggered`);
  
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).send("Only POST is allowed");
    return;
  }

  try {
    const body = req.body;
    const secret = req.headers["x-strike-secret"];

    logger.info("Incoming Webhook Data:", JSON.stringify(body, null, 2));

    // Optional: Check secret if you want to be safe
    if (secret && secret !== STRIKE_WEBHOOK_SECRET) {
      logger.warn("Invalid secret received");
      res.status(401).send("Unauthorized");
      return;
    }

    const { name, phone, email, source } = body;

    if (!name) {
      logger.warn("Missing required field: name");
      res.status(400).send("Missing field: name");
      return;
    }

    // Inject into CRM
    await createLeadInCRM(
      name, 
      phone || "000-000-0000", 
      source || "Zapier", 
      email || ""
    );

    res.status(200).send({ status: "success", message: "Lead added to CRM" });

  } catch (err) {
    logger.error("Error processing webhook payload:", err);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});


/**
 * Helper function to inject a Lead directly into Strike CRM's Firestore
 */
async function createLeadInCRM(name: string, phone: string, source: string, email: string) {
  try {
    const newClientRef = db.collection("clients").doc();
    
    const leadData = {
      name: name,
      phone: phone,
      email: email,
      status: "Lead",
      stage: "New",
      source: source,
      createdAt: new Date().toISOString(),
      lastContactDate: new Date().toISOString(),
      notes: `Ingested via Zapier (${source})`
    };

    await newClientRef.set(leadData);
    logger.info(`Successfully added Lead to CRM: ${name} (${source})`);
  } catch (error) {
    logger.error("Error creating Lead in CRM:", error);
  }
}
