const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
{
name:{
type:String,
required:true,
trim:true
},

/* CAMPAIGN TARGET */

type:{
type:String,
enum:["CATEGORY","PRODUCT","GLOBAL","CART","CART_PROGRESS"],
required:true
},

/* DISCOUNT TYPE */

discountType:{
type:String,
enum:["PERCENT","FLAT","UNLOCK_PRODUCT","FREE_DELIVERY"],
required:true
},

discountValue:{
type:Number,
default:0
},

/* CART CONDITION */

minCartValue:{
type:Number,
default:0
},

/* PROGRESS TIER */

tier:{
type:Number,
default:1
},

/* CATEGORY CAMPAIGN */

category:{
type:String,
default:null
},

/* PRODUCT CAMPAIGN */

productIds:[
{
type:mongoose.Schema.Types.ObjectId,
ref:"Product"
}
],

/* UNLOCK PRODUCT */

campaignProduct:{
type:mongoose.Schema.Types.ObjectId,
ref:"Product"
},

campaignPrice:{
type:Number,
default:0
},

/* CAMPAIGN PRIORITY */

priority:{
type:Number,
default:1
},

/* LOCATION TARGETING */

locations:[
{
type:String
}
],

/* USER TARGETING */

userType:{
type:String,
enum:["ALL","NEW_USER","RETURNING"],
default:"ALL"
},

/* DATE CONTROL */

startDate:{
type:Date,
required:true
},

endDate:{
type:Date,
required:true
},

isActive:{
type:Boolean,
default:true
}

},
{timestamps:true}
);

module.exports = mongoose.model("Campaign",campaignSchema);