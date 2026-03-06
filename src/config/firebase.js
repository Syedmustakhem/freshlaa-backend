const admin = require("firebase-admin");
const serviceAccount = require("./freshlaa-firebase-adminsdk-fbsvc-08331eee7d.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;