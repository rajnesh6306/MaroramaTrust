const PAYU_KEY = process.env.PAYU_KEY;
const PAYU_SALT = process.env.PAYU_SALT;
const PAYU_ENV = String(process.env.PAYU_ENV || "test").toLowerCase();

const PAYU_PAYMENT_URL =
  PAYU_ENV === "production"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";

module.exports = {
  PAYU_KEY,
  PAYU_SALT,
  PAYU_ENV,
  PAYU_PAYMENT_URL,
  PAYU_SUCCESS_URL: process.env.PAYU_SUCCESS_URL,
  PAYU_FAILURE_URL: process.env.PAYU_FAILURE_URL,
};
