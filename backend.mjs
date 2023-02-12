import axios from "axios";
import { writeFile } from "node:fs/promises";

function getChartURL(timestamp) {
  return `https://charts.finsa.com.au/data/minute/67995/mid?l=3&m=${timestamp}`;
  // return "https://charts.finsa.com.au/data/minute/67995/mid?l=4";
}

async function getChartData(timestamp) {
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

  const candleOHLCSeries = [];
  for (const candle of candleSeries) {
    const [timestamp, O, H, L, C] = candle.split(",");
    candleOHLCSeries.push({ timestamp, ...parseSourceOHLC({ O, H, L, C }) });
  }

  const chartData = { timestamp, candleOHLCSeries };
  return chartData;
}

(async () => {
  try {
    const TIMESTAMP = "2023-02-10T13:21";
    const chartData = await getChartData(TIMESTAMP);
    await writeFile(`chart-data-${TIMESTAMP}.json`, JSON.stringify(chartData));
  } catch (error) {
    console.error(error);
  }
})();
