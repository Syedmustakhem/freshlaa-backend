const hour = Number(
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  })
);
console.log("Current calculated hour on server:", hour);
console.log("UTC time:", new Date().toISOString());
console.log("Local string:", new Date().toString());
process.exit(0);
