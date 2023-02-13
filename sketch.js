const DIM_SCALE_MARGIN = 70;
const DIM_SCALE_VERTICAL_SPACING = 50;
const DIM_SCALE_TEXT_HEIGHT = 16;
const DIM_SCALE_TEXT_MARGIN = 10;
const DIM_SCALE_TIME_SPACING = 5;

const DIM_CANDLE_SERIES_MARGIN = 25;
const DIM_CANDLE_WIDTH = 18;
const DIM_CANDLE_BORDER = 1.2;
const DIM_CANDLE_DISTANCE = 12;

const COLOR_SCALE_BACKGROUND = 130;
const COLOR_CANDLE_SERIES_BACKGROUND = 90;
const COLOR_CANDLE_RED = [150, 65, 65];
const COLOR_CANDLE_GREEN = [65, 150, 65];

let candlesLayer = null;

function setup() {
  // Subtracted that 1 to quickly overcome some strangely inconsistent behaviour in brave vs chrome
  // In brave there seems the content be somewhat wider than the window width when the canvas with display=none is added
  // (it is added by p5 when creating graphics)
  createCanvas(window.innerWidth - 1, window.innerHeight - 1);
  candlesLayer = createGraphics(
    width - (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN) * 2,
    height - (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN) * 2
  );
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

let chartData = null;

function draw() {
  if (!chartData) {
    return;
  }
  noLoop();

  background(COLOR_SCALE_BACKGROUND);

  noStroke();
  fill(COLOR_CANDLE_SERIES_BACKGROUND);
  rect(
    DIM_SCALE_MARGIN,
    DIM_SCALE_MARGIN,
    width - 2 * DIM_SCALE_MARGIN,
    height - 2 * DIM_SCALE_MARGIN
  );

  const candleCount = drawCandles(candlesLayer);
  drawValuesScale(candleCount);
  drawTimeScale(candleCount);
  image(
    candlesLayer,
    DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN,
    DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN
  );
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

function drawValuesScale(candleCount) {
  const { min, max } = findExtremumsFromSeries(candleCount);

  const yL = DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN;
  const yH = height - (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN);
  const xText = width - DIM_SCALE_MARGIN + DIM_SCALE_TEXT_MARGIN;
  const xLine = DIM_SCALE_MARGIN + DIM_SCALE_VERTICAL_SPACING / 2;
  const lengthLine = width - 2 * (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN);

  const denormalizeValue = (y) =>
    Number.parseFloat(min + (max - min) * (1 - (y - yL) / (yH - yL))).toFixed(
      2
    );

  const ySeries = [];
  {
    for (
      let y = yL;
      y < yH - DIM_SCALE_VERTICAL_SPACING;
      y += DIM_SCALE_TEXT_HEIGHT + DIM_SCALE_VERTICAL_SPACING
    ) {
      ySeries.push(y);
    }
    ySeries.push(yH);
  }

  noStroke();
  textSize(DIM_SCALE_TEXT_HEIGHT);
  fill(200);
  for (const y of ySeries) {
    text(denormalizeValue(y), xText, y + DIM_SCALE_TEXT_HEIGHT * 0.3);
  }

  stroke(200, 80);
  strokeWeight(1);
  drawingContext.setLineDash([1.5, 8]);
  for (const y of ySeries) {
    line(xLine, y, xLine + lengthLine, y);
  }
}

function drawTimeScale(candleCount) {
  const { OHLCSeries } = chartData;

  const yText =
    height - DIM_SCALE_MARGIN + DIM_SCALE_TEXT_MARGIN + DIM_SCALE_TEXT_HEIGHT;

  const xCandle = (i) =>
    width -
    DIM_SCALE_MARGIN -
    DIM_CANDLE_SERIES_MARGIN -
    i * (DIM_CANDLE_WIDTH + DIM_CANDLE_DISTANCE) -
    DIM_CANDLE_WIDTH / 2;
  const xSeries = [];
  for (
    let i = 0;
    i < candleCount - DIM_SCALE_TIME_SPACING;
    i += DIM_SCALE_TIME_SPACING
  ) {
    xSeries.push({ x: xCandle(i), timestamp: OHLCSeries[i].timestamp });
  }
  xSeries.push({
    x: xCandle(candleCount - 1),
    timestamp: OHLCSeries[candleCount - 1].timestamp,
  });

  const yLine = DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN;
  const lengthLine = height - 2 * (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN);

  noStroke();
  textSize(DIM_SCALE_TEXT_HEIGHT);
  fill(200);
  for (const { x, timestamp } of xSeries) {
    const date = new Date(timestamp);
    text(
      `${date.getHours()}:${date.getMinutes()}`,
      x - DIM_SCALE_TEXT_HEIGHT,
      yText
    );
  }

  stroke(200, 80);
  strokeWeight(1);
  drawingContext.setLineDash([1.5, 8]);
  for (const { x } of xSeries) {
    line(x, yLine, x, yLine + lengthLine);
  }
}

/**
 * Returns the number of candles drawn
 *
 * @param {*} width
 * @param {*} height
 * @returns
 */
function drawCandles(layer) {
  const { width, height } = layer;
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

    if (OHLCSeries.length < candleCount) {
      candleCount = OHLCSeries.length;
    }

    return candleCount;
  }
  const candleCount = calculateCandleCount();
  if (candleCount == 0) {
    return candleCount;
  }

  const { min, max } = findExtremumsFromSeries(candleCount);

  const normalizeValue = (value) => height * (1 - (value - min) / (max - min));
  for (let i = 0; i < candleCount; i++) {
    const { O, H, L, C } = OHLCSeries[i];

    const y1 = normalizeValue(H);
    const y2 = normalizeValue(C > O ? C : O);
    const y3 = normalizeValue(C < O ? C : O);
    const y4 = normalizeValue(L);

    const candleX =
      width - (i + 1) * DIM_CANDLE_WIDTH - i * DIM_CANDLE_DISTANCE;

    layer.strokeWeight(DIM_CANDLE_BORDER);
    layer.stroke(25);
    layer.fill(C > O ? COLOR_CANDLE_GREEN : COLOR_CANDLE_RED);
    layer.line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y1,
      candleX + DIM_CANDLE_WIDTH / 2,
      y2
    );
    layer.rect(candleX, y2, DIM_CANDLE_WIDTH, y3 - y2);
    layer.line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y3,
      candleX + DIM_CANDLE_WIDTH / 2,
      y4
    );
  }

  return candleCount;
}
