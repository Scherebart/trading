const path = require("path");
const express = require("express");
const { createSession } = require("better-sse");
const liveReload = require("livereload");
const connectLiveReload = require("connect-livereload");
const fetch = require("node-fetch")

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
    const { timestamp, candlesToLoad } = req.query;
    if (!candlesToLoad) {
      return res
        .status(400)
        .send("Bad Request: The length parameter must be given");
    }

    const brokerURL = "https://charts.finsatechnology.com/data/minute/67995/mid"
    const params = {
      l: candlesToLoad,
      ...(timestamp && { m: timestamp })
    }
    const getUrlString = brokerURL + '?' + new URLSearchParams(params)
    console.debug({ getUrlString })
    let brokerRes = null
    const brokerResStatuses = []
    let attemptsLeft = 10
    do {
      try {
        attemptsLeft -= 1
        brokerRes = await fetch(getUrlString)
        brokerResStatuses.push(brokerRes.status)
      } catch(e) {
        brokerRes = null
        brokerResStatuses. push(e.message)
      }
    } while((!brokerRes || !brokerRes.ok) && attemptsLeft > 0)
    if (!brokerRes || !brokerRes.ok) {
      console.error(`could not reach the broker data, statuses:\n${brokerResStatuses.join("\n")}`)
      return res.status(500).send()
    }
    console.log(`Reached the broker data with ${attemptsLeft} attempts left`)

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
    
    // remove the recent minute unfinished candle
    const timeNow = new Date()
    timeNow.setSeconds(0)
    timeNow.setMilliseconds(0)
    let i = 0
    if (candleSeries[i] && new Date(candleSeries[i].timestamp) >= timeNow) {
      i += 1
    }
    candleSeries.splice(0, i)

    const responseBody = { candleSeries }
    res.status(200).type("json").send(JSON.stringify(responseBody));
  });

  server.listen(8080, () =>
    console.log("The server is listening on port 8080 ...")
  );
})();
