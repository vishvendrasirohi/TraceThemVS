import crypto from "crypto";

const {
  SP_MERCHANT_ID = "",
  SP_API_KEY = "",
  SP_SECRET_KEY = "",
  SP_ENV = "production",
  SP_RETURN_URL = "https://tracethem.online/payment/result",
} = process.env;

const ALLOWED_ORIGINS = [
  "https://tracethem.online",
  "https://www.tracethem.online",
  "http://localhost:5173",
];

const SABPAISA_API =
  SP_ENV === "production"
    ? "https://merchant-api.sabpaisa.in/api/v2/payments"
    : "https://staging-sb-merchant-api.sabpaisa.in/api/v2/payments";

function generateChecksum(merchantId, merchantTxnId, amount, currency, timestamp) {
  const base = `${merchantId}|${merchantTxnId}|${amount}|${currency}|${timestamp}`;
  return crypto
    .createHmac("sha256", SP_SECRET_KEY)
    .update(base, "utf8")
    .digest("hex")
    .toLowerCase();
}

function corsHeaders(req) {
  const origin = req.headers?.origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req, res) {
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amount, type, customerName, customerEmail, customerPhone } = req.body;

    if (!amount || !type) {
      return res.status(400).json({ error: "amount and type are required" });
    }

    const prefix = type === "reveal" ? "TRC" : "WIPE";
    const merchantTxnId = `${prefix}_${Date.now()}`;
    const amountPaise = Math.round(Number(amount) * 100);
    const currency = "INR";
    const timestamp = Math.floor(Date.now() / 1000);

    const checksum = generateChecksum(
      SP_MERCHANT_ID,
      merchantTxnId,
      amountPaise,
      currency,
      timestamp
    );

    const returnUrl = `${SP_RETURN_URL}?type=${type}&merchantTxnId=${merchantTxnId}`;

    const payload = {
      merchantId: SP_MERCHANT_ID,
      merchantTxnId,
      amount: amountPaise,
      currency,
      customerName: customerName || "User",
      customerEmail: customerEmail || "user@tracethem.online",
      customerPhone: customerPhone || "9999999999",
      returnUrl,
      checksum,
      timestamp,
    };

    const sabRes = await fetch(SABPAISA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": SP_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const sabData = await sabRes.json();

    if (!sabRes.ok || !sabData.checkoutUrl) {
      console.error("SabPaisa API error:", sabRes.status, sabData);
      return res.status(502).json({
        error: "Failed to create payment session",
        details: sabData,
      });
    }

    const checkoutUrl = sabData.clientSecret
      ? `${sabData.checkoutUrl}?clientSecret=${sabData.clientSecret}`
      : sabData.checkoutUrl;

    res.json({
      checkoutUrl,
      paymentId: sabData.paymentId,
      merchantTxnId,
    });
  } catch (err) {
    console.error("Payment session creation failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
