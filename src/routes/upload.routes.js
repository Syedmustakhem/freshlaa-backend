/**
 * upload.routes.js
 *
 * Copy to: freshlaa-backend/src/routes/upload.routes.js
 * Register in app.js: app.use("/api", uploadRoutes);
 */
const router = require("express").Router();
const ctrl = require("../controllers/upload.controller");
const auth = require("../middlewares/auth.middleware");
// No auth required — anyone can upload files during ordering/checkout
router.post("/upload", ctrl.uploadFile, ctrl.handleMulterError);
module.exports = router;
