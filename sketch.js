function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function preload() {
  getChartData();
}

function getChartURL() {
  return "/chart-data-2023-02-10T08:56.json";
}

function getChartData() {
  httpGet(
    getChartURL(),
    "json",
    false,
    (data) => {
      console.log(data);
      chartData = data;
    },
    (error) => {
      console.error(error);
    }
  );
}

const DIM_CANDLE_WIDTH = 25;
const DIM_CANDLE_BORDER = 2;
const DIM_CANDLE_DISTANCE = 20;

const COLOR_BACKGROUND = 90;
const COLOR_CANDLE_RED = [150, 65, 65];
const COLOR_CANDLE_GREEN = [65, 150, 65];

let chartData = null;

function draw() {
  if (!chartData) {
    return;
  }
  noLoop();

  background(COLOR_BACKGROUND);
  drawCandles();
}

function drawCandles() {
  const { OHLCSeries } = chartData;
  if (OHLCSeries.length == 0) {
    return;
  }

  let min = OHLCSeries[0].L;
  let max = OHLCSeries[0].H;
  for (const { H, L } of OHLCSeries) {
    max = max < H ? H : max;
    min = min > L ? L : min;
  }

  const normalizeValue = (value) => (value - min) / (max - min);
  for (let i = 0; i < OHLCSeries.length; i++) {
    const { O, H, L, C } = OHLCSeries[i];

    const y1 = height * (1 - normalizeValue(H));
    const y2 = height * (1 - normalizeValue(C > O ? C : O));
    const y3 = height * (1 - normalizeValue(C < O ? C : O));
    const y4 = height * (1 - normalizeValue(L));

    strokeWeight(DIM_CANDLE_BORDER);
    stroke(25);

    const candleX =
      width - (i + 1) * DIM_CANDLE_WIDTH - i * DIM_CANDLE_DISTANCE;
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
}
