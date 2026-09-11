const fs = require("fs");
const path = require("path");
const Donation = require("../models/donationModel");
const {
  generateTxnId,
  createPaymentData,
  verifyResponseHash,
  verifyPaymentAmount,
  PAYU_PAYMENT_URL,
} = require("./payuService");
const { generateDonationReceipt } = require("./donationReceiptService");
const { sendEmail } = require("./emailService");
const store = require("../models/pendingDonationStore");
const { dataDir } = require("../config/appConfig");
const { required, phone, email, positiveAmount } = require("../utils/validation");
const escapeHtml = require("../utils/escapeHtml");

const logoPath = path.join(__dirname, "..", "public", "images", "logo.jpeg");

function validateDonation(input) {
  const donorName = String(input.donorName || "").trim();
  const cleanPhone = String(input.phoneNumber || "").trim();
  const cleanEmail = String(input.email || "").trim();
  const amount = Number(input.amount);
  const causeForDonation = String(input.causeForDonation || "").trim();
  const paymentMode = String(input.paymentMode || "").trim();
  const message = String(input.message || "").trim();

  if (!required(donorName)) throw new Error("Donor name is required");
  if (!phone(cleanPhone)) throw new Error("Phone number must be 10 digits");
  if (!required(cleanEmail)) throw new Error("Email is required");
  if (!email(cleanEmail)) throw new Error("Please enter a valid email address");
  if (!positiveAmount(amount)) throw new Error("Amount must be greater than 0");
  if (!required(causeForDonation)) throw new Error("Cause for donation is required");
  if (!required(paymentMode)) throw new Error("Payment mode is required");
  if (paymentMode === "Cash") throw new Error("Cash payment is not available through online PayU payment");

  return { donorName, phoneNumber: cleanPhone, email: cleanEmail, amount, causeForDonation, paymentMode, message };
}

function initiateDonation(input) {
  const donation = validateDonation(input);
  const txnid = generateTxnId();
  const paymentData = createPaymentData({
    txnid,
    amount: donation.amount.toFixed(2),
    firstname: donation.donorName,
    email: donation.email,
    phone: donation.phoneNumber,
    productinfo: `Donation - ${donation.causeForDonation}`,
    udf1: donation.causeForDonation,
    udf2: donation.paymentMode,
    udf3: donation.message,
  });

  store.setPending(txnid, { ...donation, txnid, createdAt: Date.now() });
  store.cleanup();

  console.log("\n=================================");
  console.log("💳 PAYU PAYMENT INITIATED");
  console.log("Transaction:", txnid);
  console.log("Donor:", donation.donorName);
  console.log("Amount:", donation.amount);
  console.log("Email:", donation.email);
  console.log("=================================");

  return { paymentData, paymentUrl: PAYU_PAYMENT_URL, donation };
}

async function processPaymentSuccess(data) {
  if (!data || !data.txnid) throw new Error("Transaction ID missing from PayU response.");
  if (!verifyResponseHash(data)) return { error: "Payment verification failed. Please contact the Trust.", status: 400 };
  if (String(data.status || "").toLowerCase() !== "success") return { failure: true };

  let pending = store.getPending(data.txnid);
  if (!pending) pending = await Donation.findByTransactionId(data.txnid);
  if (!pending) return { error: "Transaction could not be verified.", status: 400 };

  if (!verifyPaymentAmount(data.amount, pending.amount)) return { error: "Payment amount verification failed.", status: 400 };
  if (String(data.txnid) !== String(pending.txnid)) return { error: "Transaction verification failed.", status: 400 };

  let savedPayment = await Donation.findByTransactionId(data.txnid);
  if (!savedPayment) {
    savedPayment = await Donation.create({ ...pending, txnid: data.txnid, mihpayid: data.mihpayid || "" });
    console.log("✅ Payment saved to payment.txt");
  } else {
    console.log("ℹ️ Payment already exists. Duplicate save skipped.");
  }

  const receiptData = {
    ...pending,
    txnid: data.txnid,
    mihpayid: data.mihpayid || "",
    paymentDate: new Date(),
  };
  const pdfBuffer = await generateDonationReceipt(receiptData);
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) throw new Error("Donation receipt PDF generation failed.");

  const fileName = `donation-receipt-${data.txnid}.pdf`;
  store.setReceipt(data.txnid, { pdfBuffer, fileName, createdAt: Date.now() });
  store.deletePending(data.txnid);

  sendDonationEmail(pending, data, pdfBuffer).catch((err) => console.error("⚠️ Donation email failed:", err.message));

  return {
    donation: pending,
    transactionId: data.txnid,
    paymentId: data.mihpayid || "",
    receiptUrl: `/donation/receipt/${encodeURIComponent(data.txnid)}`,
    savedPayment,
    emailSent: true,
  };
}

function processPaymentFailure(data) {
  const pending = data && data.txnid ? store.getPending(data.txnid) : null;
  if (data && data.txnid) store.deletePending(data.txnid);
  return {
    transactionId: data?.txnid || "Not Available",
    errorMessage: data?.error_Message || data?.error || "Your payment could not be completed.",
    donation: pending || null,
  };
}

async function getReceipt(transactionId) {
  store.cleanup();
  let receipt = store.getReceipt(transactionId);
  if (receipt) return receipt;

  const payment = await Donation.findByTransactionId(transactionId);
  if (!payment) throw Object.assign(new Error("Receipt not found for this transaction."), { status: 404 });
  if (String(payment.paymentStatus || "").toUpperCase() !== "SUCCESS") throw Object.assign(new Error("Receipt is not available for this payment."), { status: 404 });

  const pdfBuffer = await generateDonationReceipt({
    donorName: payment.donorName,
    phoneNumber: payment.phoneNumber,
    email: payment.email,
    amount: Number(payment.amount),
    causeForDonation: payment.causeForDonation,
    paymentMode: payment.paymentMode,
    message: payment.message || "",
    txnid: payment.txnid || payment.transactionId,
    mihpayid: payment.mihpayid || payment.payuPaymentId || "",
    paymentDate: payment.paymentDate || new Date(),
  });
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) throw new Error("Generated receipt PDF is invalid.");
  receipt = { pdfBuffer, fileName: `donation-receipt-${transactionId}.pdf`, createdAt: Date.now() };
  store.setReceipt(transactionId, receipt);
  return receipt;
}

async function sendDonationEmail(donation, payuData, pdfBuffer) {
  const fileName = `donation-receipt-${payuData.txnid}.pdf`;
  const attachments = [{ filename: fileName, content: pdfBuffer, contentType: "application/pdf" }];
  if (fs.existsSync(logoPath)) attachments.push({ filename: "manorama-logo.jpeg", path: logoPath, cid: "manorama-trust-logo" });

  await sendEmail({
    to: donation.email,
    replyTo: donation.email,
    subject: "Donation Receipt - Manorama Charitable Trust",
    text: `Dear ${donation.donorName},\n\nThank you for your generous contribution to Manorama Charitable Trust.\n\nDonation Amount: ₹${Number(donation.amount).toFixed(2)}\nTransaction ID: ${payuData.txnid}\nPayment ID: ${payuData.mihpayid || "N/A"}\nCause: ${donation.causeForDonation}\n\nYour official donation receipt is attached to this email as a PDF.\n\nRegards,\nManorama Charitable Trust`,
    html: createDonationEmailHtml(donation, payuData),
    attachments,
  });
}

function createDonationEmailHtml(donation, payuData) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Donation Confirmation</title></head><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f8"><tr><td align="center" style="padding:30px 15px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden"><tr><td align="center" style="padding:30px 20px;border-bottom:1px solid #eeeeee"><img src="cid:manorama-trust-logo" alt="Manorama Charitable Trust" width="110" style="display:block;width:110px;max-width:110px;height:auto;margin:0 auto 15px"><h2 style="margin:0 0 6px;font-size:22px;color:#222222">Manorama Charitable Trust</h2><p style="margin:0;font-size:14px;color:#777777">Donation Confirmation</p></td></tr><tr><td style="padding:30px 25px;color:#333333;font-size:15px;line-height:1.6"><p>Dear <strong>${escapeHtml(donation.donorName)}</strong>,</p><p>Thank you for your generous contribution to <strong>Manorama Charitable Trust</strong>.</p><p>Your donation has been successfully processed.</p><table width="100%" cellpadding="10" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:20px"><tr><td style="border-bottom:1px solid #eeeeee;font-weight:bold">Donation Amount</td><td align="right" style="border-bottom:1px solid #eeeeee">₹${Number(donation.amount).toFixed(2)}</td></tr><tr><td style="border-bottom:1px solid #eeeeee;font-weight:bold">Transaction ID</td><td align="right" style="border-bottom:1px solid #eeeeee;word-break:break-all">${escapeHtml(payuData.txnid)}</td></tr><tr><td style="border-bottom:1px solid #eeeeee;font-weight:bold">Payment ID</td><td align="right" style="border-bottom:1px solid #eeeeee;word-break:break-all">${escapeHtml(payuData.mihpayid || "N/A")}</td></tr><tr><td style="border-bottom:1px solid #eeeeee;font-weight:bold">Cause</td><td align="right" style="border-bottom:1px solid #eeeeee">${escapeHtml(donation.causeForDonation)}</td></tr><tr><td style="font-weight:bold">Payment Mode</td><td align="right">${escapeHtml(donation.paymentMode)}</td></tr></table><div style="margin-top:25px;padding:15px;background:#f5f8fb;border-radius:7px"><p style="margin:0;font-size:14px;color:#444444">📎 Your official donation receipt is attached to this email as a PDF.</p></div><p style="margin-top:25px">Please keep this receipt for your records.</p><p>Regards,<br><strong>Manorama Charitable Trust</strong></p></td></tr><tr><td align="center" style="padding:18px;background:#f4f4f4;font-size:12px;color:#777777">This is an automated donation confirmation.<br>Please do not reply to this automated email.</td></tr></table></td></tr></table></body></html>`;
}

module.exports = { validateDonation, initiateDonation, processPaymentSuccess, processPaymentFailure, getReceipt, sendDonationEmail };
