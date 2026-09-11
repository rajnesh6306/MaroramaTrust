const crypto = require("crypto");
const {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_SUCCESS_URL,
  PAYU_FAILURE_URL,
  PAYU_PAYMENT_URL,
} = require("../config/payuConfig");

function sha512(value) {
  return crypto.createHash("sha512").update(String(value), "utf8").digest("hex");
}

function generateTxnId() {
  return `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function generateHash({ txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "" }) {
  if (!PAYU_KEY) throw new Error("PAYU_KEY is missing in .env");
  if (!PAYU_SALT) throw new Error("PAYU_SALT is missing in .env");
  const hashString = `${PAYU_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${PAYU_SALT}`;
  return sha512(hashString);
}

function createPaymentData({ txnid, amount, firstname, email, phone, productinfo, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "" }) {
  if (!PAYU_KEY) throw new Error("PAYU_KEY is missing in .env");
  if (!PAYU_SALT) throw new Error("PAYU_SALT is missing in .env");
  if (!PAYU_SUCCESS_URL) throw new Error("PAYU_SUCCESS_URL is missing in .env");
  if (!PAYU_FAILURE_URL) throw new Error("PAYU_FAILURE_URL is missing in .env");

  return {
    key: PAYU_KEY, txnid, amount, productinfo, firstname, email, phone,
    udf1, udf2, udf3, udf4, udf5,
    surl: PAYU_SUCCESS_URL,
    furl: PAYU_FAILURE_URL,
    hash: generateHash({ txnid, amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5 }),
  };
}

function verifyResponseHash(data) {
  if (!PAYU_SALT) throw new Error("PAYU_SALT is missing in .env");
  if (!data) return false;
  const { status, key, txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", hash } = data;
  if (!status || !key || !txnid || !amount || !productinfo || !firstname || !email || !hash) return false;
  const reverseHashString = `${PAYU_SALT}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  return sha512(reverseHashString).toLowerCase() === String(hash).toLowerCase();
}

function verifyPayUKey(key) { return !!PAYU_KEY && !!key && String(key) === String(PAYU_KEY); }
function verifyPaymentAmount(receivedAmount, expectedAmount) {
  const received = Number(receivedAmount); const expected = Number(expectedAmount);
  return Number.isFinite(received) && Number.isFinite(expected) && received.toFixed(2) === expected.toFixed(2);
}

module.exports = { generateTxnId, generateHash, createPaymentData, verifyResponseHash, verifyPayUKey, verifyPaymentAmount, PAYU_PAYMENT_URL };
