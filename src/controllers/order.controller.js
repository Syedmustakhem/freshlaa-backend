const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const sendPush = require("../utils/sendPush");
const { sendWhatsAppTemplate } = require("../services/whatsapp.service");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { calculateOrder } = require("../services/pricing.service");
const AdminPush = require("../models/AdminPush");
const webpush = require("web-push");
const checkoutService = require("../services/checkoutPayment.service");
const generateInvoice=require("../utils/generateInvoice");
const {sendWhatsAppDocument}=require("../services/whatsapp.service");
/* ================= ENV SAFETY ================= */

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay keys missing in env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

try {
  webpush.setVapidDetails(
    "mailto:support@freshlaa.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error("VAPID Config Error:", err.message);
}
/* ================= PREVIEW CHECKOUT ================= */
exports.previewCheckout = async (req, res) => {
  try {
    const { items, couponCode } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "No items provided",
      });
    }

    const result = await calculateOrder(
      items,
      null,            // no transaction session needed
      couponCode || null
    );

    res.json({
      success: true,
      ...result,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { items, address, paymentMethod, payment, couponCode } = req.body;

    if (!Array.isArray(items) || !items.length)
      throw new Error("No items in order");

    if (!address || typeof address !== "object")
      throw new Error("Address missing");

    const allowedMethods = ["COD", "ONLINE"];
    if (!allowedMethods.includes(paymentMethod || "COD"))
      throw new Error("Invalid payment method");

    const result = await calculateOrder(items, session, couponCode);
/* 🔥 SERVER-DRIVEN PAYMENT VALIDATION */
const methods = await checkoutService.getCheckoutPaymentOptions({
  userId: req.user._id,
  amount: result?.grandTotal || 0,
});

const selectedMethod = methods.find(
  (m) => m.id === (paymentMethod || "COD")
);

if (!selectedMethod || !selectedMethod.enabled) {
  throw new Error(
    selectedMethod?.reason || "Selected payment method not allowed"
  );
}
    let paymentStatus = "Pending";
    let razorpayData = null;

    if (paymentMethod === "ONLINE") {
      if (
        !payment?.razorpay_order_id ||
        !payment?.razorpay_payment_id ||
        !payment?.razorpay_signature
      ) {
        throw new Error("Payment data missing");
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(payment.razorpay_order_id + "|" + payment.razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== payment.razorpay_signature)
        throw new Error("Payment verification failed");

      paymentStatus = "Paid";
      razorpayData = payment;
    }

    // 🔥 ADD PRODUCT NAME + IMAGE

const formattedItems = await Promise.all(

  result.validatedItems.map(async (i) => {

    const product = await Product.findById(i.product).lean();

    return {

      product: i.product,

      name: product?.name || "Product",

      image: product?.image || "",

      qty: i.qty,

      price: i.price

    };

  })

);


const orderDoc = await Order.create(
  [{
    user: req.user._id,

    items: formattedItems,  // 🔥 FIXED

    address,

    paymentMethod: paymentMethod || "COD",

    paymentStatus,

    paymentDetails: razorpayData,

    total: result.grandTotal,

    breakdown: result,

    status: "Placed",
  }],
  { session }
);

    const order = orderDoc[0];

    await session.commitTransaction();
    session.endSession();

    const user = await User.findById(req.user._id).lean();

    if (global.io) {
      global.io.emit("new-order", {
        orderId: order._id.toString(),
        total: order.total,
      });
    }

    /* ADMIN PUSH */
    try {
      const subs = await AdminPush.find().select("subscription");
      const payload = JSON.stringify({
        title: "🛒 New Order",
        body: `₹${order.total} order placed`,
        data: { orderId: order._id.toString() },
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(s.subscription, payload);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await AdminPush.deleteOne({ _id: s._id });
          }
        }
      }
    } catch (err) {
      console.error("Admin Push Error:", err.message);
    }

    if (user?.expoPushToken) {
      sendPush({
        expoPushToken: user.expoPushToken,
        title: "Order Placed",
        body: `Your order of ₹${order.total} has been placed`,
        data: { orderId: order._id.toString() },
      });
    }

    if (user?.phone) {
      try {
        await sendWhatsAppTemplate(
          user.phone.replace("+", ""),
          "order_placed",
          [
            user.name || "Customer",
            "Freshlaa Grocery",
            order._id.toString(),
            `₹${order.total}`,
          ]
        );
      } catch (err) {
        console.error("WhatsApp Error:", err.message);
      }
    }

    res.status(201).json({ success: true, order });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(400).json({ success: false, message: error.message });
  }
};

/* ================= CANCEL ORDER ================= */
exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    if (order.status === "Cancelled")
      return res.status(400).json({ success: false, message: "Order already cancelled" });

    if (order.status === "Delivered")
      return res.status(400).json({ success: false, message: "Delivered order cannot be cancelled" });

    /* REFUND SAFETY */
    if (
      order.paymentMethod === "ONLINE" &&
      order.paymentStatus === "Paid" &&
      order.paymentDetails?.razorpay_payment_id
    ) {
      if (order.paymentStatus === "Refunded")
        throw new Error("Already refunded");

      const refund = await razorpay.payments.refund(
        order.paymentDetails.razorpay_payment_id,
        { amount: order.total * 100 }
      );

      order.paymentStatus = "Refunded";
      order.refundId = refund.id;
    }

    /* RESTORE STOCK */
    for (const item of order.items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) continue;

      if (item.variantId && product.variants?.length) {
        const variant = product.variants.id(item.variantId);
        if (variant) variant.stock += item.qty;
      } else {
        product.stock += item.qty;
      }

      await product.save({ session });
    }

    order.status = "Cancelled";
    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Order cancelled", order });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(500).json({ success: false, message: error.message });
  }
};

/* ================= GET ORDERS ================= */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Access denied" });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
/* ================= GET LAST ORDER ================= */
exports.getLastOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ================= GET ACTIVE ORDERS ================= */
exports.getActiveOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user._id,
      status: { $nin: ["Delivered", "Cancelled"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
/* ================= ADMIN UPDATE STATUS ================= */
exports.updateOrderStatus = async (req,res)=>{

try{

const {orderId,status}=req.body;

const allowedStatuses=[
"Placed",
"Packed",
"OutForDelivery",
"Delivered",
"Cancelled"
];

if(!allowedStatuses.includes(status))
return res.status(400).json({
success:false,
message:"Invalid status"
});

const order=await Order.findById(orderId)
.populate("user");

if(!order)
return res.status(404).json({
success:false,
message:"Order not found"
});


/* ✅ Prevent duplicate messages */

if(order.status===status){

return res.json({
success:true,
message:"Status already updated",
order
});

}


order.status=status;
await order.save();


/* ================= SOCKET ================= */

if(global.io){

global.io.emit("order-updated",{
orderId:order._id.toString(),
status
});

}


/* ================= EXPO PUSH (ALL STATUSES) ================= */

if(order.user?.expoPushToken){

await sendPush({

expoPushToken:order.user.expoPushToken,

title:"Order Update",

body:`Your order is ${status}`,

data:{orderId:order._id.toString()}

});

}


/* ================= WHATSAPP ================= */

const phone = order.user?.phone?.replace("+","");

if(phone){

try{

/* ✅ ORDER PLACED (4 VARIABLES) */

if(status==="Placed"){

await sendWhatsAppTemplate(
phone,
"order_placed",
[
order.user.name || "Customer",
"Freshlaa",
order._id.toString(),
`₹${order.total}`
]
);

}


/* ✅ ORDER CANCELLED (3 VARIABLES) */

if(status==="Cancelled"){

await sendWhatsAppTemplate(
phone,
"order_cancelled",
[
order.user.name || "Customer",
"Freshlaa",
order._id.toString()
]
);

}


/* ✅ ORDER DELIVERED (3 VARIABLES + PDF) */

if(status==="Delivered"){

const user=order.user;

await generateInvoice(order,user);

await sendWhatsAppTemplate(
phone,
"order_delivered",
[
user.name || "Customer",
order._id.toString(),
`₹${order.total}`
]
);

const invoiceUrl =
`https://api.freshlaa.com/invoices/invoice-${order._id}.pdf`;

await sendWhatsAppDocument(
phone,
invoiceUrl,
`Invoice-${order._id}.pdf`
);

console.log("✅ Invoice sent:",invoiceUrl);

}

}catch(err){

console.log("WhatsApp error:",err.message);

}

}


/* ================= RESPONSE ================= */

res.json({
success:true,
message:"Order updated",
order
});

}
catch(error){

res.status(500).json({
success:false,
message:error.message
});

}

};