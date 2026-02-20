const AppConfig = require("../models/AppConfig");

exports.getConfig = async () => {
  let config = await AppConfig.findOne();
  if (!config) {
    config = await AppConfig.create({});
  }
  return config;
};