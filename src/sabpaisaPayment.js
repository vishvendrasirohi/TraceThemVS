import { API_BASE } from "./sabpaisaConfig";

/**
 * Calls the backend to create a SabPaisa payment session and returns the
 * checkoutUrl that should be loaded inside an iframe.
 *
 * @param {number}  amount - Payment amount in INR (e.g. 79 or 1499)
 * @param {"reveal"|"wipe"} type
 * @param {{ name: string, email: string, phone: string }} payerInfo
 * @returns {Promise<{ checkoutUrl: string, paymentId: string, merchantTxnId: string }>}
 */
export async function createPaymentSession(amount, type, payerInfo) {
  const res = await fetch(`${API_BASE}/api/create-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      type,
      customerName: payerInfo.name || "User",
      customerEmail: payerInfo.email || "user@tracethem.online",
      customerPhone: payerInfo.phone || "9999999999",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create payment session");
  }

  return res.json();
}

/**
 * Reads payment result from the current URL query parameters.
 * Called on the returnUrl page after SabPaisa redirects back.
 *
 * @returns {{ status: string, merchantTxnId: string, paymentId: string, type: string } | null}
 */
export function readPaymentResult() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  if (!status) return null;

  return {
    status,
    merchantTxnId: params.get("merchantTxnId") || "",
    paymentId: params.get("paymentId") || "",
    type: params.get("type") || "reveal",
  };
}
