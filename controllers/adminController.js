const { authenticateAdmin } = require("../services/adminAuthService");

const { readRecords } = require("../models/fileStore");

// ========================================
// SHOW ADMIN LOGIN
// ========================================

exports.showLogin = (req, res) => {
  if (req.session && req.session.isAdmin === true) {
    return res.redirect("/admin/dashboard");
  }

  res.render("admin/login", {
    error: null,
  });
};

// ========================================
// ADMIN LOGIN
// ========================================

exports.login = async (req, res) => {
  try {
    const password = String(req.body.password || "");

    if (!password) {
      return res.status(400).render("admin/login", {
        error: "Password is required",
      });
    }

    const result = await authenticateAdmin({
      password,
    });

    if (!result.success) {
      return res.status(401).render("admin/login", {
        error: "Invalid admin password",
      });
    }

    // ========================================
    // CREATE ADMIN SESSION
    // ========================================

    req.session.isAdmin = true;

    req.session.adminLoginTime = new Date().toISOString();

    return res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("❌ Admin login error:", error.message);

    return res.status(500).render("admin/login", {
      error: "Unable to process login",
    });
  }
};

// ========================================
// ADMIN DASHBOARD
// ========================================

exports.dashboard = async (req, res, next) => {
  try {
    // ========================================
    // READ + DECRYPT DONATION DATA
    // ========================================

    const donations = await readRecords("payment.txt");

    // ========================================
    // READ + DECRYPT MEDICAL DATA
    // ========================================

    const medicalRecords = await readRecords("user.txt");

    // ========================================
    // RENDER DASHBOARD
    // ========================================

    return res.render("admin/dashboard", {
      donations,

      medicalRecords,

      donationCount: donations.length,

      medicalCount: medicalRecords.length,
    });
  } catch (error) {
    console.error("❌ Admin dashboard error:", error.message);

    return next(error);
  }
};

// ========================================
// ADMIN LOGOUT
// ========================================

exports.logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("❌ Logout error:", error.message);

      return res.status(500).send("Unable to logout");
    }

    res.clearCookie("connect.sid");

    return res.redirect("/admin/login");
  });
};
