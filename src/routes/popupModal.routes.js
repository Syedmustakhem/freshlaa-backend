const express = require("express");
const router = express.Router();
const PopupModal = require("../models/PopupModal");

// Safe auth middleware load
let protect = (req, res, next) => next();
let adminOnly = (req, res, next) => next();
try {
  const auth = require("../middleware/auth");
  if (auth.protect) protect = auth.protect;
  if (auth.adminOnly) adminOnly = auth.adminOnly;
  if (auth.isAdmin) adminOnly = auth.isAdmin;
} catch (e) {
  console.warn("⚠️  popupModal.routes: auth middleware not found");
}

// ── Public Endpoint ──────────────────────────────────────────
// Fetch current active popup modal (populates deal products with price details)
router.get("/popup-modal/active", async (req, res) => {
  try {
    const activeModal = await PopupModal.findOne({ isActive: true })
      .populate({
        path: "dealProducts",
        select: "_id name image price discountPrice stock unit description discountPercentage isOutOfStock"
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: activeModal
    });
  } catch (error) {
    console.error("❌ Error fetching active popup modal:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching popup modal."
    });
  }
});

// ── Admin Endpoints ──────────────────────────────────────────

// Fetch all popup modals
router.get("/admin/popup-modal/all", protect, adminOnly, async (req, res) => {
  try {
    const modals = await PopupModal.find()
      .populate("dealProducts", "name price discountPrice image")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: modals
    });
  } catch (error) {
    console.error("❌ Error fetching all popup modals:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});

// Create a popup modal
router.post("/admin/popup-modal", protect, adminOnly, async (req, res) => {
  try {
    const { 
      title, 
      type, 
      imageUrl, 
      description, 
      textColor, 
      backgroundColor, 
      primaryBtnText, 
      redirectionType, 
      redirectionId, 
      dealProducts, 
      dealStartingPrice, 
      showOncePerUser, 
      isActive 
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Title and Image URL are required."
      });
    }

    const modal = new PopupModal({
      title,
      type,
      imageUrl,
      description,
      textColor,
      backgroundColor,
      primaryBtnText,
      redirectionType,
      redirectionId,
      dealProducts,
      dealStartingPrice,
      showOncePerUser,
      isActive
    });

    await modal.save();

    return res.status(201).json({
      success: true,
      message: "Popup modal created successfully.",
      data: modal
    });
  } catch (error) {
    console.error("❌ Error creating popup modal:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error creating popup modal."
    });
  }
});

// Edit a popup modal
router.put("/admin/popup-modal/:id", protect, adminOnly, async (req, res) => {
  try {
    const { 
      title, 
      type, 
      imageUrl, 
      description, 
      textColor, 
      backgroundColor, 
      primaryBtnText, 
      redirectionType, 
      redirectionId, 
      dealProducts, 
      dealStartingPrice, 
      showOncePerUser, 
      isActive 
    } = req.body;

    const modal = await PopupModal.findById(req.params.id);
    if (!modal) {
      return res.status(404).json({
        success: false,
        message: "Popup modal not found."
      });
    }

    modal.title = title || modal.title;
    modal.type = type || modal.type;
    modal.imageUrl = imageUrl || modal.imageUrl;
    modal.description = description !== undefined ? description : modal.description;
    modal.textColor = textColor || modal.textColor;
    modal.backgroundColor = backgroundColor || modal.backgroundColor;
    modal.primaryBtnText = primaryBtnText || modal.primaryBtnText;
    modal.redirectionType = redirectionType || modal.redirectionType;
    modal.redirectionId = redirectionId !== undefined ? redirectionId : modal.redirectionId;
    modal.dealProducts = dealProducts || modal.dealProducts;
    modal.dealStartingPrice = dealStartingPrice !== undefined ? dealStartingPrice : modal.dealStartingPrice;
    modal.showOncePerUser = showOncePerUser !== undefined ? showOncePerUser : modal.showOncePerUser;
    modal.isActive = isActive !== undefined ? isActive : modal.isActive;

    await modal.save();

    return res.status(200).json({
      success: true,
      message: "Popup modal updated successfully.",
      data: modal
    });
  } catch (error) {
    console.error("❌ Error updating popup modal:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating popup modal."
    });
  }
});

// Toggle active status
router.patch("/admin/popup-modal/:id/toggle", protect, adminOnly, async (req, res) => {
  try {
    const modal = await PopupModal.findById(req.params.id);
    if (!modal) {
      return res.status(404).json({
        success: false,
        message: "Popup modal not found."
      });
    }

    modal.isActive = !modal.isActive;
    await modal.save();

    return res.status(200).json({
      success: true,
      message: `Popup modal ${modal.isActive ? "activated" : "deactivated"} successfully.`,
      data: modal
    });
  } catch (error) {
    console.error("❌ Error toggling popup modal status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});

// Delete a popup modal
router.delete("/admin/popup-modal/:id", protect, adminOnly, async (req, res) => {
  try {
    const modal = await PopupModal.findByIdAndDelete(req.params.id);
    if (!modal) {
      return res.status(404).json({
        success: false,
        message: "Popup modal not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Popup modal deleted successfully."
    });
  } catch (error) {
    console.error("❌ Error deleting popup modal:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
});

module.exports = router;
