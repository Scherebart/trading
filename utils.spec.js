const {
  fillGapsInCandleSeries,
  generateDateRange,
  makeNullCandle,
} = require("./utils");

describe("fillGapsInCandleSeries", () => {
  test("fillGapsInCandleSeries", async () => {
    const series = [
      "2023-12-26T13:51:00.000Z",
      "2023-12-26T13:49:00.000Z",
      "2023-12-26T13:48:00.000Z",
      "2023-12-26T13:45:00.000Z",
      "2023-12-26T13:43:00.000Z",
    ].map((timestamp) => ({ timestamp, O: 1000, H: 1000, L: 1000, C: 1000 }));

    const makeFilling = (highDate, lowDate) =>
      Array.from(generateDateRange(highDate, lowDate)).map(makeNullCandle);
    const persistFilling = jest.fn();
    const consistentSeries = await fillGapsInCandleSeries({
      series,
      highDate: new Date("2023-12-26T13:50Z").getTime(),
      lowDate: new Date("2023-12-26T13:44Z").getTime(),
      makeFilling,
      persistFilling,
    });

    expect(consistentSeries).toMatchObject([
      { timestamp: "2023-12-26T13:50:00.000Z", O: null },
      { timestamp: "2023-12-26T13:49:00.000Z", O: 1000 },
      { timestamp: "2023-12-26T13:48:00.000Z", O: 1000 },
      { timestamp: "2023-12-26T13:47:00.000Z", O: null },
      { timestamp: "2023-12-26T13:46:00.000Z", O: null },
      { timestamp: "2023-12-26T13:45:00.000Z", O: 1000 },
      { timestamp: "2023-12-26T13:44:00.000Z", O: null },
    ]);

    expect(persistFilling.mock.calls).toHaveLength(3);
    expect(persistFilling.mock.calls[0]).toMatchObject([
      [{ timestamp: "2023-12-26T13:50:00.000Z", O: null }],
    ]);
    expect(persistFilling.mock.calls[1]).toMatchObject([
      [
        { timestamp: "2023-12-26T13:47:00.000Z", O: null },
        { timestamp: "2023-12-26T13:46:00.000Z", O: null },
      ],
    ]);
    expect(persistFilling.mock.calls[2]).toMatchObject([
      [{ timestamp: "2023-12-26T13:44:00.000Z", O: null }],
    ]);
  });
});
