import express from "express";
import Restaurant from "../models/Restaurant.js";

const router = express.Router();

/* GET STATUS */
router.get("/status/:id", async (req, res) => {
  const restaurant = await Restaurant.findById(req.params.id);
  res.json({ isOpen: restaurant?.isOpen ?? true });
});

/* UPDATE STATUS (ADMIN) */
router.put("/status/:id", async (req, res) => {
  await Restaurant.findByIdAndUpdate(req.params.id, {
    isOpen: req.body.isOpen,
  });
  res.json({ success: true });
});

export default router;
