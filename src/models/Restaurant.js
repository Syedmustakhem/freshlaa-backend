import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Restaurant", restaurantSchema);
