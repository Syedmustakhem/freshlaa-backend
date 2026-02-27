/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   Freshlaa — Ultra-Premium Invoice Generator
 *   Inspired by Swiggy / Blinkit design language
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");
const QRCode      = require("qrcode");

// ─── BRAND TOKENS ──────────────────────────────────────────────────────────
const C = {
  orange:      "#FF6B00",
  orangeLight: "#FF8C38",
  orangeDark:  "#E55A00",
  orangeBg:    "#FFF4EC",
  dark:        "#1C1C1E",
  darkMid:     "#3A3A3C",
  mid:         "#636366",
  light:       "#AEAEB2",
  divider:     "#E5E5EA",
  surface:     "#F9F9FB",
  success:     "#34C759",
  successBg:   "#F0FDF4",
  white:       "#FFFFFF",
};

const PAGE = { w: 595.28, h: 841.89 };

// ─── HELPERS ───────────────────────────────────────────────────────────────

/**
 * Draw a rounded rectangle on a PDFKit doc.
 * PDFKit has doc.roundedRect() but this wrapper normalises fill/stroke handling.
 */
function roundedRect(doc, x, y, w, h, r, { fill, stroke, lineWidth = 0.5 } = {}) {
  doc.save();
  if (lineWidth) doc.lineWidth(lineWidth);
  const path = doc.roundedRect(x, y, w, h, r);
  if (fill && stroke) {
    doc.fillAndStroke(fill, stroke);
  } else if (fill) {
    doc.fillColor(fill).fill();
  } else if (stroke) {
    doc.strokeColor(stroke).stroke();
  }
  doc.restore();
}

/** Draw text clipped to a max width (no native ellipsis in PDFKit). */
function clippedText(doc, text, x, y, maxWidth, opts = {}) {
  // Measure approximate char width at current font size (rough but good enough)
  const fontSize = opts.fontSize || doc._fontSize || 10;
  const approxCharW = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / approxCharW);
  const display = text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text;
  doc.text(display, x, y, { lineBreak: false, ...opts });
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────

module.exports = async function generateInvoice(order, user) {
  // ── ensure output dir ────────────────────────────────────────────────────
  const outDir  = path.join(__dirname, "../../invoices");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileName = `invoice-${order._id}.pdf`;
  const filePath = path.join(outDir, fileName);

  // ── generate QR ─────────────────────────────────────────────────────────
  const qrText   = `freshlaa://order/${order._id}?total=${order.total}`;
  const qrBase64 = await QRCode.toDataURL(qrText, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 120,
    color: { dark: C.dark, light: "#FFFFFF00" },
  });
  const qrBuffer = Buffer.from(qrBase64.replace(/^data:image\/png;base64,/, ""), "base64");

  // ── init PDFKit ──────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title:    `Freshlaa Invoice – ${order._id}`,
      Author:   "Freshlaa Pvt. Ltd.",
      Creator:  "Freshlaa Invoice Engine v2",
    },
  });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const { w, h } = PAGE;

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  1.  HEADER                                                          ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const HEADER_H = 130;

  // Base orange fill
  doc.rect(0, 0, w, HEADER_H).fill(C.orange);

  // Decorative blobs (lighter circles, semi-transparent via opacity trick)
  doc.save().opacity(0.3)
    .circle(w - 55, 25, 85).fill(C.orangeLight)
    .circle(w - 25, 115, 55).fill(C.orangeLight);
  doc.restore();

  // ── Logo pill ─────────────────────────────────────────────────────────
  roundedRect(doc, 28, 28, 138, 46, 12, { fill: C.white });
  doc.fillColor(C.orange).font("Helvetica-Bold").fontSize(16).text("🥬 Freshlaa", 42, 43, { lineBreak: false });
  doc.fillColor(C.mid).font("Helvetica").fontSize(8).text("Fresh. Fast. Delivered.", 42, 62, { lineBreak: false });

  // ── Invoice title ─────────────────────────────────────────────────────
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(26)
     .text("TAX INVOICE", 0, 38, { align: "right", width: w - 30, lineBreak: false });

  // ── Status badge (DELIVERED) ─────────────────────────────────────────
  const statusLabel = order.status?.toUpperCase() || "DELIVERED";
  const statusColor = order.status === "cancelled" ? "#FF3B30" : C.success;
  roundedRect(doc, w - 122, 68, 92, 22, 11, { fill: statusColor });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9)
     .text(`✓  ${statusLabel}`, w - 122, 74, { width: 92, align: "center", lineBreak: false });

  // ── Order meta ───────────────────────────────────────────────────────
  doc.save().opacity(0.75)
     .fillColor(C.white).font("Helvetica").fontSize(9)
     .text(`Order #${order._id}`, 0, 96, { align: "right", width: w - 30, lineBreak: false })
     .text(new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), 0, 108, { align: "right", width: w - 30, lineBreak: false });
  doc.restore();

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  2.  INFO CARDS ROW                                                  ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const CARD_Y  = HEADER_H + 18;
  const CARD_H  = 70;
  const CARD_W  = (w - 68) / 3;
  const PADDING = 12;

  const cards = [
    {
      label: "BILL TO",
      lines: [
        user.name || "Customer",
        user.phone || "",
        user.email || "",
      ],
    },
    {
      label: "DELIVER TO",
      lines: [
        order.address?.line1 || "",
        order.address?.city  || "",
        order.address?.pincode ? `PIN ${order.address.pincode}` : "",
      ],
    },
    {
      label: "PAYMENT",
      lines: [
        order.paymentMethod || "Online",
        order.paymentStatus === "paid" ? "✓ Payment Confirmed" : "Pending",
        order.transactionId  ? `Txn: ${order.transactionId.slice(0, 16)}…` : "",
      ],
    },
  ];

  cards.forEach((card, i) => {
    const cx = 30 + i * (CARD_W + 4);
    roundedRect(doc, cx, CARD_Y, CARD_W, CARD_H, 10, { fill: C.surface, stroke: C.divider, lineWidth: 0.5 });

    doc.fillColor(C.orange).font("Helvetica-Bold").fontSize(7.5)
       .text(card.label, cx + PADDING, CARD_Y + 10, { lineBreak: false });

    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9.5)
       .text(card.lines[0] || " ", cx + PADDING, CARD_Y + 24, { lineBreak: false, width: CARD_W - PADDING * 2 });

    doc.fillColor(C.mid).font("Helvetica").fontSize(8.5);
    if (card.lines[1]) doc.text(card.lines[1], cx + PADDING, CARD_Y + 38, { lineBreak: false, width: CARD_W - PADDING * 2 });
    if (card.lines[2]) doc.text(card.lines[2], cx + PADDING, CARD_Y + 50, { lineBreak: false, width: CARD_W - PADDING * 2 });
  });

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  3.  ITEMS TABLE                                                     ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const TABLE_TOP = CARD_Y + CARD_H + 20;
  const COL       = { name: 30, qty: 295, price: 380, total: 495 };
  const ROW_H     = 32;
  const HDR_H     = 28;

  // Table header
  roundedRect(doc, 30, TABLE_TOP, w - 60, HDR_H, 8, { fill: C.dark });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8.5);
  doc.text("ITEM",       COL.name  + 16, TABLE_TOP + 9, { lineBreak: false });
  doc.text("QTY",        COL.qty,        TABLE_TOP + 9, { lineBreak: false });
  doc.text("UNIT PRICE", COL.price - 10, TABLE_TOP + 9, { lineBreak: false });
  doc.text("AMOUNT",     COL.total,      TABLE_TOP + 9, { lineBreak: false });

  // Rows
  let rowY    = TABLE_TOP + HDR_H;
  let subtotal = 0;

  order.items.forEach((item, idx) => {
    const lineTotal = item.qty * item.price;
    subtotal += lineTotal;

    // Alternating row
    doc.rect(30, rowY, w - 60, ROW_H).fill(idx % 2 === 0 ? C.white : C.surface);

    // Orange dot accent
    doc.circle(COL.name + 8, rowY + 16, 3).fill(C.orange);

    // Name
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(9.5);
    clippedText(doc, item.name, COL.name + 16, rowY + 11, 260);

    // Category label (use item.category if available)
    doc.fillColor(C.light).font("Helvetica").fontSize(7.5)
       .text(item.category || "Grocery", COL.name + 16, rowY + 22, { lineBreak: false });

    // Qty pill
    roundedRect(doc, COL.qty - 5, rowY + 9, 32, 14, 7, { fill: C.orangeBg });
    doc.fillColor(C.orangeDark).font("Helvetica-Bold").fontSize(8.5)
       .text(String(item.qty), COL.qty, rowY + 13, { width: 22, align: "center", lineBreak: false });

    // Unit price
    doc.fillColor(C.mid).font("Helvetica").fontSize(9)
       .text(`₹${item.price.toLocaleString("en-IN")}`, COL.price, rowY + 13, { lineBreak: false });

    // Line total
    doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(10)
       .text(`₹${lineTotal.toLocaleString("en-IN")}`, COL.total, rowY + 13, { lineBreak: false });

    rowY += ROW_H;
  });

  // Bottom border
  doc.moveTo(30, rowY).lineTo(w - 30, rowY).strokeColor(C.divider).lineWidth(1).stroke();

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  4.  TOTALS SECTION                                                  ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const TOTALS_X     = w - 230;
  const TOTALS_START = rowY + 14;

  const deliveryFee = order.breakdown?.deliveryFee || 0;
  const discount    = order.breakdown?.discount    || 0;
  const gst         = order.breakdown?.gst         || 0;

  function drawTotalRow(label, amount, y, { bold = false, color = C.mid } = {}) {
    doc.fillColor(C.mid).font("Helvetica").fontSize(9.5).text(label, TOTALS_X, y, { lineBreak: false });
    doc.fillColor(color).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5)
       .text(amount, TOTALS_X, y, { align: "right", width: w - 30 - TOTALS_X, lineBreak: false });
  }

  let ty = TOTALS_START;
  drawTotalRow("Subtotal",            `₹${subtotal.toLocaleString("en-IN")}`,         ty);
  ty += 16;
  drawTotalRow("Delivery Fee",        `₹${deliveryFee.toLocaleString("en-IN")}`,      ty);
  if (gst > 0) {
    ty += 16;
    drawTotalRow("GST / Taxes",       `₹${gst.toLocaleString("en-IN")}`,              ty);
  }
  if (discount > 0) {
    ty += 16;
    drawTotalRow("Promo Discount",    `–₹${discount.toLocaleString("en-IN")}`,        ty, { color: C.success });
  }

  // Thin divider
  ty += 12;
  doc.moveTo(TOTALS_X, ty).lineTo(w - 30, ty).strokeColor(C.divider).lineWidth(0.75).stroke();
  ty += 14;

  // Grand total pill
  roundedRect(doc, TOTALS_X - 10, ty, w - 30 - TOTALS_X + 10, 34, 10, { fill: C.orange });
  doc.fillColor(C.white).font("Helvetica").fontSize(9.5)
     .text("GRAND TOTAL", TOTALS_X, ty + 11, { lineBreak: false });
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(16)
     .text(`₹${order.total.toLocaleString("en-IN")}`, TOTALS_X, ty + 10, {
       align: "right", width: w - 36 - TOTALS_X, lineBreak: false,
     });

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  5.  QR CODE                                                         ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const QR_X = 30;
  const QR_Y = rowY + 14;
  const QR_W = 168;
  const QR_H = 80;

  roundedRect(doc, QR_X, QR_Y, QR_W, QR_H, 10, { fill: C.surface, stroke: C.divider, lineWidth: 0.5 });
  doc.image(qrBuffer, QR_X + 10, QR_Y + 10, { width: 58 });

  doc.fillColor(C.dark).font("Helvetica-Bold").fontSize(8)
     .text("Scan to verify order", QR_X + 76, QR_Y + 18, { lineBreak: false });
  doc.fillColor(C.mid).font("Helvetica").fontSize(7.5)
     .text(`#${order._id}`,        QR_X + 76, QR_Y + 30, { lineBreak: false })
     .text("Freshlaa verified receipt", QR_X + 76, QR_Y + 42, { lineBreak: false });

  // ╔═══════════════════════════════════════════════════════════════════════╗
  // ║  6.  FOOTER                                                          ║
  // ╚═══════════════════════════════════════════════════════════════════════╝
  const FOOTER_H = 48;
  // Orange accent line
  doc.moveTo(0, h - FOOTER_H - 2).lineTo(w, h - FOOTER_H - 2)
     .strokeColor(C.orange).lineWidth(2).stroke();

  // Dark footer bg
  doc.rect(0, h - FOOTER_H, w, FOOTER_H).fill(C.dark);

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(9)
     .text(
       "Thank you for choosing Freshlaa  ·  support@freshlaa.in  ·  1800-XXX-XXXX",
       0, h - FOOTER_H + 10,
       { align: "center", width: w, lineBreak: false }
     );
  doc.fillColor(C.light).font("Helvetica").fontSize(7.5)
     .text(
       "GSTIN: 03ABCDE1234F1Z5  ·  Freshlaa Pvt. Ltd.  ·  Ludhiana, Punjab 141001",
       0, h - FOOTER_H + 26,
       { align: "center", width: w, lineBreak: false }
     );

  // ── Finalise ─────────────────────────────────────────────────────────────
  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error",  reject);
  });

  return `/invoices/${fileName}`;
};