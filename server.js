const path = require("path");
const express = require("express");
const { createSession } = require("better-sse");

const {
  retrieveChart,
  updateChart,
} = require("./backend.js");

const server = express();

server.get("/chart-updates", async (req, res) => {
  const session = await createSession(req, res);

  return session.iterate(updateChart(), { eventName: "chart-update" });
});

server.get("/chart", async (req, res) => {
  const { timestamp } = req.query;
  if (!timestamp) {
    return res.status(400).send("Bad Request: timestamp must be defined");
  }

  const chart = await retrieveChart(timestamp);
  res.status(200).type("json").send(JSON.stringify(chart));
});

server.listen(3000, () =>
  console.log("The server is listening on port 3000 ...")
);
