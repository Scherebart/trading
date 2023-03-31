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
    req.socket.on('close',function(){
      console.log('interrupted chart update via socket!')
    })
    req.connection.on('close',function(){
      console.log('interrupted chart update via connection!')
    })
    
    const session = await createSession(req, res);
    return session.iterate(mapAsyncIterable(updateChart(db), localDateToISO), {
      eventName: "chart-update",
    });
  });

  server.get("/api/chart", async (req, res) => {
    const { highDate, lowDate } = req.query;
    if (!highDate || !lowDate) {
      return res
        .status(400)
        .send("Bad Request: both endDate and startDate must be defined");
    }

    req.socket.on('close',function(){
      console.log('interrupted chart get via socket!')
    })
    req.connection.on('close',function(){
      console.log('interrupted chart get via connection!')
    })

    const chart = await loadChart(
      db,
      localDateFromISO(highDate),
      localDateFromISO(lowDate)
    );
    res.status(200).type("json").send(JSON.stringify(chart));
  });

  server.listen(8080, () =>
    console.log("The server is listening on port 8080 ...")
  );
})();
