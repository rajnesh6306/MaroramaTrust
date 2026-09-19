const {
  generateTxnId,
  createPaymentData,
  verifyResponseHash,
  verifyPaymentAmount,
  PAYU_PAYMENT_URL,
} = require("./payuService");

const {
  PAYU_DONATION_SUCCESS_URL,
  PAYU_DONATION_FAILURE_URL,
} = require("../config/payuConfig");

const donationPaymentModel = require("../models/donationPaymentModel");
const store = require("../models/pendingDonationStore");

const {
  required,
  phone,
  email,
  positiveAmount,
} = require("../utils/validation");

const {
  generateDonationCertificate,
} = require("./donateCertificateService");

const {
  sendDonationCertificateEmail,
} = require("./donateEmailService");

// =========================================================
// VALIDATE DONATION
// =========================================================

function validateDonation(input) {
  const donorName =
    String(input.donorName || "").trim();

  const phoneNumber =
    String(input.phoneNumber || "").trim();

  const cleanEmail =
    String(input.email || "").trim();

  const amount =
    Number(input.amount);

  const paymentMode =
    String(input.paymentMode || "").trim();

  const message =
    String(input.message || "").trim();

  if (!required(donorName)) {
    throw new Error("Donor name is required.");
  }

  if (donorName.length > 100) {
    throw new Error(
      "Donor name cannot exceed 100 characters."
    );
  }

  if (!phone(phoneNumber)) {
    throw new Error(
      "Phone number must be 10 digits."
    );
  }

  if (!required(cleanEmail)) {
    throw new Error("Email is required.");
  }

  if (!email(cleanEmail)) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  if (!positiveAmount(amount)) {
    throw new Error(
      "Donation amount must be greater than 0."
    );
  }

  if (amount < 100) {
    throw new Error(
      "Minimum donation amount is ₹100."
    );
  }

  if (!required(paymentMode)) {
    throw new Error(
      "Payment mode is required."
    );
  }

  if (paymentMode === "Cash") {
    throw new Error(
      "Cash payment is not available through online PayU payment."
    );
  }

  return {
    donorName,
    phoneNumber,
    email: cleanEmail,
    amount,
    paymentMode,
    message,
  };
}

// =========================================================
// INITIATE DONATION
// =========================================================

function initiateDonation(input) {
  const donation =
    validateDonation(input);

  const txnid =
    generateTxnId();

  const paymentData =
    createPaymentData({
      txnid,

      amount:
        donation.amount.toFixed(2),

      firstname:
        donation.donorName,

      email:
        donation.email,

      phone:
        donation.phoneNumber,

      productinfo:
        "Donation",

      udf1:
        "DONATION",

      udf2:
        donation.paymentMode,

      udf3:
        donation.message,

      udf4:
        "",

      udf5:
        "",

      // IMPORTANT:
      // Donation gets separate PayU callbacks.
      surl:
        PAYU_DONATION_SUCCESS_URL,

      furl:
        PAYU_DONATION_FAILURE_URL,
    });

  store.setPending(txnid, {
    type:
      "DONATION",

    ...donation,

    txnid,

    createdAt:
      Date.now(),
  });

  store.cleanup();

  console.log("");
  console.log(
    "================================="
  );

  console.log(
    "💝 PAYU DONATION PAYMENT INITIATED"
  );

  console.log(
    "Transaction ID:",
    txnid
  );

  console.log(
    "Amount: ₹",
    donation.amount
  );

  console.log(
    "Success URL:",
    PAYU_DONATION_SUCCESS_URL
  );

  console.log(
    "Failure URL:",
    PAYU_DONATION_FAILURE_URL
  );

  console.log(
    "================================="
  );

  console.log("");

  return {
    paymentData,

    paymentUrl:
      PAYU_PAYMENT_URL,

    donation,
  };
}

// =========================================================
// PAYMENT SUCCESS
// =========================================================

async function processPaymentSuccess(data) {
  if (!data || !data.txnid) {
    throw new Error(
      "Transaction ID missing from PayU response."
    );
  }

  // -------------------------------------------------------
  // VERIFY PAYU HASH
  // -------------------------------------------------------

  if (!verifyResponseHash(data)) {
    return {
      error:
        "Payment verification failed. Please contact the Trust.",

      status:
        400,
    };
  }

  // -------------------------------------------------------
  // VERIFY PAYMENT STATUS
  // -------------------------------------------------------

  if (
    String(data.status || "")
      .toLowerCase() !== "success"
  ) {
    return {
      failure: true,
    };
  }

  // -------------------------------------------------------
  // GET PENDING DONATION
  // -------------------------------------------------------

  const pending =
    store.getPending(data.txnid);

  if (!pending) {
    return {
      error:
        "Donation transaction could not be verified.",

      status:
        400,
    };
  }

  // -------------------------------------------------------
  // VERIFY AMOUNT
  // -------------------------------------------------------

  if (
    !verifyPaymentAmount(
      data.amount,
      pending.amount
    )
  ) {
    return {
      error:
        "Payment amount verification failed.",

      status:
        400,
    };
  }

  // -------------------------------------------------------
  // VERIFY TRANSACTION ID
  // -------------------------------------------------------

  if (
    String(data.txnid) !==
    String(pending.txnid)
  ) {
    return {
      error:
        "Transaction verification failed.",

      status:
        400,
    };
  }

  // -------------------------------------------------------
  // VERIFY DONOR
  // -------------------------------------------------------

  const donorName =
    String(
      pending.donorName ||
      data.firstname ||
      ""
    ).trim();

  if (!donorName) {
    return {
      error:
        "Donor information could not be verified.",

      status:
        400,
    };
  }

  pending.donorName =
    donorName;

  // =======================================================
  // SAVE DONATION
  // =======================================================

  let savedDonation =
    await donationPaymentModel
      .findByTransactionId(data.txnid);

  if (!savedDonation) {
    savedDonation =
      await donationPaymentModel.create({
        ...pending,

        transactionId:
          data.txnid,

        payuPaymentId:
          data.mihpayid || "",

        amount:
          Number(data.amount),

        paymentStatus:
          "SUCCESS",

        paymentDate:
          new Date().toISOString(),
      });
  } else {
    console.log(
      "ℹ️ Donation already exists. Duplicate save skipped."
    );
  }

  // =======================================================
  // PREPARE DONATION DATA
  // =======================================================

  const donation = {
    ...pending,

    donorName,

    transactionId:
      data.txnid,

    payuPaymentId:
      data.mihpayid || "",

    amount:
      Number(data.amount),

    paymentStatus:
      "SUCCESS",
  };

  // =======================================================
  // GENERATE DONATION CERTIFICATE
  // =======================================================

  let certificatePath =
    null;

  let certificateNumber =
    null;

  try {
    const certificate =
      await generateDonationCertificate(
        donation
      );

    certificatePath =
      certificate.path ||
      certificate.filePath;

    certificateNumber =
      certificate.certificateNumber ||
      certificate.number ||
      null;

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "📜 DONATION CERTIFICATE GENERATED"
    );

    console.log(
      "Transaction ID:",
      data.txnid
    );

    console.log(
      "Certificate:",
      certificatePath
    );

    console.log(
      "Certificate Number:",
      certificateNumber
    );

    console.log(
      "================================="
    );

    console.log("");

  } catch (error) {
    console.error(
      "❌ Donation certificate generation failed:",
      error.message
    );

    /*
     * Payment is already verified and saved.
     * Certificate failure must not convert
     * a successful payment into a failed payment.
     */
  }

  // =======================================================
  // STORE CERTIFICATE FOR DOWNLOAD
  // =======================================================

  if (certificatePath) {
    store.setReceipt(
      data.txnid,
      {
        type:
          "DONATION",

        transactionId:
          data.txnid,

        certificatePath,

        certificateNumber,

        createdAt:
          Date.now(),
      }
    );
  }

  // =======================================================
  // EMAIL
  // =======================================================

  /*
   * IMPORTANT PERFORMANCE OPTIMIZATION:
   *
   * Do NOT await the email here.
   *
   * Gmail/Nodemailer network response can take time.
   * Payment has already been verified, donation saved,
   * and certificate generated at this point.
   *
   * Therefore email is sent in background so the user
   * does not have to wait for Gmail response.
   */

  let emailSent =
    false;

  if (
    certificatePath &&
    donation.email
  ) {
    emailSent = true;

    sendDonationCertificateEmail({
      donation,
      certificatePath,
    })
      .then(() => {
        console.log(
          "✅ Donation certificate email sent."
        );
      })
      .catch((error) => {
        console.error(
          "❌ Donation certificate email failed:",
          error.message
        );
      });
  }

  // =======================================================
  // DELETE PENDING DONATION
  // =======================================================

  store.deletePending(
    data.txnid
  );

  // =======================================================
  // FINAL RESULT
  // =======================================================

  return {
    donation,

    transactionId:
      data.txnid,

    paymentId:
      data.mihpayid || "",

    paymentMode:
      pending.paymentMode,

    emailSent,

    certificatePath,

    certificateNumber,

    savedDonation,
  };
}

// =========================================================
// PAYMENT FAILURE
// =========================================================

function processPaymentFailure(data) {
  const pending =
    data && data.txnid
      ? store.getPending(data.txnid)
      : null;

  if (
    data &&
    data.txnid
  ) {
    store.deletePending(
      data.txnid
    );
  }

  return {
    transactionId:
      data?.txnid ||
      "Not Available",

    errorMessage:
      data?.error_Message ||
      data?.error ||
      "Your donation payment could not be completed.",

    donation:
      pending || null,
  };
}

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  validateDonation,

  initiateDonation,

  processPaymentSuccess,

  processPaymentFailure,
};