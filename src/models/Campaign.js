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
enum:["CATEGORY","PRODUCT","GLOBAL","CART"],
required:true
},

/* DISCOUNT TYPE */

discountType:{
type:String,
enum:["PERCENT","FLAT","UNLOCK_PRODUCT"],
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