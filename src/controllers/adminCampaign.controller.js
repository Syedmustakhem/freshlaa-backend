const Campaign = require("../models/Campaign");

exports.createCampaign = async (req,res)=>{

try{

const campaign = await Campaign.create(req.body);

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