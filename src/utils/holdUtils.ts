import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Payment } from '../types';
import { addAuditLog } from '../services/auditService';

/**
 * Place a payment/package on hold
 */
export const holdPayment = async (
  paymentId: string,
  clientName: string,
  reason: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      isOnHold: true,
      holdReason: reason,
      holdDate: new Date().toISOString(),
      heldBy: userId,
    });

    await addAuditLog(
      'UPDATE',
      'PAYMENT',
      paymentId,
      `Placed on hold: "${reason}" for ${clientName}`,
      userName
    );
  } catch (error) {
    console.error('Error holding payment:', error);
    throw error;
  }
};

/**
 * Release a payment/package from hold
 */
export const releasePayment = async (
  paymentId: string,
  clientName: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      isOnHold: false,
      holdReason: undefined,
      holdDate: undefined,
      heldBy: undefined,
    });

    await addAuditLog(
      'UPDATE',
      'PAYMENT',
      paymentId,
      `Released from hold for ${clientName}`,
      userName
    );
  } catch (error) {
    console.error('Error releasing payment:', error);
    throw error;
  }
};

/**
 * Get hold status display info
 */
export const getHoldStatusInfo = (payment: Partial<Payment>) => {
  if (!payment.isOnHold) {
    return {
      isHeld: false,
      badgeColor: '',
      badgeLabel: '',
      tooltip: '',
    };
  }

  return {
    isHeld: true,
    badgeColor: 'bg-yellow-500',
    badgeLabel: 'HOLD',
    tooltip: payment.holdReason ? `Reason: ${payment.holdReason}` : 'On hold',
  };
};
