const mongoose = require("mongoose");

const popupModalSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  },
  type: { 
    type: String, 
    enum: ["announcement", "deal"], 
    default: "announcement" 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String,
    trim: true 
  },
  textColor: { 
    type: String, 
    default: "#ffffff" 
  },
  backgroundColor: { 
    type: String, 
    default: "#4f46e5" 
  },
  primaryBtnText: { 
    type: String, 
    default: "Explore Offer" 
  },
  redirectionType: { 
    type: String, 
    enum: ["product", "category", "offer", "none"], 
    default: "none" 
  },
  redirectionId: { 
    type: String, 
    default: "" 
  },
  dealProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }],
  dealStartingPrice: { 
    type: Number, 
    default: 9 
  },
  showOncePerUser: { 
    type: Boolean, 
    default: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Ensure only one modal can be active at any given time
popupModalSchema.pre("save", async function() {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isActive: false } }
    );
  }
});

popupModalSchema.pre("findOneAndUpdate", async function() {
  const update = this.getUpdate();
  if (update && (update.isActive === true || (update.$set && update.$set.isActive === true))) {
    const docId = this.getQuery()._id;
    await this.model.updateMany(
      { _id: { $ne: docId } },
      { $set: { isActive: false } }
    );
  }
});

module.exports = mongoose.model("PopupModal", popupModalSchema);
