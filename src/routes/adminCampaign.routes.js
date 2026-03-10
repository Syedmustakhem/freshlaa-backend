const express=require("express");
const router=express.Router();

const adminCampaign=require("../controllers/adminCampaign.controller");

/* CREATE */

router.post("/",adminCampaign.createCampaign);

/* LIST */

router.get("/",adminCampaign.getCampaigns);

/* UPDATE */

router.put("/:id",adminCampaign.updateCampaign);

/* DELETE */

router.delete("/:id",adminCampaign.deleteCampaign);

/* TOGGLE ACTIVE */

router.patch("/:id/toggle",adminCampaign.toggleCampaign);

module.exports=router;