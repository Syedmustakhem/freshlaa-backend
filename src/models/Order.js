const mongoose = require("mongoose");

/* ═══════════════════════════════════════════════════════════════
   SUB-SCHEMAS
═══════════════════════════════════════════════════════════════ */

// ── Address sub-schema — typed & validated instead of raw Object
const addressSchema = new mongoose.Schema(
  {
    type:       { type: String },               // Home / Work / Other
    name:       { type: String },               // Address label / person name
    street:     { type: String },
    area:       { type: String },
    city:       { type: String },
    state:      { type: String },
    pincode:    { type: String, required: true },
    lat:        { type: Number },
    lng:        { type: Number },
    landmark:   { type: String },
    phone:      { type: String },               // Contact at address
  },
  { _id: false }                                // Embedded — no separate _id needed
);

// ── Pricing breakdown — full audit trail of what was charged
const pricingSchema = new mongoose.Schema(
  {
    itemsTotal:       { type: Number, default: 0 },
    deliveryFee:      { type: Number, default: 0 },
    handlingFee:      { type: Number, default: 0 },
    codFee:           { type: Number, default: 0 }, // ✅ ADD THIS
    couponDiscount:   { type: Number, default: 0 },
    campaignDiscount: { type: Number, default: 0 },
    totalSavings:     { type: Number, default: 0 },
    grandTotal:       { type: Number, required: true },
  },
  { _id: false }
);

// ── Recipient sub-schema — for "order for someone else"
const recipientSchema = new mongoose.Schema(
  {
    name:  { type: String, trim: true },
    phone: { type: String, trim: true },
    note:  { type: String, trim: true, default: "" }, // gift message
  },
  { _id: false }
);

// ── Delivery instructions sub-schema
const deliveryInstructionsSchema = new mongoose.Schema(
  {
    tags: {
      type: [String],
      enum: ["leave_door", "call_me", "ring_bell", "hand_to_me", "no_contact"],
      default: [],
    },
    note:        { type: String, trim: true, default: "" },
    contactless: { type: Boolean, default: false },
  },
  { _id: false }
);

/* ═══════════════════════════════════════════════════════════════
   MAIN ORDER SCHEMA
═══════════════════════════════════════════════════════════════ */

const orderSchema = new mongoose.Schema(
  {
    /* ─────────────── USER ─────────────── */
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },

    /* ─────────────── ITEMS ─────────────── */
    items: [
      {
        productId: { type: String, required: true },
        name:      { type: String, required: true },

        // ✅ FIX 7: store both original and final price for full audit trail
        originalPrice: { type: Number, required: true },
        finalPrice:    { type: Number, required: true },

        image:    { type: String },
        qty:      { type: Number, required: true, min: 1 },

        itemModel: {
          type:    String,
          enum:    ["HotelMenuItem", "Product"],
          default: "Product",
        },

        // Campaign product flag
        isCampaignProduct: { type: Boolean, default: false },

        // Variant
        variant: {
          key:   String,
          label: String,
          price: Number,
        },

        // Hotel-specific
        selectedAddons: [
          {
            name:  String,
            price: Number,
          },
        ],

        customizations: {
          spiceLevel:           String,
          specialInstructions:  String,
        },

        hotelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref:  "Restaurant",
        },
      },
    ],

    /* ─────────────── DELIVERY ADDRESS ─────────────── */
    // ✅ FIX 4: typed sub-schema instead of raw Object
    address: {
      type:     addressSchema,
      required: true,
    },

    /* ─────────────── GIFT / SOMEONE ELSE ─────────────── */
    // ✅ FIX 1: new fields for "order for someone else" feature
    isGiftOrder: {
      type:    Boolean,
      default: false,
    },
// Add this field to orderSchema
orderId: {
  type:   String,
  unique: true,
  sparse: true,  // allows null for old orders without breaking unique index
  index:  true,
},
    recipient: {
      type:    recipientSchema,
      default: null,
    },

    /* ─────────────── DELIVERY INSTRUCTIONS ─────────────── */
    // ✅ FIX 1: new fields for delivery customisation feature
    deliveryInstructions: {
      type:    deliveryInstructionsSchema,
      default: () => ({}),
    },

    /* ─────────────── DELIVERY TIMING ─────────────── */
    // ✅ FIX 3: removed duplicate scheduledFor + isScheduled — one clear pattern
    deliveryType: {
      type:    String,
      enum:    ["instant", "scheduled"],
      default: "instant",
    },

    // ✅ FIX 2: added tomorrow slots to enum
    deliverySlot: {
      type: String,
      enum: [
        "30m",
        "1h",
        "5h",
        "12h",
        "1d",
        "tmr_morning",    // Tomorrow 8am–12pm
        "tmr_afternoon",  // Tomorrow 12pm–5pm
        "tmr_evening",    // Tomorrow 5pm–9pm
        null,
      ],
      default: null,
    },

    scheduledTime: {
      type:    Date,
      default: null,
    },

    /* ─────────────── PAYMENT ─────────────── */
    paymentMethod: {
      type:    String,
      enum:    ["COD", "ONLINE"],
      default: "COD",
    },

    paymentStatus: {
      type:    String,
      enum:    ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentDetails: {
      razorpay_order_id:   { type: String },
      razorpay_payment_id: { type: String },
      razorpay_signature:  { type: String },
    },

    /* ─────────────── COUPON ─────────────── */
    // ✅ FIX 6: store the coupon code that was applied
    couponCode: {
      type:    String,
      default: null,
      trim:    true,
    },
deliveryOTP: {
  type:    String,
  default: null,
},
 
otpVerified: {
  type:    Boolean,
  default: false,
},
 
otpGeneratedAt: {
  type:    Date,
  default: null,
},
 
otpFailedAttempts: {
  type:    Number,
  default: 0,
},
 
    /* ─────────────── PRICING BREAKDOWN ─────────────── */
    // ✅ FIX 5: full pricing breakdown for receipts and audits
    pricing: {
      type:     pricingSchema,
      required: true,
    },

    // Keep top-level total as well for quick queries / backwards compat
    total: {
      type:     Number,
      required: true,
    },

    /* ─────────────── REFUND ─────────────── */
    refundId: {
      type:    String,
      default: null,
    },

    refundStatus: {
      type:    String,
      enum:    ["None", "Initiated", "Processed", "Failed"],
      default: "None",
    },

    refundAmount: {
      type:    Number,
      default: 0,
    },

    /* ─────────────── ORDER STATUS ─────────────── */
    status: {
      type: String,
      enum: [
        "Placed",
        "Packed",
        "OutForDelivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Placed",
    },

    /* ─────────────── CANCELLATION ─────────────── */
    cancellationReason: {
      type:    String,
      default: null,
    },

    cancelledAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

/* ═══════════════════════════════════════════════════════════════
   INDEXES
═══════════════════════════════════════════════════════════════ */

orderSchema.index({ user: 1, createdAt: -1 });                          // user order history
orderSchema.index({ status: 1, createdAt: -1 });                        // ✅ FIX 8: admin/delivery dashboard
orderSchema.index({ "paymentDetails.razorpay_payment_id": 1 });         // payment lookup
orderSchema.index({ refundId: 1 });                                      // refund lookup
orderSchema.index({ isGiftOrder: 1 });                                   // gift order reports
orderSchema.index({ deliveryType: 1, scheduledTime: 1 });               // scheduled delivery queue

/* ═══════════════════════════════════════════════════════════════
   PRE-SAVE HOOK — keep total in sync with pricing.grandTotal
═══════════════════════════════════════════════════════════════ */

// ✅ FIXED — async version, no next() needed
orderSchema.pre("save", async function () {
  if (this.pricing?.grandTotal != null) {
    this.total = this.pricing.grandTotal;
  }
  if (this.recipient?.name && this.recipient?.phone) {
    this.isGiftOrder = true;
  }
  if (!this.isGiftOrder) {
    this.recipient = null;
  }
});

/* ═══════════════════════════════════════════════════════════════
   VIRTUAL — human-readable scheduled slot label
═══════════════════════════════════════════════════════════════ */

const SLOT_LABELS = {
  "30m":          "Deliver in 30 minutes",
  "1h":           "Deliver in 1 hour",
  "5h":           "Deliver in 5 hours",
  "12h":          "Deliver in 12 hours",
  "1d":           "Deliver tomorrow",
  "tmr_morning":  "Tomorrow Morning (8am–12pm)",
  "tmr_afternoon":"Tomorrow Afternoon (12pm–5pm)",
  "tmr_evening":  "Tomorrow Evening (5pm–9pm)",
};

orderSchema.virtual("deliverySlotLabel").get(function () {
  return this.deliverySlot ? (SLOT_LABELS[this.deliverySlot] ?? this.deliverySlot) : null;
});

module.exports = mongoose.model("Order", orderSchema);