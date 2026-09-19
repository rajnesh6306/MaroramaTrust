const { authenticateAdmin } = require("../services/adminAuthService");

const { readRecords } = require("../models/fileStore");


// ========================================
// SHOW ADMIN LOGIN
// ========================================

exports.showLogin = (req, res) => {
  if (req.session && req.session.isAdmin === true) {
    return res.redirect("/admin/dashboard");
  }

  return res.render("admin/login", {
    error: null,
  });
};


// ========================================
// ADMIN LOGIN
// ========================================

exports.login = async (req, res) => {
  try {
    const password = String(
      req.body.password || ""
    );

    if (!password) {
      return res.status(400).render(
        "admin/login",
        {
          error: "Password is required",
        }
      );
    }

    const result =
      await authenticateAdmin({
        password,
      });

    if (!result.success) {
      return res.status(401).render(
        "admin/login",
        {
          error: "Invalid admin password",
        }
      );
    }

    // ========================================
    // CREATE ADMIN SESSION
    // ========================================

    req.session.isAdmin = true;

    req.session.adminLoginTime =
      new Date().toISOString();

    return res.redirect(
      "/admin/dashboard"
    );

  } catch (error) {
    console.error(
      "❌ Admin login error:",
      error.message
    );

    return res.status(500).render(
      "admin/login",
      {
        error:
          "Unable to process login",
      }
    );
  }
};


// ========================================
// NORMALIZE MEMBERSHIP RECORD
// ========================================

function normalizeMembershipRecord(record) {
  const item = {
    ...record,
  };


  // ========================================
  // SINGLE MEMBER
  // ========================================

  item.memberName =
    String(
      item.memberName ||
      item.donorName ||
      (
        Array.isArray(item.memberNames)
          ? item.memberNames[0]
          : ""
      ) ||
      ""
    ).trim();


  // ========================================
  // AMOUNT
  // ========================================

  item.amount =
    Number(item.amount) || 0;


  // ========================================
  // MEMBERSHIP TYPE
  // ========================================

  item.membershipType =
    String(
      item.membershipType || ""
    ).trim();

  if (!item.membershipType) {
    item.membershipType =
      item.amount >= 11000
        ? "Lifetime Member"
        : "1 Year Member";
  }


  // ========================================
  // PAYMENT STATUS
  // ========================================

  item.paymentStatus =
    String(
      item.paymentStatus ||
      "SUCCESS"
    ).trim();


  // ========================================
  // PAYMENT MODE
  // ========================================

  item.paymentMode =
    String(
      item.paymentMode ||
      "Online"
    ).trim();


  // ========================================
  // PAYMENT DATE
  // ========================================

  item.paymentDate =
    item.paymentDate || null;


  // ========================================
  // DISPLAY DATE
  // ========================================

  if (item.paymentDate) {
    const date =
      new Date(item.paymentDate);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      item.displayDate =
        date.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );

      item.displayTime =
        date.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        );

      item.sortDate =
        date.getTime();

    } else {
      item.displayDate =
        String(item.paymentDate);

      item.displayTime = "";

      item.sortDate = 0;
    }

  } else {
    item.displayDate = "-";
    item.displayTime = "";
    item.sortDate = 0;
  }


  // ========================================
  // TRANSACTION ID
  // ========================================

  item.transactionId =
    String(
      item.transactionId ||
      item.txnid ||
      ""
    ).trim();


  // ========================================
  // PAYU PAYMENT ID
  // ========================================

  item.payuPaymentId =
    String(
      item.payuPaymentId ||
      item.mihpayid ||
      ""
    ).trim();


  return item;
}


// ========================================
// NORMALIZE DONATION RECORD
// ========================================

function normalizeDonationRecord(record) {
  const item = {
    ...record,
  };


  // ========================================
  // DONOR
  // ========================================

  item.donorName =
    String(
      item.donorName || ""
    ).trim();


  // ========================================
  // CONTACT
  // ========================================

  item.phoneNumber =
    String(
      item.phoneNumber || ""
    ).trim();

  item.email =
    String(
      item.email || ""
    ).trim();


  // ========================================
  // AMOUNT
  // ========================================

  item.amount =
    Number(item.amount) || 0;


  // ========================================
  // PAYMENT MODE
  // ========================================

  item.paymentMode =
    String(
      item.paymentMode ||
      "Online"
    ).trim();


  // ========================================
  // PAYMENT STATUS
  // ========================================

  item.paymentStatus =
    String(
      item.paymentStatus ||
      "SUCCESS"
    ).trim();


  // ========================================
  // MESSAGE
  // ========================================

  item.message =
    String(
      item.message || ""
    ).trim();


  // ========================================
  // TRANSACTION ID
  // ========================================

  item.transactionId =
    String(
      item.transactionId ||
      item.txnid ||
      ""
    ).trim();


  // ========================================
  // PAYU PAYMENT ID
  // ========================================

  item.payuPaymentId =
    String(
      item.payuPaymentId ||
      item.mihpayid ||
      ""
    ).trim();


  // ========================================
  // PAYMENT DATE
  // ========================================

  item.paymentDate =
    item.paymentDate || null;


  // ========================================
  // DISPLAY DATE
  // ========================================

  if (item.paymentDate) {
    const date =
      new Date(item.paymentDate);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      item.displayDate =
        date.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );

      item.displayTime =
        date.toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        );

      item.sortDate =
        date.getTime();

    } else {
      item.displayDate =
        String(item.paymentDate);

      item.displayTime = "";

      item.sortDate = 0;
    }

  } else {
    item.displayDate = "-";
    item.displayTime = "";
    item.sortDate = 0;
  }


  return item;
}


// ========================================
// ADMIN DASHBOARD
// ========================================

exports.dashboard = async (
  req,
  res,
  next
) => {

  try {

    // ========================================
    // READ MEMBERSHIP DATA
    // ========================================

    const paymentRecords =
      await readRecords(
        "payment.txt"
      );


    // ========================================
    // READ DONATION DATA
    // ========================================

    const donationRecords =
      await readRecords(
        "donations.txt"
      );


    // ========================================
    // READ MEDICAL DATA
    // ========================================

    const medicalRecords =
      await readRecords(
        "user.txt"
      );


    // ========================================
    // NORMALIZE MEMBERSHIPS
    // ========================================

    const memberships =
      paymentRecords
        .map(
          normalizeMembershipRecord
        )
        .sort(
          (a, b) =>
            (b.sortDate || 0) -
            (a.sortDate || 0)
        );


    // ========================================
    // NORMALIZE DONATIONS
    // ========================================

    const donations =
      donationRecords
        .map(
          normalizeDonationRecord
        )
        .sort(
          (a, b) =>
            (b.sortDate || 0) -
            (a.sortDate || 0)
        );


    // ========================================
    // SUCCESSFUL MEMBERSHIPS
    // ========================================

    const successfulMemberships =
      memberships.filter(
        (item) =>
          String(
            item.paymentStatus
          ).toUpperCase() ===
          "SUCCESS"
      );


    // ========================================
    // SUCCESSFUL DONATIONS
    // ========================================

    const successfulDonations =
      donations.filter(
        (item) =>
          String(
            item.paymentStatus
          ).toUpperCase() ===
          "SUCCESS"
      );


    // ========================================
    // MEMBERSHIP COUNT
    // ========================================

    const membershipCount =
      successfulMemberships.length;


    // ========================================
    // TOTAL MEMBERS
    // ========================================
    // Exactly one member per membership
    // transaction.

    const totalMembers =
      successfulMemberships.length;


    // ========================================
    // MEMBERSHIP COLLECTION
    // ========================================

    const membershipCollection =
      successfulMemberships.reduce(
        (total, item) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );


    // ========================================
    // LIFETIME MEMBERSHIPS
    // ========================================

    const lifetimeMemberships =
      successfulMemberships.filter(
        (item) =>
          String(
            item.membershipType
          ).toLowerCase() ===
          "lifetime member"
      );


    // ========================================
    // ONE YEAR MEMBERSHIPS
    // ========================================

    const oneYearMemberships =
      successfulMemberships.filter(
        (item) =>
          String(
            item.membershipType
          ).toLowerCase() ===
          "1 year member"
      );


    // ========================================
    // DONATION COUNT
    // ========================================

    const donationCount =
      successfulDonations.length;


    // ========================================
    // DONATION COLLECTION
    // ========================================

    const donationCollection =
      successfulDonations.reduce(
        (total, item) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );


    // ========================================
    // TOTAL COLLECTION
    // ========================================

    const totalCollection =
      membershipCollection +
      donationCollection;


    // ========================================
    // PAYMENT MODE STATISTICS
    // ========================================

    const membershipPaymentModeStats = {
      UPI: 0,
      Card: 0,
      "Net Banking": 0,
    };


    successfulMemberships.forEach(
      (membership) => {

        const mode =
          String(
            membership.paymentMode ||
            ""
          ).trim();

        if (
          Object.prototype.hasOwnProperty.call(
            membershipPaymentModeStats,
            mode
          )
        ) {
          membershipPaymentModeStats[
            mode
          ]++;
        }
      }
    );


    const donationPaymentModeStats = {
      UPI: 0,
      Card: 0,
      "Net Banking": 0,
    };


    successfulDonations.forEach(
      (donation) => {

        const mode =
          String(
            donation.paymentMode ||
            ""
          ).trim();

        if (
          Object.prototype.hasOwnProperty.call(
            donationPaymentModeStats,
            mode
          )
        ) {
          donationPaymentModeStats[
            mode
          ]++;
        }
      }
    );


    // ========================================
    // TODAY
    // ========================================

    const today =
      new Date();

    const todayDateString =
      today.toLocaleDateString(
        "en-IN"
      );


    // ========================================
    // TODAY'S MEMBERSHIPS
    // ========================================

    const todayMemberships =
      successfulMemberships.filter(
        (item) => {

          if (!item.paymentDate) {
            return false;
          }

          const date =
            new Date(
              item.paymentDate
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          return (
            date.toLocaleDateString(
              "en-IN"
            ) ===
            todayDateString
          );
        }
      );


    // ========================================
    // TODAY'S DONATIONS
    // ========================================

    const todayDonations =
      successfulDonations.filter(
        (item) => {

          if (!item.paymentDate) {
            return false;
          }

          const date =
            new Date(
              item.paymentDate
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          return (
            date.toLocaleDateString(
              "en-IN"
            ) ===
            todayDateString
          );
        }
      );


    // ========================================
    // TODAY'S MEMBERSHIP COLLECTION
    // ========================================

    const todayMembershipCollection =
      todayMemberships.reduce(
        (total, item) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );


    // ========================================
    // TODAY'S DONATION COLLECTION
    // ========================================

    const todayDonationCollection =
      todayDonations.reduce(
        (total, item) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );


    // ========================================
    // TODAY'S TOTAL COLLECTION
    // ========================================

    const todayCollection =
      todayMembershipCollection +
      todayDonationCollection;


    // ========================================
    // RECENT MEMBERSHIPS
    // ========================================

    const recentMemberships =
      successfulMemberships.slice(
        0,
        10
      );


    // ========================================
    // RECENT DONATIONS
    // ========================================

    const recentDonations =
      successfulDonations.slice(
        0,
        10
      );


    // ========================================
    // RENDER DASHBOARD
    // ========================================

    return res.render(
      "admin/dashboard",
      {

        // Membership
        memberships,

        recentMemberships,

        membershipCount,

        totalMembers,

        membershipCollection,

        lifetimeMemberships:
          lifetimeMemberships.length,

        oneYearMemberships:
          oneYearMemberships.length,


        // Donations
        donations,

        recentDonations,

        donationCount,

        donationCollection,


        // Combined
        totalCollection,


        // Today
        todayMemberships:
          todayMemberships.length,

        todayDonations:
          todayDonations.length,

        todayMembershipCollection,

        todayDonationCollection,

        todayCollection,


        // Payment modes
        membershipPaymentModeStats,

        donationPaymentModeStats,


        // Medical
        medicalRecords,

        medicalCount:
          medicalRecords.length,
      }
    );

  } catch (error) {

    console.error(
      "❌ Admin dashboard error:",
      error.message
    );

    return next(error);
  }
};


// ========================================
// ADMIN LOGOUT
// ========================================

exports.logout = (
  req,
  res
) => {

  req.session.destroy(
    (error) => {

      if (error) {

        console.error(
          "❌ Logout error:",
          error.message
        );

        return res
          .status(500)
          .send(
            "Unable to logout"
          );
      }

      res.clearCookie(
        "connect.sid"
      );

      return res.redirect(
        "/admin/login"
      );
    }
  );
};