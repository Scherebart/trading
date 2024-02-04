// Layout params
const DIST_WINDOW_MARGIN_HORIZ = 50;
const DIST_WINDOW_MARGIN_VERT = 30;

const DIST_VALUE_SCALE_SIZE = 85;
const DIST_VALUE_SCALE_SPACING = 16;
const DIST_TIME_SCALE_SIZE = 50;
const DIST_TIME_SCALE_SPACING = 15;
const SIZE_SCALE_TEXT = 16;
const DIST_SCALE_TEXT_HEIGHT = SIZE_SCALE_TEXT;
const DIST_SCALE_INNER_MARGIN = 15;

const DIST_CANDLE_SERIES_MARGIN = 18;
const DIST_CANDLE_BORDER = 1;
const DIST_CANDLE_WIDTH = 9;
const DIST_CANDLE_CORNER_RADIUS = 4;
const DIST_CANDLE_SPACING = 2;

const DIST_LINE_WIDTH = 1;

const COLOR_SCALE_BACKGROUND = [135, 135, 135];
const COLOR_CANDLE_SERIES_BACKGROUND = [98, 100, 100];
const COLOR_SCALE_BORDER = 65;
const COLOR_SCALE_TEXT = 200;
const COLOR_SCALE_TEXT_REGULAR = 220;
const COLOR_SCALE_TEXT_BOLD = 240;
const COLOR_CANDLE_RED = [150, 65, 65];
const COLOR_CANDLE_GREEN = [65, 150, 65];
const COLOR_CANDLE_BORDER = 30;

let distValueScaleWidth
let distTimeScaleWidth
let distCandlesBoxWidth
let distCandlesBoxHeight
let windowWidth
let distCandleSeriesCorrectiveMargin
let y0, y9, x0, x9
let fontLight, fontRegular, fontBold

function preload() {
  fontLight = loadFont("resources/Roboto-Light.ttf")
  fontRegular = loadFont("resources/Roboto-Regular.ttf")
  // fontRegular = loadFont("resources/Roboto-Regular.ttf")
  fontBold = loadFont("resources/Roboto-Bold.ttf")
}

function loadCandles({ timestamp, candlesToLoad }, fnThen) {
  const params = { candlesToLoad }
  if (timestamp) {
    params.timestamp = timestamp
  }

  loadJSON(
    `/api/chart?${new URLSearchParams(params)}`,
    fnThen,
    (error) => {
      console.error("could not retrieve data", error)
    }
  )
}

const makeQueue = () => {
  const queue = []

  function runQueue() {
    const fn = queue[0]
    if (!fn) {
      return
    }

    fn(() => {
      queue.shift()
      runQueue()
    })
  }

  function push(fn) {
    if (queue.length === 0) {
      queue.push(fn)
      runQueue()
    } else {
      queue.push(fn)
    }
  }

  function isBusy() {
    return queue.length > 0
  }

  return {
    push,
    isBusy
  }
}

const makeWindow = () => {
  const queue = makeQueue()

  let horizonCandles = null
  let zeroCandleIndex = null
  let horizonHigh = Number.MIN_VALUE
  let horizonLow = Number.MAX_VALUE

  function updateHorizonExtremes() {
    let i = 0
    while (i < windowWidth) {
      const candleIndex = zeroCandleIndex + i
      if (candleIndex > horizonCandles.length - 1) {
        break;
      }

      const candle = horizonCandles[candleIndex]
      // console.log({ zeroCandleIndex, i, candleIndex, candle })
      if (candle.H > horizonHigh) {
        horizonHigh = candle.H;
      }
      if (candle.L < horizonLow) {
        horizonLow = candle.L;
      }

      i += 1;
    }
  }

  function loadRecentCandles() {
    queue.push((done) => {
      if (horizonCandles === null) {
        loadCandles(
          { candlesToLoad: windowWidth + 10 },
          (data) => {
            horizonCandles = data.candleSeries
            zeroCandleIndex = 0

            updateHorizonExtremes()
            redraw()

            done()
          }
        )
      } else {
        loadCandles(
          { candlesToLoad: 10 },
          (data) => {
            const loadedCandles = data.candleSeries
            let candlesToInsert = 0
            while (loadedCandles[candlesToInsert] && new Date(loadedCandles[candlesToInsert].timestamp).getTime() > new Date(horizonCandles[0].timestamp).getTime()) {
              candlesToInsert += 1
            }
            horizonCandles.splice(0, 0, ...loadedCandles.slice(0, candlesToInsert))

            if (zeroCandleIndex === 0) {
              updateHorizonExtremes()
              redraw()
            } else {
              zeroCandleIndex += candlesToInsert
            }

            done()
          }
        )
      }
    })
  }

  function* candles() {
    for (let windowCandleIndex = 0; windowCandleIndex < windowWidth; windowCandleIndex += 1) {
      const horizonCandleIndex = zeroCandleIndex + windowCandleIndex
      const candle = horizonCandles[horizonCandleIndex]
      if (candle) {
        yield { ...candle }
      } else {
        return
      }
    }
  }

  function pageDown() {
    if (queue.isBusy()) {
      return
    }

    if (zeroCandleIndex === null) {
      return
    }

    const nextZeroCandleIndex = Math.min(zeroCandleIndex + Math.floor(windowWidth * 0.85), horizonCandles.length - 1)
    const candlesToLoad = nextZeroCandleIndex + windowWidth - horizonCandles.length
    if (candlesToLoad <= 0) {
      zeroCandleIndex = nextZeroCandleIndex
      updateHorizonExtremes()
      redraw()
    } else {
      queue.push((done) => {
        const nextZeroCandleIndex = Math.min(zeroCandleIndex + Math.floor(windowWidth * 0.85), horizonCandles.length - 1)
        const candlesToLoad = nextZeroCandleIndex + windowWidth - horizonCandles.length
        loadCandles(
          { timestamp: horizonCandles[horizonCandles.length - 1].timestamp, candlesToLoad },
          (data) => {
            horizonCandles = horizonCandles.concat(data.candleSeries)
            zeroCandleIndex = nextZeroCandleIndex

            updateHorizonExtremes()
            redraw()

            done()
          }
        )
      })
    }
  }

  function pageUp() {
    if (zeroCandleIndex === null || zeroCandleIndex === 0) {
      return
    }

    zeroCandleIndex = Math.max(zeroCandleIndex - Math.floor(windowWidth * 0.85), 0)
    updateHorizonExtremes()
    redraw()
  }

  function pageZero() {
    if (zeroCandleIndex === null || zeroCandleIndex === 0) {
      return
    }

    zeroCandleIndex = 0
    updateHorizonExtremes()
    redraw()
  }

  function resetScale() {
    horizonHigh = Number.MIN_VALUE
    horizonLow = Number.MAX_VALUE
    updateHorizonExtremes()
    redraw()
  }

  return Object.freeze({
    isInitialized: () => zeroCandleIndex !== null,
    horizon: () => ({ high: horizonHigh, low: horizonLow }),
    candles,
    loadRecentCandles,
    pageUp,
    pageDown,
    pageZero,
    resetScale
  })
}

let dataWindow = null

function keyPressed() {
  console.log(window.innerHeight)
  console.log(`key "${key}" pressed`)
  switch (key) {
    case 'j':
      dataWindow.pageDown()
      break;
    case 'k':
      dataWindow.pageUp()
      break;
    case 'G':
      dataWindow.pageZero()
      break;
    case 'r':
      dataWindow.resetScale()
      break;
    case 'f':
      fullscreen(!fullscreen())
      console.log('f', window.innerHeight)
      break;
    default:
  }
}

function windowResized() {
  refreshLayout()
}

function refreshLayout() {
  resizeCanvas(window.innerWidth, window.innerHeight, true)

  textSize(SIZE_SCALE_TEXT);
  distValueScaleWidth = textWidth("9999.99")
  distTimeScaleWidth = textWidth(formatTime("2024-02-04T22:44"))
  distCandlesBoxWidth = width - 2 * DIST_WINDOW_MARGIN_HORIZ - 2 * DIST_CANDLE_SERIES_MARGIN - DIST_SCALE_INNER_MARGIN - distValueScaleWidth
  distCandlesBoxHeight = height - 2 * DIST_WINDOW_MARGIN_VERT - 2 * DIST_CANDLE_SERIES_MARGIN - DIST_SCALE_INNER_MARGIN - DIST_SCALE_TEXT_HEIGHT
  windowWidth = Math.floor((distCandlesBoxWidth + DIST_CANDLE_SPACING) / (2 * DIST_CANDLE_BORDER + DIST_CANDLE_WIDTH + DIST_CANDLE_SPACING))
  distCandleSeriesCorrectiveMargin = (
    distCandlesBoxWidth + DIST_CANDLE_SPACING - windowWidth * (2 * DIST_CANDLE_BORDER + DIST_CANDLE_WIDTH + DIST_CANDLE_SPACING)
  ) / 2
  y0 = DIST_WINDOW_MARGIN_VERT + DIST_CANDLE_SERIES_MARGIN
  y9 = y0 + distCandlesBoxHeight

  draw()
}

function setup() {
  const chartElement = document.getElementById("chart-canvas")
  createCanvas(window.innerWidth, window.innerHeight, chartElement);
  refreshLayout()

  noLoop();

  dataWindow = makeWindow()
  function cronRefreshData() {
    dataWindow.loadRecentCandles()
    setTimeout(cronRefreshData, (60 - new Date().getSeconds() + 2) * 1000)
  }
  cronRefreshData()
}

function draw() {
  if (!dataWindow || !dataWindow.isInitialized()) {
    return;
  }

  background(COLOR_SCALE_BACKGROUND);

  strokeWeight(0);
  stroke(COLOR_SCALE_BORDER);
  fill(COLOR_CANDLE_SERIES_BACKGROUND);
  drawingContext.setLineDash([]);
  rectMode(CORNERS)
  rect(
    DIST_WINDOW_MARGIN_HORIZ,
    DIST_WINDOW_MARGIN_VERT,
    width - (DIST_WINDOW_MARGIN_HORIZ + distValueScaleWidth + DIST_SCALE_INNER_MARGIN),
    height - (DIST_WINDOW_MARGIN_VERT + DIST_SCALE_TEXT_HEIGHT + DIST_SCALE_INNER_MARGIN),
    8
  );

  drawValueScale();
  drawnCandles = generateDrawnCandles()
  drawTimeScale();
  drawCandles();
}

function mapValueToY(value) {
  const { high, low } = dataWindow.horizon()

  return y9 - (value - low) / (high - low) * (y9 - y0)
}

function yDeltaToValueDelta(yDelta) {
  const { high, low } = dataWindow.horizon()

  return yDelta / (y9 - y0) * (high - low)
}

function nextSignificantNumber(n) {
  const s = n.toString()

  const indexOfMostSignificantDigit = s.search(/[1-9]/)
  let indexOfDot = s.search(/[.]/)
  if (indexOfDot === -1) {
    indexOfDot = s.length
  }

  let digitOrder = indexOfDot - indexOfMostSignificantDigit
  if (digitOrder > 0) {
    digitOrder -= 1
  }

  const significantFloor = Math.pow(10, digitOrder)
  if (n === significantFloor) {
    return significantFloor
  }
  // if (n < 2.5 * significantFloor) {
  //   return 2.5 * significantFloor
  // }
  if (n < 5 * significantFloor) {
    return 5 * significantFloor
  }
  if (n < 10 * significantFloor) {
    return 10 * significantFloor
  }
}

function numberPrecision(n) {
  const s = n.toString()
  const indexOfDot = s.search(/[.]/)
  if (indexOfDot === -1) {
    return 0
  } else {
    return s.length - 1 - indexOfDot
  }
}

function drawValueScale() {
  const textX = width - (DIST_WINDOW_MARGIN_HORIZ + distValueScaleWidth)
  const lineX1 = DIST_WINDOW_MARGIN_HORIZ + DIST_CANDLE_SERIES_MARGIN / 2
  const lineX2 = textX - DIST_SCALE_INNER_MARGIN - DIST_CANDLE_SERIES_MARGIN / 2

  const minYDelta = DIST_SCALE_TEXT_HEIGHT + DIST_VALUE_SCALE_SPACING
  const minValueDelta = yDeltaToValueDelta(minYDelta)
  const valueDelta = nextSignificantNumber(minValueDelta)
  const valuePrecision = numberPrecision(valueDelta)

  textFont(fontRegular)
  textSize(SIZE_SCALE_TEXT * 1.1);
  const { high, low } = dataWindow.horizon()
  let value = Math.ceil(low / valueDelta) * valueDelta
  while (value <= high) {
    const y = mapValueToY(value)
    const textY = y + DIST_SCALE_TEXT_HEIGHT / 2

    noStroke();
    fill(COLOR_SCALE_TEXT);
    text(value.toFixed(valuePrecision), textX, textY);

    stroke(COLOR_SCALE_TEXT, 66);
    strokeWeight(DIST_LINE_WIDTH);
    drawingContext.setLineDash([1.2, 10]);
    line(lineX1, y, lineX2, y)

    value += valueDelta
  }
}

let drawnCandles

function generateDrawnCandles() {
  const generatedCandles = []

  let drawX = width - DIST_WINDOW_MARGIN_HORIZ - distValueScaleWidth - DIST_SCALE_INNER_MARGIN - DIST_CANDLE_SERIES_MARGIN - distCandleSeriesCorrectiveMargin

  drawX -= DIST_CANDLE_BORDER + DIST_CANDLE_WIDTH / 2
  for (const candle of dataWindow.candles()) {
    generatedCandles.push({
      ...candle,
      drawX
    })

    drawX -= DIST_CANDLE_WIDTH + 2 * DIST_CANDLE_BORDER + DIST_CANDLE_SPACING
  }

  return {
    [Symbol.iterator]: () => generatedCandles[Symbol.iterator]()
  }
}


const significantTimeAmounts = [1, 5, 15, 30, 60, 120, 240, 480]

function nextSignificantTimeAmount(minutes, levelsAway) {
  console.log({ minutes, levelsAway })
  let i = 0
  while (significantTimeAmounts[i] < minutes) {
    if (i >= significantTimeAmounts.length) {
      return
    }

    i += 1
  }

  let levelsLeft = levelsAway
  while (levelsLeft > 0) {
    if (i >= significantTimeAmounts.length) {
      return
    }

    i += 1
    levelsLeft -= 1
  }

  return significantTimeAmounts[i]
}

function dateToTimeAmount(isoDate) {
  const date = new Date(isoDate)
  return date.getHours() * 60 + date.getMinutes()
}

function formatTime(isoDate) {
  const date = new Date(isoDate);
  const hours = date.getHours();
  let minutes = date.getMinutes();
  if (minutes < 10) {
    minutes = "0" + minutes;
  }

  return hours + ":" + minutes
}

function drawTimeScale() {
  const minXDelta = distTimeScaleWidth + DIST_TIME_SCALE_SPACING
  const minCandlesDelta = minXDelta / (DIST_CANDLE_BORDER * 2 + DIST_CANDLE_WIDTH + DIST_CANDLE_SPACING)
  const minTimeDelta = minCandlesDelta * 1
  const timeDelta = nextSignificantTimeAmount(minTimeDelta, 0)
  const timeDeltaLevel2 = nextSignificantTimeAmount(minTimeDelta, 2)
  const timeDeltaLevel3 = nextSignificantTimeAmount(minTimeDelta, 3)

  const textY = height - DIST_WINDOW_MARGIN_VERT
  const lineY1 = DIST_WINDOW_MARGIN_VERT + DIST_CANDLE_SERIES_MARGIN / 2
  const lineY2 = height - DIST_WINDOW_MARGIN_VERT - DIST_SCALE_TEXT_HEIGHT - DIST_SCALE_INNER_MARGIN - DIST_CANDLE_SERIES_MARGIN / 2

  let prevNo = null
  let no = -1
  for (const candle of drawnCandles) {
    no += 1
    const { timestamp, drawX } = candle
    const timeAmount = dateToTimeAmount(timestamp)
    if (timeAmount % timeDelta !== 0 || (prevNo !== null && no - prevNo < minCandlesDelta)) {
      continue
    }

    drawingContext.setLineDash([1.2, 10]);
    if (timeAmount % timeDeltaLevel3 === 0) {
      strokeWeight(DIST_LINE_WIDTH * 1.6);
      stroke(COLOR_SCALE_TEXT_BOLD, 90);
    } else if (timeAmount % timeDeltaLevel2 === 0) {
      strokeWeight(DIST_LINE_WIDTH * 1.3);
      stroke(COLOR_SCALE_TEXT_REGULAR, 80);
    } else {
      strokeWeight(DIST_LINE_WIDTH);
      stroke(COLOR_SCALE_TEXT, 75);
    }
    line(drawX, lineY1, drawX, lineY2);

    textSize(SIZE_SCALE_TEXT);
    noStroke()
    if (timeAmount % timeDeltaLevel3 === 0) {
      textFont(fontBold)
      fill(COLOR_SCALE_TEXT_BOLD)
    } else if (timeAmount % timeDeltaLevel2 === 0) {
      textFont(fontRegular)
      fill(COLOR_SCALE_TEXT_REGULAR)
    } else {
      textFont(fontLight)
      fill(COLOR_SCALE_TEXT)
    }
    text(formatTime(timestamp), drawX - distTimeScaleWidth / 2, textY);

    prevNo = no
    prevCandle = candle
  }
}

/**
 * Returns the number of candles drawn
 *
 * @param {*} width
 * @param {*} height
 * @returns
 */
function drawCandles() {
  const { high, low } = dataWindow.horizon()
  const y1CandlesBox = DIST_WINDOW_MARGIN_VERT + DIST_CANDLE_SERIES_MARGIN
  const normalizeValue = (value) => y1CandlesBox + distCandlesBoxHeight * (1 - (value - low) / (high - low));

  strokeWeight(DIST_CANDLE_BORDER);
  stroke(COLOR_CANDLE_BORDER);
  drawingContext.setLineDash([]);

  rectMode(CORNER)
  for (const candle of drawnCandles) {
    const { O, H, L, C, drawX } = candle;

    const y1 = normalizeValue(H);
    const y2 = normalizeValue(C > O ? C : O);
    const y3 = normalizeValue(C < O ? C : O);
    const y4 = normalizeValue(L);

    strokeWeight(DIST_CANDLE_BORDER);
    fill(C > O ? COLOR_CANDLE_GREEN : COLOR_CANDLE_RED);
    rect(drawX - DIST_CANDLE_WIDTH / 2, y2, DIST_CANDLE_WIDTH, y3 - y2, DIST_CANDLE_CORNER_RADIUS);

    strokeWeight(DIST_CANDLE_BORDER * 1.2);
    line(
      drawX,
      y1,
      drawX,
      y2
    );
    line(
      drawX,
      y3,
      drawX,
      y4
    );
  }
}
