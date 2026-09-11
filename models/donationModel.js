const { appendRecord, readFile } = require("./fileStore");
const { required, phone, positiveAmount } = require("../utils/validation");

const fields = ["donorName", "phoneNumber", "email", "amount", "causeForDonation", "paymentMode"];

async function create(data) {
  for (const field of fields) {
    if (!required(data[field])) throw new Error(`${field} is required`);
  }
  if (!phone(data.phoneNumber)) throw new Error("Phone number must be 10 digits");
  if (!positiveAmount(data.amount)) throw new Error("Amount must be greater than 0");

  return appendRecord("payment.txt", {
    type: "DONATION",
    paymentStatus: "SUCCESS",
    transactionId: String(data.txnid || "").trim(),
    payuPaymentId: String(data.mihpayid || "").trim(),
    donorName: String(data.donorName).trim(),
    phoneNumber: String(data.phoneNumber).trim(),
    email: String(data.email).trim(),
    amount: Number(data.amount),
    causeForDonation: String(data.causeForDonation).trim(),
    paymentMode: String(data.paymentMode).trim(),
    message: String(data.message || "").trim(),
    paymentDate: new Date().toISOString(),
  });
}

async function findByTransactionId(txnid) {
  const content = await readFile("payment.txt");
  if (!content) return null;

  // Support both the current tab-separated format and older JSON-block records.
  const target = String(txnid || "").trim();
  const lines = content.split(/\r?\n/).filter(Boolean);

  // Current fileStore format: header row followed by tab-separated rows.
  if (lines.length >= 2 && lines[0].includes("\t")) {
    const headers = lines[0].split("\t");
    for (const line of lines.slice(1)) {
      if (!line.includes("\t")) continue;
      const values = line.split("\t");
      const record = Object.fromEntries(headers.map((key, i) => [key, values[i] ?? ""]));
      const recordTxnId = record.transactionId || record.txnid;
      if (String(recordTxnId || "").trim() === target) {
        return {
          ...record,
          txnid: recordTxnId,
          mihpayid: record.payuPaymentId || record.mihpayid || "",
          paymentStatus: record.paymentStatus || "SUCCESS",
        };
      }
    }
  }

  // Backward compatibility for JSON-block records.
  const blocks = content.split(/\n\s*={5,}\s*\n/g);
  for (const block of blocks) {
    const jsonStart = block.indexOf("{");
    if (jsonStart === -1) continue;
    try {
      const record = JSON.parse(block.slice(jsonStart).trim());
      const recordTxnId = record.transactionId || record.txnid;
      if (String(recordTxnId || "").trim() === target) {
        return {
          ...record,
          txnid: recordTxnId,
          mihpayid: record.payuPaymentId || record.mihpayid || "",
          paymentStatus: record.paymentStatus || "SUCCESS",
        };
      }
    } catch (_) {}
  }

  return null;
}

module.exports = { create, findByTransactionId };
