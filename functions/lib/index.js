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
exports.metaWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin for Firestore access
admin.initializeApp();
const db = admin.firestore();
// -------------------------------------------------------------
// SECRETS & CONFIGURATION
// -------------------------------------------------------------
// You will need to set this token in the Meta Developer Portal
// when setting up your Webhook. Make sure it matches exactly!
const META_VERIFY_TOKEN = "strike_crm_secure_token_2026";
/**
 * Meta Webhook Endpoint
 * Handles verification (GET) and incoming leads (POST)
 */
exports.metaWebhook = (0, https_1.onRequest)(async (req, res) => {
    logger.info(`Received ${req.method} request`);
    // 1. WEBHOOK VERIFICATION (GET)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
            logger.info("Meta Webhook Verified Successfully!");
            res.status(200).send(challenge);
            return;
        }
        else {
            logger.warn("Meta Webhook Verification Failed: Token mismatch");
            res.sendStatus(403);
            return;
        }
    }
    // 2. INCOMING DATA (POST)
    if (req.method === "POST") {
        const body = req.body;
        logger.info("Incoming Webhook Body:", JSON.stringify(body));
        // Meta Lead Ads test usually sends object: 'page'
        if (body.object === "page" || body.object === "instagram" || body.object === "whatsapp_business_account") {
            for (const entry of body.entry) {
                // Log individual entry for debugging
                logger.info("Processing entry:", JSON.stringify(entry));
                // --- HANDLE INSTAGRAM / FACEBOOK LEAD ADS ---
                if (entry.changes && entry.changes[0].field === "leadgen") {
                    const leadgenId = entry.changes[0].value.leadgen_id;
                    logger.info(`Detected Leadgen Change. Lead ID: ${leadgenId}`);
                    await createLeadInCRM("Test Meta Lead", "000-000-0000", "Instagram");
                }
                // --- HANDLE MESSAGES ---
                if (entry.messaging || (entry.changes && entry.changes[0].field === "messages")) {
                    logger.info("Detected Message Event");
                    const source = body.object === "whatsapp_business_account" ? "WhatsApp" : "Instagram";
                    await createLeadInCRM("Test Message Lead", "000-000-0000", source);
                }
            }
            res.status(200).send("EVENT_RECEIVED");
        }
        else {
            logger.warn(`Unrecognized object type: ${body.object}`);
            res.sendStatus(404);
        }
    }
});
/**
 * Helper function to inject a Lead directly into Strike CRM's Firestore
 */
async function createLeadInCRM(name, phone, source) {
    try {
        const newClientRef = db.collection("clients").doc(); // Auto-generate ID
        // This matches the `Client` interface used in your frontend app
        const leadData = {
            name: name,
            phone: phone,
            status: "Lead",
            stage: "New",
            source: source,
            createdAt: new Date().toISOString(),
            lastContactDate: new Date().toISOString(),
        };
        await newClientRef.set(leadData);
        logger.info(`Successfully added Lead to CRM: ${name}`);
    }
    catch (error) {
        logger.error("Error creating Lead in CRM", error);
    }
}
//# sourceMappingURL=index.js.map