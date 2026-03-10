const express = require("express");
const router = express.Router();

const {
createCampaign
} = require("../controllers/adminCampaign.controller");

router.post("/create",createCampaign);

module.exports = router;