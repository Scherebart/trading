const axios = require("axios");

const { localDateToISO } = require("./utils");

function transformCandlesToLocalFormat(series) {
  const parseAndLimitPrecision = (numberInText) =>
    Number.parseFloat(Number.parseFloat(numberInText).toFixed(2));

  return series.map((candle) => {
    const [timestamp, O, H, L, C] = candle.split(",");
    return {
      timestamp: localDateToISO(new Date(timestamp).getTime()),
      O: parseAndLimitPrecision(O),
      H: parseAndLimitPrecision(H),
      L: parseAndLimitPrecision(L),
      C: parseAndLimitPrecision(C),
    };
  });
}

module.exports = {
  async getRecentCandles(length) {
    console.log({
      l: length,
    });
    const {
      data: { data: candleSeries },
    } = await axios.get("https://charts.finsa.com.au/data/minute/67995/mid", {
      params: {
        l: length,
      },
    });

    return transformCandlesToLocalFormat(candleSeries);
  },

  async getCandlesRange(highDate, lowDate) {
    const {
      data: { data: candleSeries },
    } = await axios.get("https://charts.finsa.com.au/data/minute/67995/mid", {
      params: {
        m: localDateToISO(highDate + 1 * 60 * 1000),
        l: (highDate - lowDate) / (1 * 60 * 1000) + 1,
      },
    });

    return transformCandlesToLocalFormat(candleSeries);
  },
};
