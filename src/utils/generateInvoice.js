const PDFDocument=require("pdfkit");
const fs=require("fs");
const path=require("path");
const QRCode=require("qrcode");

module.exports=async function generateInvoice(order,user){

const fileName=`invoice-${order._id}.pdf`;

const filePath=path.join(
__dirname,
`../../invoices/${fileName}`
);

const logoPath=path.join(
__dirname,
"../assets/logo.png"
);

const doc=new PDFDocument({margin:40});

doc.pipe(fs.createWriteStream(filePath));

/* ================= HEADER ================= */

if(fs.existsSync(logoPath)){
doc.image(logoPath,40,40,{width:60});
}

doc.fontSize(24)
.text("Freshlaa",120,50);

doc.fontSize(12)
.text("Tax Invoice",{align:"right"});

doc.moveDown(2);


/* ================= ORDER INFO ================= */

doc.fontSize(12);

doc.text(`Order ID: ${order._id}`);
doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
doc.text(`Payment: ${order.paymentMethod}`);
doc.text(`Status: ${order.status}`);

doc.moveDown();


/* ================= CUSTOMER ================= */

doc.fontSize(14)
.text("Bill To:");

doc.fontSize(12);

doc.text(user.name || "Customer");

doc.text(user.phone);

if(order.address){

doc.text(order.address.line1 || "");

doc.text(order.address.city || "");

doc.text(order.address.pincode || "");

}

doc.moveDown();


/* ================= TABLE HEADER ================= */

doc.fontSize(12);

doc.text("Product",40,300);

doc.text("Qty",300,300);

doc.text("Price",350,300);

doc.text("Total",450,300);

doc.moveTo(40,320)
.lineTo(550,320)
.stroke();


/* ================= ITEMS ================= */

let y=340;

let subtotal=0;

order.items.forEach(item=>{

const total=item.qty*item.price;

subtotal+=total;

doc.text(item.name,40,y,{width:240});

doc.text(item.qty,300,y);

doc.text(`₹${item.price}`,350,y);

doc.text(`₹${total}`,450,y);

y+=25;

});


/* ================= TOTALS ================= */

doc.moveDown(4);

doc.text(
`Subtotal: ₹${subtotal}`,
{
align:"right"
}
);

doc.text(
`Delivery: ₹${order.breakdown?.deliveryFee || 0}`,
{
align:"right"
}
);

doc.text(
`Discount: ₹${order.breakdown?.discount || 0}`,
{
align:"right"
}
);


doc.moveDown();


doc.fontSize(16);

doc.text(
`Grand Total: ₹${order.total}`,
{
align:"right"
}
);


/* ================= QR CODE ================= */

const qrData=
`Order:${order._id}
Total:${order.total}
Freshlaa`;

const qrImage=await QRCode.toDataURL(qrData);

doc.image(
Buffer.from(
qrImage.replace(/^data:image\/png;base64,/,""),
"base64"
),
40,
650,
{width:100}
);


/* ================= FOOTER ================= */

doc.fontSize(10);

doc.text(
"Thank you for shopping with Freshlaa",
0,
750,
{align:"center"}
);

doc.end();

return `/invoices/${fileName}`;

};