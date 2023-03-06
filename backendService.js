const axios = require("axios");

const getClock = require("./clock");

const clock = getClock();

const {
  localDateFromISO,
  localDateToISO,
  generateDateRange,
  makeNullCandle,
  fillGapsInCandleSeries,
} = require("./utils");

async function getRawChartFromBroker(highDate, lowDate) {
  const brokerURL = "https://charts.finsa.com.au/data/minute/67995/mid";
  const params = {};
  if (!highDate) {
    params.l = 100;
  } else {
    params.m = localDateToISO(highDate + 1 * 60 * 1000);
    params.l = (highDate - lowDate) / (1 * 60 * 1000) + 1;
  }

  // await new Promise((res) => setTimeout(res, 400));
  // console.log({ params });
  const {
    data: { data: candleSeries },
  } = await axios.get(brokerURL, { params });

  return candleSeries;
}

async function getChartFromBroker(highDate, lowDate) {
  if (highDate < lowDate) {
    throw new Error("high date must be no less than the low date");
  }

  // console.log("getChartFromBroker", {
  //   highDate: localDateToISO(highDate),
  //   lowDate: localDateToISO(lowDate),
  // });

  let candleSeries = await getRawChartFromBroker(highDate, lowDate);

  const parseAndLimitPrecision = (numberInText) =>
    Number.parseFloat(Number.parseFloat(numberInText).toFixed(2));
  candleSeries = candleSeries.map((candle) => {
    const [timestamp, O, H, L, C] = candle.split(",");
    return {
      timestamp: localDateToISO(new Date(timestamp).getTime()),
      O: parseAndLimitPrecision(O),
      H: parseAndLimitPrecision(H),
      L: parseAndLimitPrecision(L),
      C: parseAndLimitPrecision(C),
    };
  });

  const makeFillingWithNullCandles = (highDate, lowDate) =>
    Array.from(generateDateRange(highDate, lowDate)).map(makeNullCandle);

  candleSeries = await fillGapsInCandleSeries({
    series: candleSeries,
    highDate,
    lowDate,
    makeFilling: makeFillingWithNullCandles,
  });

  return candleSeries;
}

async function getLatestMinuteInDB(db) {
  const { max: latestMinuteTimestamp } = await db.query().max("timestamp");
  return latestMinuteTimestamp
    ? localDateFromISO(latestMinuteTimestamp)
    : Number.NEGATIVE_INFINITY;
}

const CHART_TIP_LENGTH = 7;
// const CHART_TIP_LENGTH = 700;

async function loadChartTipFromBroker(db, highDate) {
  const latestMinuteInDB = await getLatestMinuteInDB(db);
  const lowDate = Math.max(
    highDate - (CHART_TIP_LENGTH - 1) * 60 * 1000,
    latestMinuteInDB ?? Number.NEGATIVE_INFINITY
  );
  // console.log("loadChartTipFromBroker", { highDate, lowDate });

  if (lowDate <= highDate) {
    const chartTip = await getChartFromBroker(highDate, lowDate);
    await db.query().insert(chartTip);
    const latestTimestamp = chartTip[0].timestamp;
    return latestTimestamp;
  }

  return highDate;
}

async function* updateChart(db) {
  while (true) {
    const lastMinutePassed = await clock.awaitNextMinute();
    yield await loadChartTipFromBroker(db, lastMinutePassed);
  }
}

/**
 *
 * @param {DBConnection} db
 * @param {*} highDate
 * @param {*} lowDate
 * @returns
 */
async function loadChart(db, highDate, lowDate) {
  // console.log("loadChart", {
  //   highDate: localDateToISO(highDate),
  //   lowDate: localDateToISO(lowDate),
  // });
  const candlesFromDBQuery = db
    .selectQuery()
    .whereBetween("timestamp", [
      localDateToISO(lowDate),
      localDateToISO(highDate),
    ]);
  const candlesFromDB = await candlesFromDBQuery;

  return fillGapsInCandleSeries({
    series: candlesFromDB,
    highDate,
    lowDate,
    makeFilling: getChartFromBroker,
    persistFilling: async (filling) => db.query().insert(filling),
  });
}

module.exports = { loadChart, updateChart };
