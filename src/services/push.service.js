const admin = require("../config/firebase");

async function sendPushNotification(token, title, body, imageUrl, data = {}) {

  const message = {
    token: token,

    notification: {
      title: title,
      body: body,
      image: imageUrl
    },

    android: {
      notification: {
        image: imageUrl,
        channelId: "default"
      }
    },

    data: {
      ...data
    }

  };

  return admin.messaging().send(message);
}

module.exports = {
  sendPushNotification
};