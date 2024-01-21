const path = require("path");
const express = require("express");
const { createSession } = require("better-sse");
const liveReload = require("livereload");
const connectLiveReload = require("connect-livereload");

const connectToDB = require("./connectToDB");
const { updateChart, loadChart } = require("./backendService.js");
const {
  mapAsyncIterable,
  localDateToISO,
  localDateFromISO,
} = require("./utils");

const liveReloadServer = liveReload.createServer();
liveReloadServer.watch(path.join(__dirname, "public"));
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

(async () => {
  const db = await connectToDB();
  const server = express();
  server.use(connectLiveReload());
  server.use(express.static(path.join(__dirname, "public")));

  server.get("/api/chart-updates", async (req, res) => {
    const session = await createSession(req, res);

    return session.iterate(mapAsyncIterable(updateChart(db), localDateToISO), {
      eventName: "chart-update",
    });
  });

  const parseAndLimitPrecision = (numberInText) =>
    Number.parseFloat(Number.parseFloat(numberInText).toFixed(2));

  server.get("/api/chart", async (req, res) => {
    const { highDate, length } = req.query;
    if (!highDate || !length) {
      return res
        .status(400)
        .send("Bad Request: both highDate and length parameters must be given");
    }

    const brokerURL = "https://charts.finsatechnology.com/data/minute/67995/mid"
    const params = {
      m: highDate,
      l: length
    }
    const getUrlString = brokerURL + '?' + new URLSearchParams(params)
    const brokerRes = await fetch(getUrlString)
    if (!brokerRes.ok) {
      console.error(`could not reach the broker data, status: ${res.status}`)
      return res.status(500)
    }

    const candleSeries = (await brokerRes.json()).data.map((candle) => {
      const [timestamp, O, H, L, C] = candle.split(",");

      return {
        timestamp: localDateToISO(new Date(timestamp).getTime()),
        O: parseAndLimitPrecision(O),
        H: parseAndLimitPrecision(H),
        L: parseAndLimitPrecision(L),
        C: parseAndLimitPrecision(C),
      };
    })
    res.status(200).type("json").send(JSON.stringify(candleSeries));
  });

  server.listen(8080, () =>
    console.log("The server is listening on port 8080 ...")
  );
})();
