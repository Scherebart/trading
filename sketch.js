function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function preload() {
  getChartData();
}

function getChartURL() {
  return "/chart-data-2023-02-10T14:40.json";
}

function getChartData() {
  httpGet(
    getChartURL(),
    "json",
    false,
    (data) => {
      chartData = data;
    },
    (error) => {
      console.error(error);
    }
  );
}

const DIM_MARGIN = 50;

const DIM_CANDLE_WIDTH = 25;
const DIM_CANDLE_BORDER = 2;
const DIM_CANDLE_DISTANCE = 20;

const COLOR_BACKGROUND = 130;
const COLOR_CANDLES_BACKGROUND = 90;
const COLOR_CANDLE_RED = [150, 65, 65];
const COLOR_CANDLE_GREEN = [65, 150, 65];

let chartData = null;

function draw() {
  if (!chartData) {
    return;
  }
  noLoop();

  background(COLOR_BACKGROUND);

  translate(DIM_MARGIN, DIM_MARGIN);
  const candleCount = drawCandles(
    width - DIM_MARGIN * 2,
    height - DIM_MARGIN * 2
  );
  drawValuesScale(candleCount);
}

function findExtremumsFromSeries(candleCount) {
  const { OHLCSeries } = chartData;

  let min = OHLCSeries[0].L;
  let max = OHLCSeries[0].H;
  let i = 0;
  for (const { H, L } of OHLCSeries) {
    if (i >= candleCount) {
      break;
    }
    i++;

    max = max < H ? H : max;
    min = min > L ? L : min;
  }

  return { min, max };
}

function drawValuesScale(candleCount) {}

/**
 * Returns the number of candles drawn
 * 
 * @param {*} width 
 * @param {*} height 
 * @returns 
 */
function drawCandles(width, height) {
  noStroke();
  fill(COLOR_CANDLES_BACKGROUND);
  rect(0, 0, width, height);

  const { OHLCSeries } = chartData;

  function calculateCandleCount() {
    let w = width;
    let candleCount = 0;

    w -= DIM_CANDLE_WIDTH;
    if (w < 0) {
      return candleCount;
    }
    candleCount = 1;

    candleCount += floor(w / (DIM_CANDLE_WIDTH + DIM_CANDLE_DISTANCE));

    return candleCount;
  }
  const candleCount = calculateCandleCount();
  if (candleCount == 0 || OHLCSeries.length == 0) {
    return candleCount;
  }

  const { min, max } = findExtremumsFromSeries(candleCount);

  const normalizeValue = (value) => (value - min) / (max - min);
  for (let i = 0; i < candleCount && i < OHLCSeries.length; i++) {
    const { O, H, L, C } = OHLCSeries[i];

    const y1 = height * (1 - normalizeValue(H));
    const y2 = height * (1 - normalizeValue(C > O ? C : O));
    const y3 = height * (1 - normalizeValue(C < O ? C : O));
    const y4 = height * (1 - normalizeValue(L));

    const candleX =
      width - (i + 1) * DIM_CANDLE_WIDTH - i * DIM_CANDLE_DISTANCE;

    strokeWeight(DIM_CANDLE_BORDER);
    stroke(25);
    fill(C > O ? COLOR_CANDLE_GREEN : COLOR_CANDLE_RED);
    line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y1,
      candleX + DIM_CANDLE_WIDTH / 2,
      y2
    );
    rect(candleX, y2, DIM_CANDLE_WIDTH, y3 - y2);
    line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y3,
      candleX + DIM_CANDLE_WIDTH / 2,
      y4
    );
  }

  return candleCount;
}
