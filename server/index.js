import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const {
  SP_MERCHANT_ID = "YOUR_MERCHANT_ID",
  SP_API_KEY = "YOUR_API_KEY",
  SP_SECRET_KEY = "YOUR_SECRET_KEY",
  SP_ENV = "production",
  SP_RETURN_URL = "https://tracethem.online/payment/result",
  PORT = "3001",
} = process.env;

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

app.post("/api/create-payment", async (req, res) => {
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
});

const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(Number(PORT), () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
