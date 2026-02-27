const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = async function generateInvoice(order, user) {

const fileName = `invoice-${order._id}.pdf`;

/* ✅ SAFE FOLDER PATH */

const invoicesDir = path.join(process.cwd(), "invoices");

if (!fs.existsSync(invoicesDir)) {
fs.mkdirSync(invoicesDir);
}

/* ✅ FILE PATH */

const filePath = path.join(invoicesDir, fileName);

/* ✅ CREATE PDF */

const doc = new PDFDocument({ margin: 40 });

doc.pipe(fs.createWriteStream(filePath));

/* ================= HEADER ================= */

doc.fontSize(24).text("Freshlaa", { align: "center" });

doc.moveDown(0.5);

doc.fontSize(16).text("TAX INVOICE", { align: "center" });

doc.moveDown();


/* ================= ORDER INFO ================= */

doc.fontSize(12);

doc.text(`Order ID: ${order._id}`);
doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
doc.text(`Payment: ${order.paymentMethod}`);
doc.text(`Status: ${order.status}`);

doc.moveDown();


/* ================= CUSTOMER ================= */

doc.fontSize(14).text("Customer Details");

doc.moveDown(0.5);

doc.fontSize(12);

doc.text(user.name || "Customer");
doc.text(user.phone || "-");

doc.moveDown();


/* ================= ITEMS TABLE ================= */

doc.fontSize(14).text("Items");

doc.moveDown(0.5);

doc.fontSize(12);

order.items.forEach((item) => {

const total = item.qty * item.price;

doc.text(
`${item.name}`
);

doc.text(
`Qty: ${item.qty}   Price: ₹${item.price}   Total: ₹${total}`
);

if(item.variant?.label){
doc.text(`Variant: ${item.variant.label}`);
}

if(item.selectedAddons?.length){
doc.text("Addons:");

item.selectedAddons.forEach(a=>{
doc.text(`${a.name} ₹${a.price}`);
});
}

doc.moveDown();

});


/* ================= BILL ================= */

doc.text("--------------------------------");

doc.moveDown();

doc.fontSize(16).text(
`Grand Total: ₹${order.total}`,
{ align: "right" }
);

doc.moveDown(2);


/* ================= FOOTER ================= */

doc.fontSize(12).text(
"Thank you for shopping with Freshlaa ❤️",
{ align: "center" }
);

doc.end();

/* ✅ RETURN PUBLIC URL */

return `${process.env.SERVER_URL}/invoices/${fileName}`;

};