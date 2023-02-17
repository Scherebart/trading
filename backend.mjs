import axios from "axios";
import { writeFile } from "node:fs/promises";

function getChartURL(timestamp) {
  return `https://charts.finsa.com.au/data/minute/67995/mid?l=300&m=${timestamp}`;
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

  const OHLCSeries = [];
  for (const candle of candleSeries) {
    const [timestamp, O, H, L, C] = candle.split(",");
    OHLCSeries.push({ timestamp, ...parseSourceOHLC({ O, H, L, C }) });
  }

  const chartData = { timestamp, OHLCSeries };
  return chartData;
}

(async () => {
  try {
    const TIMESTAMP = "2023-02-13T15:06";
    const chartData = await getChartData(TIMESTAMP);
    await writeFile(`chart-data-${TIMESTAMP}.json`, JSON.stringify(chartData));
  } catch (error) {
    console.error(error);
  }
})();
