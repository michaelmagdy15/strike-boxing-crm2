import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { sendNewLeadEmail, sendAssignmentEmail } from "./utils/mailer";

// Initialize Firebase Admin for Firestore access
admin.initializeApp();
const db = admin.firestore();

// -------------------------------------------------------------
// SECRETS & CONFIGURATION
// -------------------------------------------------------------
const STRIKE_WEBHOOK_SECRET = defineSecret("STRIKE_WEBHOOK_SECRET");


/**
 * Generic Webhook Endpoint for Zapier / Make.com
 * Accepts a POST request with name, phone, email, and source.
 */
export const metaWebhook = onRequest({ secrets: [STRIKE_WEBHOOK_SECRET] }, async (req: any, res: any) => {
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

    // MANDATORY: Verify webhook secret — reject all unauthenticated requests
    if (!secret || secret !== STRIKE_WEBHOOK_SECRET.value()) {
      logger.warn("Missing or invalid webhook secret");
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

/**
 * Trigger: Notify on New Lead
 * Sends an email to all active sales reps (or a specific manager)
 */
export const onLeadCreated = onDocumentCreated("clients/{clientId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const leadData = snapshot.data();

  // Only trigger for Leads
  if (leadData.status !== "Lead") return;

  logger.info(`New Lead detected: ${leadData.name}. Sending notifications...`);

  try {
    // 1. Get all sales reps to notify (or a hardcoded list)
    // For now, let's fetch users with role 'rep' or 'manager'
    const usersSnapshot = await db.collection("users")
      .where("role", "in", ["rep", "manager", "admin", "super_admin", "crm_admin"])
      .get();
    
    const recipientEmails = usersSnapshot.docs
      .map(doc => doc.data().email)
      .filter(email => !!email);

    if (recipientEmails.length === 0) {
      logger.warn("No recipient emails found for lead notification.");
      return;
    }

    // 2. Send emails
    const emailPromises = recipientEmails.map(email => 
      sendNewLeadEmail(email, {
        name: leadData.name,
        phone: leadData.phone,
        source: leadData.source || "Unknown"
      })
    );

    await Promise.all(emailPromises);
    logger.info(`Lead notifications sent to ${recipientEmails.length} users.`);

  } catch (error) {
    logger.error("Error in onLeadCreated trigger:", error);
  }
});

/**
 * Trigger: Notify on Lead Assignment
 * Sends an email to the specifically assigned sales rep
 */
export const onClientAssigned = onDocumentUpdated("clients/{clientId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  // Check if assignedTo has changed
  if (afterData.assignedTo && afterData.assignedTo !== beforeData.assignedTo) {
    logger.info(`Lead ${afterData.name} assigned to ${afterData.assignedTo}. Notifying...`);

    try {
      // 1. Get the assigned user's email
      const userDoc = await db.collection("users").doc(afterData.assignedTo).get();
      const userEmail = userDoc.data()?.email;

      if (userEmail) {
        await sendAssignmentEmail(userEmail, afterData.name);
        logger.info(`Assignment notification sent to ${userEmail}`);
      } else {
        // Check if assignedTo is a name (for sales members without accounts)
        // In that case, we can't send an email unless we have a mapping.
        logger.warn(`Could not find email for assigned user: ${afterData.assignedTo}`);
      }
    } catch (error) {
      logger.error("Error in onClientAssigned trigger:", error);
    }
  }
});

/**
 * Trigger: Sync Payment Branch Edits to Client
 * When a payment's branch changes, mirrors that change to the linked client document.
 * NOTE: Sales rep assignment (Client.assignedTo) is intentionally NOT synced from
 * payment edits. Client assignment is managed exclusively via the Clients tab to
 * prevent payment-driven silent reassignments that bypass manager intent.
 */
export const onPaymentUpdated = onDocumentUpdated("payments/{paymentId}", async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();

  if (!beforeData || !afterData) return;

  const clientId = afterData.clientId;
  if (!clientId) return;

  const branchChanged = beforeData.branch !== afterData.branch;

  if (branchChanged) {
    logger.info(`Payment ${event.params.paymentId} branch changed. Syncing branch to Client ${clientId}...`);
    try {
      await db.collection("clients").doc(clientId).update({ branch: afterData.branch });
      logger.info(`Successfully synced branch to Client ${clientId}`);
    } catch (error) {
      logger.error(`Error syncing branch to Client ${clientId}:`, error);
    }
  }
});
