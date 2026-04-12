/**
 * upload.controller.js
 * Handles file uploads for review photos.
 *
 * ── SETUP INSTRUCTIONS ──
 * 1. Install multer: npm install multer
 * 2. Copy this file to: freshlaa-backend/src/controllers/upload.controller.js
 * 3. Copy upload.routes.js to: freshlaa-backend/src/routes/upload.routes.js
 * 4. Add to app.js (see below)
 * 5. Create uploads directory: mkdir -p freshlaa-backend/uploads/reviews
 *
 * ── ADD TO app.js ──
 * After the existing route imports:
 *   const uploadRoutes = require(path.join(routesPath, "upload.routes"));
 *
 * After existing static file serving:
 *   app.use("/uploads", express.static(path.join(__dirname, "uploads")));
 *
 * In routes section:
 *   app.use("/api", uploadRoutes);
 */
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// ── Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, "../../uploads/reviews");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
// ── Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname) || ".jpg";
        cb(null, `review-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, WebP, and HEIC images are allowed"), false);
    }
};
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
// ── Upload single file
exports.uploadFile = [
    upload.single("file"),
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file uploaded" });
            }
            // Build public URL
            // Adjust the base URL to match your deployment
            const baseUrl = process.env.API_BASE_URL || "https://api.freshlaa.com";
            const url = `${baseUrl}/uploads/reviews/${req.file.filename}`;
            return res.json({
                success: true,
                url,
                filename: req.file.filename,
                size: req.file.size,
            });
        } catch (err) {
            console.error("❌ Upload error:", err.message);
            return res.status(500).json({ success: false, message: err.message });
        }
    },
];
// ── Multer error handler middleware
exports.handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ success: false, message: "File too large. Max 5MB" });
        }
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
};
