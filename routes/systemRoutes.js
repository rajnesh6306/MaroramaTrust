const router = require("express").Router();
const controller = require("../controllers/systemController");
router.get("/test-email", controller.testEmail);
module.exports = router;
