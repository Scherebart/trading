const CLOCK_MULT = 5;
const CLOCK_TRANS = 0;
const CLOCK_TIME_ZERO = "2024-01-19T13:31Z";

module.exports = function getClock() {
  const dateStart = Date.now();
  const dateDiff = CLOCK_TIME_ZERO
    ? new Date(CLOCK_TIME_ZERO) - dateStart
    : CLOCK_TRANS * 1000;

  function currentDate() {
    let date = new Date();

    date = new Date(dateStart + (Date.now() - dateStart) * CLOCK_MULT);
    date = new Date(date.getTime() + dateDiff);

    return date.getTime();
  }

  function getLastMinutePassed() {
    const date = new Date(currentDate());
    date.setSeconds(0);
    date.setMilliseconds(0);
  
    return date.getTime();
  }

  async function awaitUntil(targetUnixTime) {
    return new Promise((res) =>
      setTimeout(
        () => res(targetUnixTime),
        (targetUnixTime - currentDate()) / CLOCK_MULT
      )
    );
  }

  let lastMinuteAwaited = null;
  async function awaitNextMinute() {
    const lastMinutePassed = getLastMinutePassed();

    if (lastMinuteAwaited) {
      if (lastMinuteAwaited < lastMinutePassed) {
        lastMinuteAwaited = lastMinutePassed;
      } else {
        lastMinuteAwaited = lastMinutePassed + 1 * 60 * 1000;
        await awaitUntil(lastMinuteAwaited + 200);
      }
    } else {
      lastMinuteAwaited = lastMinutePassed;
    }

    return lastMinuteAwaited;
  }

  return {
    awaitNextMinute,
  };
};
