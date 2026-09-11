const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");

const adminAuth = require("../middleware/adminAuth");

// ========================================
// ADMIN LOGIN PAGE
// ========================================

router.get("/login", adminController.showLogin);

// ========================================
// ADMIN LOGIN
// ========================================

router.post("/login", adminController.login);

// ========================================
// ADMIN DASHBOARD
// ========================================

router.get("/dashboard", adminAuth, adminController.dashboard);

// ========================================
// ADMIN LOGOUT
// ========================================

router.post("/logout", adminAuth, adminController.logout);

module.exports = router;
