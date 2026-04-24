import { API_BASE } from "./sabpaisaConfig";

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
    throw new Error(err.error?.message || err.error || "Failed to create payment session");
  }

  return res.json();
}

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
