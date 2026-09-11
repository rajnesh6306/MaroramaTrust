const donationService = require("../services/donationService");

function showDonationForm(req, res) {
  return res.render("pages/donation");
}

function submitDonation(req, res) {
  try {
    const result = donationService.initiateDonation(req.body || {});
    return res.render("pages/payu-payment", result);
  } catch (error) {
    console.error("❌ Donation submission error:", error.message);
    return res
      .status(400)
      .render("pages/form-error", { message: error.message, backUrl: "/" });
  }
}

async function paymentSuccess(req, res) {
  try {
    const data = req.body || {};
    console.log("\n=================================");
    console.log("✅ PAYU PAYMENT SUCCESS");
    console.log("Transaction:", data.txnid);
    console.log("Amount:", data.amount);
    console.log("Status:", data.status);
    console.log("Email:", data.email);
    console.log("=================================");

    const result = await donationService.processPaymentSuccess(data);
    if (result.failure) return paymentFailure(req, res);
    if (result.error)
      return res
        .status(result.status || 400)
        .render("pages/form-error", { message: result.error, backUrl: "/" });

    return res.render("pages/donation-success", result);
  } catch (error) {
    console.error("❌ PAYMENT SUCCESS PROCESSING FAILED:", error.message);
    return res
      .status(500)
      .render("pages/form-error", {
        message:
          "Payment was received, but receipt processing failed. Please contact the Trust.",
        backUrl: "/",
      });
  }
}

function paymentFailure(req, res) {
  try {
    const result = donationService.processPaymentFailure(req.body || {});
    console.log("\n=================================");
    console.log("❌ PAYU PAYMENT FAILED");
    console.log("Transaction:", result.transactionId);
    console.log("Error:", result.errorMessage);
    console.log("=================================");
    return res.render("pages/donation-failure", result);
  } catch (error) {
    console.error("❌ Payment failure error:", error.message);
    return res
      .status(500)
      .render("pages/form-error", {
        message: "Payment failed. Please try again.",
        backUrl: "/",
      });
  }
}

async function downloadReceipt(req, res) {
  try {
    let transactionId = String(req.params.transactionId || "").trim();
    try {
      transactionId = decodeURIComponent(transactionId);
    } catch {
      return res.status(400).send("Invalid receipt URL.");
    }
    transactionId = transactionId
      .replace(/^donation-receipt-/i, "")
      .replace(/\.pdf$/i, "");
    if (!/^TXN_[A-Za-z0-9_-]+$/.test(transactionId))
      return res.status(400).send("Invalid transaction ID.");

    const receipt = await donationService.getReceipt(transactionId);
    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${receipt.fileName}"`,
    );
    res.setHeader("Content-Length", receipt.pdfBuffer.length);
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(receipt.pdfBuffer);
  } catch (error) {
    console.error("❌ RECEIPT DOWNLOAD FAILED:", error.message);
    if (!res.headersSent)
      return res
        .status(error.status || 500)
        .send(
          error.status === 404 ? error.message : "Unable to generate receipt.",
        );
  }
}

module.exports = {
  showDonationForm,
  submitDonation,
  paymentSuccess,
  paymentFailure,
  downloadReceipt,
};
