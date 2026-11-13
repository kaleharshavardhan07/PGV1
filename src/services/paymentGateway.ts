// Simulated payment gateway with webhook-style verification.
// Mirrors how a real gateway works: an order is created, the gateway calls back
// with a signed payload, and the app must VERIFY the callback (signature +
// idempotency) before activating anything. A success message on the frontend
// alone never activates a PG account.
//
// In production: replace initiatePayment/simulateCallback with the real
// gateway SDK and verifyCallback with server-side signature verification and
// webhook replay protection. The interface stays identical.

export interface PaymentOrder {
  orderId: string;
  amount: number;
  method: string;
  status: 'created' | 'paid' | 'failed';
}

export interface GatewayCallback {
  orderId: string;
  paymentId: string;
  status: 'success' | 'failure';
  signature: string;
  method: string;
}

export interface CallbackVerification {
  verified: boolean;
  duplicate: boolean;
  reason?: string;
}

/** Deterministic simulated signature (HMAC stand-in). */
const simSign = (payload: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return `sig_${h1.toString(16)}${h2.toString(16)}`;
};

export function createOrder(amount: number, method: string): PaymentOrder {
  return {
    orderId: `ord_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
    amount,
    method,
    status: 'created',
  };
}

export function simulateGatewayCallback(
  order: PaymentOrder,
  outcome: 'success' | 'failure'
): GatewayCallback {
  const paymentId = `pay_${Math.random().toString(36).slice(2, 10)}`;
  return {
    orderId: order.orderId,
    paymentId,
    status: outcome,
    signature: simSign(`${order.orderId}|${paymentId}|${outcome}`),
    method: order.method,
  };
}

/**
 * Verify a gateway callback before trusting it:
 * 1. Recompute the expected signature.
 * 2. Reject replayed callbacks (idempotency against already-processed ids).
 */
export function verifyCallback(
  cb: GatewayCallback,
  processedPaymentIds: string[]
): CallbackVerification {
  const expected = simSign(`${cb.orderId}|${cb.paymentId}|${cb.status}`);
  if (cb.signature !== expected) {
    return { verified: false, duplicate: false, reason: 'Invalid payment signature – callback rejected' };
  }
  if (processedPaymentIds.includes(cb.paymentId)) {
    return { verified: false, duplicate: true, reason: 'Duplicate payment callback ignored' };
  }
  if (cb.status !== 'success') {
    return { verified: false, duplicate: false, reason: 'Payment was not successful at the gateway' };
  }
  return { verified: true, duplicate: false };
}
