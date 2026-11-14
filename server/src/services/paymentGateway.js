// Simulated payment gateway with webhook-style verification (port of the
// frontend paymentGateway.ts). An order is created, the gateway calls back with
// a signed payload, and the app VERIFIES the callback (signature + idempotency)
// before activating anything. In production, replace with a real gateway SDK +
// server-side webhook signature verification.

const simSign = (payload) => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
  }
  return `sig_${h1.toString(16)}${h2.toString(16)}`;
};

export const createOrder = (amount, method = 'UPI') => ({
  orderId: `ord_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
  amount,
  method,
  status: 'created',
});

export const simulateGatewayCallback = (order, outcome) => {
  const paymentId = `pay_${Math.random().toString(36).slice(2, 10)}`;
  return {
    orderId: order.orderId,
    paymentId,
    status: outcome,
    signature: simSign(`${order.orderId}|${paymentId}|${outcome}`),
    method: order.method,
  };
};

export const verifyCallback = (cb, processedPaymentIds) => {
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
};
