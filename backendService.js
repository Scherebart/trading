const axios = require("axios");
// const Mutex =require('async-mutex').Mutex

const getClock = require("./clock");
const { transformAllObjectProperties } = require("./utils");
const brokerQuery = require("./brokerQuery");

const clock = getClock();

const {
  localDateFromISO,
  localDateToISO,
  generateDateRange,
  makeNullCandle,
  trimOrderedTimestampedSeries,
  fillGapsInOrderedTimestampedSeries,
} = require("./utils");

async function getRawChartFromBroker({ highDate, lowDate, candlesTotal }) {
  const brokerURL = "https://charts.finsa.com.au/data/minute/67995/mid";
  const params = {};

  if (highDate && lowDate) {
    params.m = localDateToISO(highDate + 1 * 60 * 1000);
    params.l = (highDate - lowDate) / (1 * 60 * 1000) + 1;
  }

  if (candlesTotal) {
    params.l = candlesTotal;
  }

  console.log(`getRawChartFromBroker`, { highDate, lowDate, candlesTotal });

  const res = await axios.get(brokerURL, { params });
  const {
    data: { data: candleSeries },
  } = res;

  return candleSeries;
}

async function getChartFromBroker({ highDate, lowDate, candlesTotal }) {
  if (highDate && lowDate && highDate < lowDate) {
    throw new Error("high date must be no less than the low date");
  }

  let candleSeries = await getRawChartFromBroker({
    highDate,
    lowDate,
    candlesTotal,
  });

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

  const makeFillingWithBlankCandles = (highDate, lowDate) =>
    Array.from(generateDateRange(highDate, lowDate)).map(makeNullCandle);

  candleSeries = await fillGapsInOrderedTimestampedSeries({
    series: candleSeries,
    highDate,
    lowDate,
    makeFilling: makeFillingWithBlankCandles,
  });

  return candleSeries;
}

async function getLatestMinuteInDB(db) {
  const [{ max: latestMinuteTimestamp }] = await db
    .query()
    .max("timestamp as max");
  return localDateFromISO(latestMinuteTimestamp);
}

const CHART_TIP_LENGTH = 7;
// const CHART_TIP_LENGTH = 700;

async function fillGapsWithBlankCandles(series) {
  return fillGapsInOrderedTimestampedSeries({
    series,
    makeFilling: (highDate, lowDate) =>
      Array.from(generateDateRange(highDate, lowDate)).map(makeNullCandle),
  });
}

function skipBlankCandles(series) {
  return series.filter((candle) => candle.O != null);
}

/**
 *
 * @param {*} db
 * @returns the recent candle
 */
async function loadRecentCandles(db) {
  /** combine the broker query with local caching here! */
  let candles = await brokerQuery.getRecentCandles(CHART_TIP_LENGTH);
  const
  candles = trimOrderedTimestampedSeries(candles)
  candles = fillGapsWithBlankCandles(candles)
}

async function* reportRecentCandles(db) {
  let prevCandleDate = null;
  while (true) {
    const recentCandleDate = await loadRecentCandles(db);
    if (recentCandleDate !== prevCandleDate) {
      yield recentCandleDate;
    }
    prevCandleDate = recentCandleDate;
  }
}

async function* loadRecentCassndles(db) {
  function recentCandlesToLoad(latestMinuteInDB) {
    return Math.min(
      (clock.getLastMinutePassed() -
        (latestMinuteInDB ?? Number.NEGATIVE_INFINITY)) /
        (1 * 60 * 1000),
      CHART_TIP_LENGTH
    );
  }

  async function nextCandleTimestamp() {
    const latestMinuteInDB = await getLatestMinuteInDB(db);
    const candlesToLoad = recentCandlesToLoad(latestMinuteInDB);
    if (candlesToLoad < 1) {
      return localDateToISO(latestMinuteInDB);
    }

    let candles = await brokerQuery.getRecentCandles(candlesToLoad);
    candles = trimOrderedTimestampedSeries({
      series: candles,
      lowDate: latestMinuteInDB + 1 * 60 * 1000,
    });
    candles = await fillGapsWithBlankCandles(candles);

    if (candles.length > 0) {
      await db.query().insert(candles);

      return candles[0].timestamp;
    }
  }

  await db.startTransaction();

  const lengthd = recentCandlesToLoad(latestMinuteInDB);
  console.log({ length });
  let recentTimestamp = null;
  if (length > 0) {
    let candles = await brokerQuery.getRecentCandles(length);
    candles = trimOrderedTimestampedSeries({
      series: candles,
      lowDate: latestMinuteInDB + 1 * 60 * 1000,
    });
    candles = await fillGapsWithBlankCandles(candles);

    if (candles.length > 0) {
      recentTimestamp = candles[0].timestamp;
      await db.query().insert(candles);
    }
  }

  while (true) {
    lastMinutePassed = await clock.awaitNextMinute(1200);
    latestMinuteInDB = await getLatestMinuteInDB(db);
  }

  await db.commitTransaction();

  return recentTimestamp;
}

async function* updateChart(db) {
  let lastCandleDate = null;
  while (true) {
    lastCandleDate = await loadRecentCandles(db, lastCandleDate);
    yield lastCandleDate;
  }
}

let loadChartCallCount = 0;
/**
 *
 * @param {DBConnection} db
 * @param {*} highDate
 * @param {*} lowDate
 * @returns
 */
async function loadChart(db, highDate, lowDate) {
  const callInstance = ++loadChartCallCount;

  await db.startTransaction();

  let candles = await db
    .selectQuery()
    .whereBetween("timestamp", [
      localDateToISO(lowDate),
      localDateToISO(highDate),
    ]);
  candles = await fillGapsInOrderedTimestampedSeries({
    highDate,
    lowDate,
    makeFilling: async () => {
      let candles = await brokerQuery.getCandlesRange(highDate, lowDate);
      candles = await fillGapsWithBlankCandles(candles);
      return candles;
    },
    persistFilling: async (filling) => db.query().insert(filling),
    series: candles,
  });

  await db.commitTransaction();

  candles = skipBlankCandles(candles);

  return candles;
}

module.exports = { loadChart, updateChart };
