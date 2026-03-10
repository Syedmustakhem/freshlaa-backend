const Campaign = require("../models/Campaign");

/* CREATE CAMPAIGN */

exports.createCampaign = async (req, res) => {
try {

const campaign = await Campaign.create(req.body);

res.json({
success:true,
message:"Campaign created",
campaign
});

} catch (err) {
res.status(500).json({
success:false,
message:err.message
});
}
};


/* GET ALL CAMPAIGNS */

exports.getCampaigns = async (req,res)=>{

try{

const campaigns=await Campaign.find()
.sort({createdAt:-1});

res.json({
success:true,
campaigns
});

}catch(err){

res.status(500).json({
success:false,
message:err.message
});

}

};


/* UPDATE CAMPAIGN */

exports.updateCampaign=async(req,res)=>{

try{

const campaign=await Campaign.findByIdAndUpdate(
req.params.id,
req.body,
{new:true}
);

res.json({
success:true,
campaign
});

}catch(err){

res.status(500).json({
success:false,
message:err.message
});

}

};


/* DELETE CAMPAIGN */

exports.deleteCampaign=async(req,res)=>{

try{

await Campaign.findByIdAndDelete(req.params.id);

res.json({
success:true,
message:"Campaign deleted"
});

}catch(err){

res.status(500).json({
success:false,
message:err.message
});

}

};


/* TOGGLE CAMPAIGN */

exports.toggleCampaign=async(req,res)=>{

try{

const campaign=await Campaign.findById(req.params.id);

campaign.isActive=!campaign.isActive;

await campaign.save();

res.json({
success:true,
campaign
});

}catch(err){

res.status(500).json({
success:false,
message:err.message
});

}

};