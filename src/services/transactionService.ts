import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { cleanData } from '../utils';
import { Payment, Package } from '../types';

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
  systemPackage?: Package; // The matched package configuration, if any
  previousPackageName?: string;
}

export const processPaymentTransaction = async (params: PaymentTransactionParams): Promise<void> => {
  const batch = writeBatch(db);

  // 1. Payment Document
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
};
