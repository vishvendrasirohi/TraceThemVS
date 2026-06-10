import { API_BASE } from "./sabpaisaConfig";

export async function createPaymentSession(amount, type, payerInfo) {
  const res = await fetch(`${API_BASE}/api/create-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      type,
      customerName:  payerInfo.name  || "User",
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
  // SabPaisa PG 3.0 sends: status, sabpaisaTxnId, clientTxnId
  // We also append: type, merchantTxnId (our own params in the returnUrl)
  const status = params.get("status");
  if (!status) return null;

  return {
    status,                                                              // SUCCESS | FAILED | ABORTED
    paymentId:    params.get("sabpaisaTxnId") || params.get("paymentId") || "",
    merchantTxnId: params.get("clientTxnId")  || params.get("merchantTxnId") || "",
    type:         params.get("type") || "reveal",
  };
}
