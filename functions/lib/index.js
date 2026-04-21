"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onClientAssigned = exports.onLeadCreated = exports.metaWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const mailer_1 = require("./utils/mailer");
// Initialize Firebase Admin for Firestore access
admin.initializeApp();
const db = admin.firestore();
// -------------------------------------------------------------
// SECRETS & CONFIGURATION
// -------------------------------------------------------------
const STRIKE_WEBHOOK_SECRET = "strike_zapier_secret_2026";
/**
 * Generic Webhook Endpoint for Zapier / Make.com
 * Accepts a POST request with name, phone, email, and source.
 */
exports.metaWebhook = (0, https_1.onRequest)(async (req, res) => {
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
        await createLeadInCRM(name, phone || "000-000-0000", source || "Zapier", email || "");
        res.status(200).send({ status: "success", message: "Lead added to CRM" });
    }
    catch (err) {
        logger.error("Error processing webhook payload:", err);
        res.status(500).send({ status: "error", message: "Internal Server Error" });
    }
});
/**
 * Helper function to inject a Lead directly into Strike CRM's Firestore
 */
async function createLeadInCRM(name, phone, source, email) {
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
    }
    catch (error) {
        logger.error("Error creating Lead in CRM:", error);
    }
}
/**
 * Trigger: Notify on New Lead
 * Sends an email to all active sales reps (or a specific manager)
 */
exports.onLeadCreated = (0, firestore_1.onDocumentCreated)("clients/{clientId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const leadData = snapshot.data();
    // Only trigger for Leads
    if (leadData.status !== "Lead")
        return;
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
        const emailPromises = recipientEmails.map(email => (0, mailer_1.sendNewLeadEmail)(email, {
            name: leadData.name,
            phone: leadData.phone,
            source: leadData.source || "Unknown"
        }));
        await Promise.all(emailPromises);
        logger.info(`Lead notifications sent to ${recipientEmails.length} users.`);
    }
    catch (error) {
        logger.error("Error in onLeadCreated trigger:", error);
    }
});
/**
 * Trigger: Notify on Lead Assignment
 * Sends an email to the specifically assigned sales rep
 */
exports.onClientAssigned = (0, firestore_1.onDocumentUpdated)("clients/{clientId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    // Check if assignedTo has changed
    if (afterData.assignedTo && afterData.assignedTo !== beforeData.assignedTo) {
        logger.info(`Lead ${afterData.name} assigned to ${afterData.assignedTo}. Notifying...`);
        try {
            // 1. Get the assigned user's email
            const userDoc = await db.collection("users").doc(afterData.assignedTo).get();
            const userEmail = userDoc.data()?.email;
            if (userEmail) {
                await (0, mailer_1.sendAssignmentEmail)(userEmail, afterData.name);
                logger.info(`Assignment notification sent to ${userEmail}`);
            }
            else {
                // Check if assignedTo is a name (for sales members without accounts)
                // In that case, we can't send an email unless we have a mapping.
                logger.warn(`Could not find email for assigned user: ${afterData.assignedTo}`);
            }
        }
        catch (error) {
            logger.error("Error in onClientAssigned trigger:", error);
        }
    }
});
//# sourceMappingURL=index.js.map