async function* mapAsyncIterable(asyncIterable, mapFn) {
  for await (const value of asyncIterable) {
    yield mapFn(value);
  }
}

function localDateToISO(date) {
  return new Date(date).toISOString();
}

function localDateFromISO(isoDate) {
  return new Date(isoDate).getTime();
}

function* generateDateRange(highDate, lowDate) {
  let currentDate = highDate;
  while (currentDate >= lowDate) {
    yield currentDate;
    currentDate -= 1 * 60 * 1000;
  }
}

const makeNullCandle = (date) => ({
  timestamp: localDateToISO(date),
  O: null,
  H: null,
  L: null,
  C: null,
});

async function fillGapsInCandleSeries({
  series,
  highDate,
  lowDate,
  makeFilling,
  persistFilling = () => {},
}) {
  const consistentSeries = [];

  async function fillGap(highDate, lowDate) {
    if (highDate < lowDate) {
      return;
    }

    const filling = await makeFilling(highDate, lowDate);
    consistentSeries.push(...filling);
    await persistFilling(filling);
  }

  let highGapDate = highDate;
  for (const item of series) {
    const itemDate = localDateFromISO(item.timestamp);

    // skip the head and tail of the series extending beyond the [hightDate, ..., lowDate] range
    if (itemDate > highDate) {
      continue;
    }
    if (itemDate < lowDate) {
      break;
    }

    await fillGap(highGapDate, itemDate + 1 * 60 * 1000);
    consistentSeries.push(item);
    highGapDate = itemDate - 1 * 60 * 1000;
  }
  await fillGap(highGapDate, lowDate);

  return consistentSeries;
}

module.exports = {
  mapAsyncIterable,
  localDateFromISO,
  localDateToISO,
  generateDateRange,
  makeNullCandle,
  fillGapsInCandleSeries,
};
