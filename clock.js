const LIVE = true;

const CLOCK_MULT = 1;
const CLOCK_TRANS = null;
const CLOCK_TIME_ZERO = null; // "2023-02-24T13:31Z";

module.exports = function getClock() {
  const dateStart = Date.now();

  const dateDiff = CLOCK_TIME_ZERO
    ? new Date(CLOCK_TIME_ZERO) - dateStart
    : CLOCK_TRANS
    ? CLOCK_TRANS * 1000
    : 0;

  function currentDate() {
    if (LIVE) {
      return Date.now();
    }

    let date = new Date();
    date = new Date(dateStart + (Date.now() - dateStart) * CLOCK_MULT);
    date = new Date(date.getTime() + dateDiff);

    return date.getTime();
  }

  function getLastMinutePassed() {
    const date = new Date(currentDate() - 1 * 60 * 1000);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date.getTime();
  }

  async function awaitUntil(nextMinuteToPass) {
    return new Promise((res) =>
      setTimeout(
        () => res(nextMinuteToPass),
        (nextMinuteToPass + 1 * 60 * 1000 - currentDate()) / CLOCK_MULT
      )
    );
  }

  let lastMinuteAwaited = null;
  async function awaitNextMinute(additionalDelay) {
    const lastMinutePassed = getLastMinutePassed();

    if (lastMinuteAwaited) {
      if (lastMinuteAwaited < lastMinutePassed) {
        lastMinuteAwaited = lastMinutePassed;
      } else {
        lastMinuteAwaited = lastMinutePassed + 1 * 60 * 1000;
        await awaitUntil(lastMinuteAwaited + additionalDelay);
      }
    } else {
      lastMinuteAwaited = lastMinutePassed;
    }

    return lastMinuteAwaited;
  }

  return {
    awaitNextMinute,
    currentDate,
    getLastMinutePassed
  };
};
