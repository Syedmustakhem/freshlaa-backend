const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = async function generateInvoice(order,user){

const fileName=`invoice-${order._id}.pdf`;

const filePath=path.join(
__dirname,
`../invoices/${fileName}`
);

const doc=new PDFDocument({margin:40});

doc.pipe(fs.createWriteStream(filePath));


/* HEADER */

doc.fontSize(22).text("Freshlaa",{align:"center"});

doc.moveDown();

doc.fontSize(14).text("INVOICE");

doc.moveDown();


doc.text(`Order ID: ${order._id}`);

doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);

doc.text(`Payment: ${order.paymentMethod}`);

doc.moveDown();


/* CUSTOMER */

doc.text("Customer:");

doc.text(user.name || "Customer");

doc.text(user.phone);

doc.moveDown();


/* PRODUCTS */

doc.text("Items:");

doc.moveDown();


order.items.forEach(item=>{

doc.text(
`${item.name} | Qty:${item.qty} | ₹${item.price*item.qty}`
);

if(item.variant?.label){

doc.text(`Variant: ${item.variant.label}`);

}

});


doc.moveDown();


doc.text("--------------------------------");

doc.moveDown();


doc.fontSize(16).text(
`Grand Total: ₹${order.total}`
);


doc.moveDown();

doc.fontSize(12).text(
"Thank you for shopping with Freshlaa",
{align:"center"}
);

doc.end();

return `/invoices/${fileName}`;

};