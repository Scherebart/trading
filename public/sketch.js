const DIM_SCALE_MARGIN = 70;
const DIM_SCALE_VALUE_SPACING = 50;
const DIM_SCALE_TEXT_SIZE = 16;
const DIM_SCALE_TEXT_MARGIN = 10;
const DIM_SCALE_TIME_SPACING = 5;

const DIM_CANDLE_SERIES_MARGIN = 25;
const DIM_CANDLE_BORDER = 1;
const DIM_CANDLE_WIDTH = 10;
const DIM_CANDLE_DISTANCE = 4;

const COLOR_SCALE_BACKGROUND = 130;
const COLOR_SCALE_BORDER = 60;
const COLOR_SCALE_TEXT = 195;
const COLOR_CANDLE_SERIES_BACKGROUND = 103;
const COLOR_CANDLE_RED = [150, 65, 65];
const COLOR_CANDLE_GREEN = [65, 150, 65];
const COLOR_CANDLE_BORDER = 30;

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
  noLoop();

  getChartFromBroker()
  redraw()
}

async function getChartFromBroker() {
  const fullQueryURL = `/api/chart?${new URLSearchParams({ length: 500, highDate: new Date().toISOString() })}`
  
  const res = await fetch(fullQueryURL)
  if (!res.ok) {
    console.error(`Could not get data, http status ${res.status}`)
  }

  const candleSeries = await res.json()
  chartData = candleSeries
}

function getChartData(timestamp) {
  const highDate = new Date(timestamp);
  const lowDate = new Date(highDate);
  lowDate.setHours(lowDate.getHours() - 5);
  const url = `/api/chart?highDate=${highDate.toISOString()}&lowDate=${lowDate.toISOString()}`;
  httpGet(
    url,
    "json",
    (data) => {
      chartData = data;
      redraw();
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

  background(COLOR_SCALE_BACKGROUND);

  smooth();
  strokeWeight(1);
  stroke(COLOR_SCALE_BORDER);
  fill(COLOR_CANDLE_SERIES_BACKGROUND);
  drawingContext.setLineDash([]);
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
  const OHLCSeries = chartData;

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
  const xLine = DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN / 2;
  const lengthLine =
    width - 2 * (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN / 2);

  const denormalizeValue = (y) =>
    Number.parseFloat(min + (max - min) * (1 - (y - yL) / (yH - yL))).toFixed(
      2
    );

  const ySeries = [];
  {
    for (
      let y = yL;
      y < yH - DIM_SCALE_VALUE_SPACING;
      y += DIM_SCALE_TEXT_SIZE + DIM_SCALE_VALUE_SPACING
    ) {
      ySeries.push(y);
    }
    ySeries.push(yH);
  }

  noStroke();
  textSize(DIM_SCALE_TEXT_SIZE);
  fill(COLOR_SCALE_TEXT);
  for (const y of ySeries) {
    text(denormalizeValue(y), xText, y + DIM_SCALE_TEXT_SIZE * 0.3);
  }

  stroke(200, 80);
  strokeWeight(1);
  drawingContext.setLineDash([1.5, 8]);
  for (const y of ySeries) {
    line(xLine, y, xLine + lengthLine, y);
  }
}

function drawTimeScale(candleCount) {
  const OHLCSeries = chartData;

  const yText =
    height - DIM_SCALE_MARGIN + DIM_SCALE_TEXT_MARGIN + DIM_SCALE_TEXT_SIZE;
  const y2Text = yText + DIM_SCALE_TEXT_MARGIN + DIM_SCALE_TEXT_SIZE;
  const yLine = DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN / 2;
  const lengthLine =
    height - 2 * (DIM_SCALE_MARGIN + DIM_CANDLE_SERIES_MARGIN / 2);

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

  {
    noStroke();
    textSize(DIM_SCALE_TEXT_SIZE);
    fill(COLOR_SCALE_TEXT);
    for (const { x, timestamp } of xSeries) {
      const date = new Date(timestamp);
      const hours = date.getHours();
      const minutes = (() => {
        let minutes = date.getMinutes();
        if (minutes < 10) {
          minutes = "0" + minutes;
        }
        return minutes;
      })();
      text(hours + ":" + minutes, x - DIM_SCALE_TEXT_SIZE, yText);
    }
  }

  {
    let i = xSeries.length - 1;
    if (i >= 0) {
      const date = new Date(xSeries[i].timestamp);
      let currentYear = date.getFullYear();
      let currentMonth = date.getMonth()+1;
      let currentDay = date.getDate();
      text(
        currentYear + "/" + currentMonth + "/" + currentDay,
        xSeries[i].x - DIM_SCALE_TEXT_SIZE,
        y2Text
      );
      while (--i >= 0) {
        const date = new Date(xSeries[i].timestamp);
        const year = date.getFullYear();
        const month = date.getMonth();
        const day = date.getDate();

        let label = null;
        if (year != currentYear) {
          label = currentYear + "/" + currentMonth + "/" + currentDay;
        }
        if (month != currentMonth) {
          label = currentMonth + "/" + currentDay;
        }
        if (day != currentDay) {
          label = currentDay;
        }
        if (label != null) {
          text(label, xSeries[i].x - DIM_SCALE_TEXT_SIZE, y2Text);
        }
      }
    }
  }

  {
    stroke(200, 80);
    strokeWeight(1);
    drawingContext.setLineDash([1.5, 8]);
    for (const { x } of xSeries) {
      line(x, yLine, x, yLine + lengthLine);
    }
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
  layer.clear();

  const { width, height } = layer;
  const OHLCSeries = chartData;

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
  layer.strokeWeight(DIM_CANDLE_BORDER);
  layer.stroke(COLOR_CANDLE_BORDER);
  for (let i = 0; i < candleCount; i++) {
    const { O, H, L, C } = OHLCSeries[i];

    const y1 = normalizeValue(H);
    const y2 = normalizeValue(C > O ? C : O);
    const y3 = normalizeValue(C < O ? C : O);
    const y4 = normalizeValue(L);

    const candleX =
      width - (i + 1) * DIM_CANDLE_WIDTH - i * DIM_CANDLE_DISTANCE;

    layer.strokeWeight(DIM_CANDLE_BORDER);
    layer.fill(C > O ? COLOR_CANDLE_GREEN : COLOR_CANDLE_RED);
    layer.rect(candleX, y2, DIM_CANDLE_WIDTH, y3 - y2);

    layer.strokeWeight(DIM_CANDLE_BORDER * 1.2);
    layer.line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y1,
      candleX + DIM_CANDLE_WIDTH / 2,
      y2
    );
    layer.line(
      candleX + DIM_CANDLE_WIDTH / 2,
      y3,
      candleX + DIM_CANDLE_WIDTH / 2,
      y4
    );
  }

  return candleCount;
}
