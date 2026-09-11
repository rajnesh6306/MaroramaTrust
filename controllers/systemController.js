const { runEmailTest } = require("../services/systemService");
const { user } = require("../config/emailConfig");

async function testEmail(req, res) {
  try {
    await runEmailTest();
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Email Test</title></head><body><h1>✅ Email Sent Successfully</h1><p>Test email has been sent to:</p><strong>${user || "Not configured"}</strong><p>Please check your Gmail inbox.</p><br><a href="/">Go Back Home</a></body></html>`);
  } catch (error) {
    console.error("❌ Test email failed:", error.message);
    res.status(500).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Email Error</title></head><body><h1>❌ Email Failed</h1><p>${error.message}</p><br><a href="/">Go Back Home</a></body></html>`);
  }
}

module.exports = { testEmail };
