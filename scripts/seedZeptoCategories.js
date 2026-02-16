require("dotenv").config();
const mongoose = require("mongoose");

const CategorySection = require("../src/models/CategorySection");
const Category = require("../src/models/Category");

/* ================= SLUG HELPER ================= */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/* ================= MAIN FUNCTION ================= */
(async () => {
  try {
    /* ================= CONNECT ================= */
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    /* ================= CLEAN (Optional - Safe) ================= */
    await Category.deleteMany({});
    await CategorySection.deleteMany({});

    /* ================= SECTIONS ================= */
    const sectionsData = [
      {
        title: "Badam & Seeds",
        slug: "badam-seeds",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218096/WhatsApp_Image_2026-02-16_at_10.12.27_AM_ergpug.jpg",
        order: 1,
      },
      {
        title: "Oats & Honey",
        slug: "oats-honey",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967105/saffola_rhbxha.jpg",
        order: 2,
      },
      {
        title: "Home Made Masala Powders",
        slug: "home-made-masala-powders",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771217987/WhatsApp_Image_2026-02-16_at_10.12.24_AM_u3hbxg.jpg",
        order: 3,
      },
      {
        title: "Regular Rice",
        slug: "regular-rice",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769967369/regular_rice_o4idpp.jpg",
        order: 4,
      },
      {
        title: "Atta, Dal & Sugar",
        slug: "atta-dal-sugar",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218258/WhatsApp_Image_2026-02-16_at_10.12.25_AM2_mvo6er.jpg",
        order: 5,
      },
      {
        title: "Maggi & Noodles",
        slug: "maggi-noodles",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769963167/maggie_j6qf1g.jpg",
        order: 6,
      },
      {
        title: "Home Cleaning Products",
        slug: "home-cleaning-products",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771219422/WhatsApp_Image_2026-02-16_at_10.12.26_AM_dlkqic.jpg",
        order: 7,
      },
      {
        title: "Kitchen Tool Kit",
        slug: "kitchen-tool-kit",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218463/WhatsApp_Image_2026-02-16_at_10.37.07_AM_n6owus.jpg",
        order: 8,
      },
      {
        title: "Chocolates & Biscuits",
        slug: "chocolates-biscuits",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771218096/WhatsApp_Image_2026-02-16_at_10.12.26_AM_w6nuqu.jpg",
        order: 9,
      },
      {
        title: "Rythu & Angadi",
        slug: "rythu-angadi",
        image:
          "https://res.cloudinary.com/dxiujfq7i/image/upload/v1771233035/WhatsApp_Image_2026-02-16_at_2.40.04_PM_dvpgio.jpg",
        order: 10,
      },
    ];

    const sections = await CategorySection.insertMany(
      sectionsData.map((sec) => ({
        ...sec,
        columns: 3,
        isActive: true,
      }))
    );

    /* ================= SUB-CATEGORIES ================= */
    const SUB_CATEGORIES = {
      "Badam & Seeds": [
        "Badam & Cashew",
        "All Seeds",
        "Roasted Items",
        "Dry Berries",
        "Mixed Dryfruits",
      ],
      "Oats & Honey": [
        "Oats",
        "Honey",
        "Weight Loss",
        "Oats & Ragi Biscuits",
        "Honey Mix",
      ],
      "Home Made Masala Powders": [
        "Home made Masala Powders",
        "Masala Powders",
        "All Spices",
        "Spices Powder",
        "Biryani Items",
        "Kfc & More",
      ],
      "Regular Rice": ["Sona Masoori", "Basmati Rice", "Brown Rice"],
      "Atta, Dal & Sugar": [
        "Atta & Oil",
        "Sweet Essentials",
        "Dal & Pulses",
        "Olive Oil",
        "Grain & Nuts",
      ],
      "Maggi & Noodles": [
        "Pasta & Noodles",
        "Roasted Semiya",
        "Pickles",
        "Home-made Pickles",
        "Papad & Fryums",
      ],
      "Home Cleaning Products": [
        "Soaps",
        "Dishwash & Liquids",
        "Shampoo",
        "Floor Cleaners",
        "Clothes Detergent",
        "Hair Oil",
      ],
      "Kitchen Tool Kit": [
        "Kitchen Tools",
        "Brushes",
        "Food Boxes",
        "Bottles & Glasses",
        "Kitchen Clothes",
      ],
      "Chocolates & Biscuits": [
        "Chocolates",
        "Biscuits",
        "Sweet",
        "Hot Items",
        "Oats & Ragi Biscuits",
        "Dark Chocolate",
      ],
      "Rythu & Angadi": [
        "Urea",
        "Pesticides",
        "Nature",
        "Pure",
        "Fresh",
        "Natural",
        "Friendly",
        "Eco",
        "Normal",
      ],
    };

    /* ================= BUILD SUB CATEGORY LIST ================= */
    const categories = [];
    const slugSet = new Set();

    sections.forEach((section) => {
      const subs = SUB_CATEGORIES[section.title] || [];

      subs.forEach((name, index) => {
        const slug = slugify(`${section.slug}-${name}`);

        if (!slugSet.has(slug)) {
          slugSet.add(slug);

          categories.push({
            title: name.trim(),
            slug,
            parentSlug: section.slug,
            sectionId: section._id,
            order: index + 1,
            isActive: true,
          });
        } else {
          console.log("⚠️ Duplicate slug skipped:", slug);
        }
      });
    });

    /* ================= SAFE UPSERT ================= */
    const bulkOps = categories.map((cat) => ({
      updateOne: {
        filter: { slug: cat.slug },
        update: { $set: cat },
        upsert: true,
      },
    }));

    await Category.bulkWrite(bulkOps);

    console.log("🎉 Sections & Sub-Categories seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
})();