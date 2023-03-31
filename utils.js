async function* mapAsyncIterable(asyncIterable, mapFn) {
  for await (const value of asyncIterable) {
    yield mapFn(value);
  }
}

function transformAllObjectProperties(obj, funcTransform) {
  for (const key of Object.keys(obj)) {
    try {
      obj[key] = funcTransform(obj[key]);
    } catch (err) {
      console.log(err);
      console.log({ [key]: obj[key] });
      console.log(obj);
    }
  }

  return obj;
}

// function makeQueue() {

//       const items = {}
//       const frontIndex = 0
//       const backIndex = 0

//   function enqueue(item) {
//       this.items[this.backIndex] = item
//       this.backIndex++
//       return item + ' inserted'
//   }
//   dequeue() {
//       const item = this.items[this.frontIndex]
//       delete this.items[this.frontIndex]
//       this.frontIndex++
//       return item
//   }
//   peek() {
//       return this.items[this.frontIndex]
//   }
//   get printQueue() {
//       return this.items;
//   }
// }

// function initMutex() {
//   let used = false;
//   const stack = [];

//   async function obtain() {
//     return new Promise((notify) => {
//       if (stack.length === 0) {
//         used = true;
//         notify(release);
//       } else {
//         stack.push(notify);
//       }
//     });
//   }

//   async function release() {
//     const firstAwaiter = stack.pop();
//     if (firstAwaiter) {
//       firstAwaiter.notify();
//     }
//   }
// }

function localDateToISO(date) {
  if (date === null || date === undefined) {
    return null;
  }

  // console.log(`converting date ${date} to ISO`)

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

function trimOrderedTimestampedSeries({ series, highDate, lowDate }) {
  const res = [];

  for (const item of series) {
    const itemDate = localDateFromISO(item.timestamp);
    if (
      (!highDate || itemDate <= highDate) &&
      (!lowDate || itemDate >= lowDate)
    ) {
      res.push(item);
    }
  }

  return res;
}

async function fillGapsInOrderedTimestampedSeries({
  series,
  highDate,
  lowDate,
  makeFilling,
  persistFilling = () => {},
}) {
  console.log("fillGapsInOrderedTimestampedSeries", { highDate, lowDate });
  async function fillGap(highDate, lowDate) {
    if (highDate < lowDate) {
      return;
    }

    const filling = await makeFilling(highDate, lowDate);
    consistentSeries.push(...filling);
    await persistFilling(filling);
  }

  if (series.length > 0) {
    if (!highDate) {
      highDate = localDateFromISO(series[0]);
    }
    if (!lowDate) {
      lowDate = localDateFromISO(series[series.length - 1]);
    }
  }

  const consistentSeries = [];

  let highGapDate = highDate;
  for (const item of series) {
    const itemDate = localDateFromISO(item.timestamp);
    await fillGap(highGapDate, itemDate + 1 * 60 * 1000);
    consistentSeries.push(item);
    highGapDate = itemDate - 1 * 60 * 1000;
  }
  await fillGap(highGapDate, lowDate);

  return consistentSeries;
}

module.exports = {
  mapAsyncIterable,
  transformAllObjectProperties,
  localDateFromISO,
  localDateToISO,
  generateDateRange,
  makeNullCandle,
  trimOrderedTimestampedSeries,
  fillGapsInOrderedTimestampedSeries,
};
