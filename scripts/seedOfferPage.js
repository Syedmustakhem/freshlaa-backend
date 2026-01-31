require("dotenv").config();
const mongoose = require("mongoose");
const OfferPage = require("../src/models/OfferPage");

mongoose.connect(process.env.MONGO_URI);

(async () => {
  try {
    await OfferPage.deleteMany();

    await OfferPage.create({
      slug: "maxxed-out-sale",
      title: "MAXXED OUT SALE",
      banner:
        "https://res.cloudinary.com/dxiujfq7i/image/upload/v1769449821/banner3_kwatkg.jpg",

      sections: [
        {
          title: "Limited time deals",
          products: [
            {
              title: "Safari Solid PP 105L Cabin Trolley",
              image:
                "https://res.cloudinary.com/.../trolley.png",
              price: 1500,
              mrp: 6660,
              discount: 77,
            },
            {
              title: "TIMEX Men's Round Dial Watch",
              image:
                "https://res.cloudinary.com/.../watch.png",
              price: 948,
              mrp: 1895,
              discount: 49,
            },
          ],
        },
      ],
    });

    console.log("✅ Offer page seeded");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
