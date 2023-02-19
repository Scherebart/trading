const axios = require("axios");
const { writeFile, readFile, access } = require("node:fs/promises");

function getChartURL(timestamp) {
  return `https://charts.finsa.com.au/data/minute/67995/mid?l=30&m=${timestamp}`;
}

function getChartFilePath(timestamp) {
  return `charts/chart-${timestamp}.json`;
}

async function getRetrievedChart(timestamp) {
  const chartFilePath = getChartFilePath(timestamp);
  let chartIsRetrieved = false;
  try {
    await access(chartFilePath);
    chartIsRetrieved = true;
  } catch (err) {}

  return chartIsRetrieved ? JSON.parse(await readFile(chartFilePath)) : null;
}

const CLOCK_MULT = 312;

function getClock() {
  const startTime = Date.now();

  return {
    unixTime() {
      let date = new Date(startTime + (Date.now() - startTime) * CLOCK_MULT);
      date.setUTCFullYear(2023, 1, 17);
      date = new Date(date.getTime() - ((2 * 60 + 32) * 60 + 18) * 1000);
      return date.getTime();
    },
    async awaitUntil(targetUnixTime) {
      return new Promise((res) =>
        setTimeout(
          () => res(targetUnixTime),
          (targetUnixTime - this.unixTime()) / CLOCK_MULT
        )
      );
    },
  };
}

const clock = getClock();

function getLastUnixTimeFilled() {
  const date = new Date(clock.unixTime());
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.getTime();
}

async function awaitOncomingUnixTimeToFill() {
  const oncommingUnixTimeToFill = getLastUnixTimeFilled() + 60 * 1000;
  return clock.awaitUntil(oncommingUnixTimeToFill);
}

function unixTimeToTimestamp(unixTime) {
  return new Date(unixTime).toISOString().slice(0, 16) + "Z";
}

async function* updateChart() {
  let nextUnixTime = getLastUnixTimeFilled();

  while (true) {
    const { timestamp } = await retrieveChart(
      unixTimeToTimestamp(nextUnixTime)
    );
    yield timestamp;

    const lastUnixTimeFilled = getLastUnixTimeFilled();
    if (lastUnixTimeFilled > nextUnixTime) {
      nextUnixTime = lastUnixTimeFilled;
    } else {
      nextUnixTime = await awaitOncomingUnixTimeToFill();
    }
  }
}

async function retrieveChart(timestamp) {
  let chart = null;

  while (chart == null) {
    try {
      chart = await _retrieveChart(timestamp);
    } catch (err) {
      console.log(err);
    }
  }

  return chart;
}

async function _retrieveChart(timestamp) {
  let chart = await getRetrievedChart(timestamp);
  if (chart != null) {
    return chart;
  }

  const {
    data: { data: candleSeries },
  } = await axios.get(getChartURL(timestamp));

  function parseSourceOHLC(stringOHLC) {
    const numberOHLC = {};

    for (const [key, value] of Object.entries(stringOHLC)) {
      numberOHLC[key] = Number.parseFloat(Number.parseFloat(value).toFixed(2));
    }

    return numberOHLC;
  }

  const OHLCSeries = [];
  for (const candle of candleSeries) {
    const [timestamp, O, H, L, C] = candle.split(",");
    OHLCSeries.push({ timestamp, ...parseSourceOHLC({ O, H, L, C }) });
  }

  chart = { timestamp, OHLCSeries };
  await writeFile(getChartFilePath(timestamp), JSON.stringify(chart));

  return chart;
}

module.exports = { retrieveChart, updateChart };
