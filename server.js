const path = require("path");
const express = require("express");

const server = express();

server.use((req, res, next) => {
  console.log("getting a request..");
  console.log(req.originalUrl);
  console.log(req.url);
  next();
});

server.post("/chart", (req, res) => {
  console.log("getting a chart...");
  // res.send({ a: "some chart data" });
  res.sendFile(path.join(__dirname, "./chart-data-2023-02-13T16:40.json"));
});

server.listen(3000, () =>
  console.log("The server is listening on port 3000 ...")
);
