import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { cleanData } from '../utils';
import { Payment, Package } from '../types';
import { addAuditLog } from './auditService';

/**
 * Transaction Service: Handles member package upgrades and payments
 *
 * UPGRADE FLOW (Option A - Preferred):
 * 1. Member upgrade initiated from Members tab (Clients.tsx)
 * 2. Calls processPaymentTransaction with isUpgradePayment: true
 * 3. Creates payment record with isUpgradePayment flag
 * 4. Expires previous active package and creates new active package
 * 5. Uses batch write for atomicity to prevent race conditions
 *
 * MANUAL PAYMENT FLOW:
 * 1. Payment manually added from Payments tab (Payments.tsx)
 * 2. Calls processPaymentTransaction with isUpgradePayment: false (default)
 * 3. Validates that no active package exists for the same type (prevents duplicates)
 * 4. If validation fails, throws error - user must upgrade from Members tab or expire existing package
 *
 * KEY DIFFERENCES:
 * - isUpgradePayment=true: Skips duplicate validation (replaces existing package)
 * - isUpgradePayment=false: Validates no existing active package of same type
 *
 * PAYMENT FIELDS TRACKING:
 * - isUpgradePayment: Indicates if payment resulted from Members tab upgrade
 * - previousPackageName: Package being upgraded FROM (only set if isUpgradePayment=true)
 */

export interface PaymentTransactionParams {
  clientId: string;
  clientName: string;
  clientBranch?: string;
  clientStatus?: string;
  clientPackages?: any[];

  amount: number;
  method: Payment['method'];
  instapayRef?: string;

  packageType: string;
  packageCategory: 'Private Training' | 'Group Training';
  coachName?: string;
  notes?: string;

  sales_rep_id: string;
  salesName: string;
  recordedBy: string;
  recordedByName: string; // for the comment author

  paymentDate: string; // ISO
  startDate: string; // ISO
  endDate?: string; // ISO

  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  discountedAmount?: number;

  isMemberOnHold?: boolean;
  isUpgradePayment?: boolean; // True when payment is from Members tab upgrade (not manual Payments entry)
  systemPackage?: Package; // The matched package configuration, if any
  previousPackageName?: string;
}

export const processPaymentTransaction = async (params: PaymentTransactionParams): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Validation: Prevent duplicate active packages if not an upgrade payment
  if (!params.isUpgradePayment) {
    const existingActivePackage = (params.clientPackages || []).find(p => p.status === 'Active' && p.packageName === params.packageType);
    if (existingActivePackage) {
      throw new Error(`Member already has an active "${params.packageType}" package. Please expire or replace the existing package first.`);
    }
  }

  // 2. Payment Document
  const paymentRef = doc(collection(db, 'payments'));
  const paymentData: Partial<Payment> = {
    id: paymentRef.id,
    clientId: params.clientId,
    client_name: params.clientName,
    amount: params.amount,
    amount_paid: params.amount,
    method: params.method,
    date: params.paymentDate,
    instapayRef: params.instapayRef,
    packageType: params.packageType,
    package_category_type: params.packageCategory,
    coachName: params.coachName,
    notes: params.notes,
    recordedBy: params.recordedBy,
    salesName: params.salesName,
    sales_rep_id: params.sales_rep_id,
    branch: params.clientBranch || '',
    discountType: params.discountType,
    discountValue: params.discountValue,
    discountedAmount: params.discountedAmount,
    isUpgradePayment: params.isUpgradePayment || false,
    previousPackageName: params.previousPackageName,
    created_at: new Date().toISOString(),
    deleted_at: null
  };
  batch.set(paymentRef, cleanData(paymentData));

  // 2. Client Upgrade Logic
  const pkgStartDate = new Date(params.startDate);
  let resolvedEndDate = params.endDate;
  if (!resolvedEndDate && params.systemPackage) {
     const end = new Date(pkgStartDate);
     end.setDate(end.getDate() + params.systemPackage.expiryDays);
     resolvedEndDate = end.toISOString();
  }

  const updatedPkgs = (params.clientPackages || []).map(p =>
    p.status === 'Active' ? { ...p, status: 'Expired' } : p
  );

  let newClientPackage: any = {
    id: Math.random().toString(36).substr(2, 9),
    packageName: params.packageType,
    startDate: pkgStartDate.toISOString(),
    endDate: resolvedEndDate,
    status: 'Active'
  };

  const clientUpdate: any = {
    packageType: params.packageType,
    startDate: pkgStartDate.toISOString(),
    status: params.isMemberOnHold ? 'Hold' : 'Active',
    hasDiscount: !!params.discountType,
    lastContactDate: new Date().toISOString()
  };
  
  if (resolvedEndDate) {
    clientUpdate.membershipExpiry = resolvedEndDate;
  }

  if (params.systemPackage) {
    const isUnlimited = params.systemPackage.sessions === 0;
    const sessions = params.systemPackage.sessions;
    newClientPackage.sessionsTotal = isUnlimited ? 'unlimited' : sessions;
    newClientPackage.sessionsRemaining = isUnlimited ? 'unlimited' : sessions;
    clientUpdate.sessionsRemaining = isUnlimited ? 'unlimited' : sessions;
  }

  clientUpdate.packages = [...updatedPkgs, newClientPackage];

  // Only overwrite assignedTo when a specific rep was explicitly selected
  if (params.sales_rep_id) {
    clientUpdate.assignedTo = params.sales_rep_id;
  }
  if (params.salesName) {
    clientUpdate.salesName = params.salesName;
  }
  if (params.clientStatus === 'Lead') {
    clientUpdate.stage = 'Converted';
  }

  const clientRef = doc(db, 'clients', params.clientId);
  batch.update(clientRef, cleanData(clientUpdate));

  // 3. Comment Document
  const commentRef = doc(collection(db, 'clients', params.clientId, 'comments'));
  let commentMsg = '';
  if (params.previousPackageName) {
    commentMsg = `Package upgraded: "${params.previousPackageName}" → "${params.packageType}" starting ${pkgStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Amount collected: ${params.amount.toLocaleString()} LE.`;
  } else {
    commentMsg = `Payment recorded: "${params.packageType}" starting ${pkgStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Amount collected: ${params.amount.toLocaleString()} LE.`;
  }
  batch.set(commentRef, {
    text: commentMsg,
    date: new Date().toISOString(),
    author: params.recordedByName || 'System'
  });

  await batch.commit();

  // Log audit entry for payment creation/upgrade
  const logAction = params.isUpgradePayment ? 'UPDATE' : 'CREATE';
  const logDetails = params.isUpgradePayment
    ? `Upgraded "${params.previousPackageName}" → "${params.packageType}" for ${params.clientName} (+${params.amount.toLocaleString()} LE)`
    : `Recorded payment of ${params.amount.toLocaleString()} LE for ${params.clientName} (${params.packageType})`;

  await addAuditLog(logAction as 'CREATE' | 'UPDATE' | 'DELETE', 'PAYMENT', params.clientId, logDetails, params.recordedByName);
};
