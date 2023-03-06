const connectToDB = require("./connectToDB");
const { loadChart } = require("./backendService");

const axios = require("axios");
jest.mock("axios");
// const AxiosMockAdapter = require("axios-mock-adapter");
// const axiosMock = new AxiosMockAdapter(axios, { onNoMatch: "throwException" });

let db;

const Tester = {
  async haveCandles(timestamps, value) {
    return db.query().insert(
      timestamps.map((timestamp) => ({
        timestamp: new Date(timestamp).toISOString(),
        O: value + 1,
        H: value + 2,
        L: value + 3,
        C: value + 4,
      }))
    );
  },
  async grabFromDB() {
    return db.selectQuery();
  },
};

beforeAll(async () => {
  db = await connectToDB();
});

beforeEach(async () => {
  await db.startTransaction();
});

afterEach(async () => {
  await db.rollbackTransaction();
  jest.resetAllMocks();
});

afterAll(async () => {
  await db.destroy();
});

describe("get ChartFromBroker", () => {
  test("get chart overlapping time off", async () => {
    await Tester.haveCandles(
      [
        "2023-02-23T21:31Z",
        "2023-02-23T21:30Z",
        "2023-02-23T21:25Z",
        "2023-02-23T21:24Z",
        "2023-02-23T21:22Z",
      ],
      1000
    );

    axios.get.mockResolvedValueOnce({
      data: {
        data: [
          "2023-02-23T21:28:00+00:00,2001,2002,2003,2004",
          "2023-02-23T21:27:00+00:00,2001,2002,2003,2004",
        ],
      },
    });

    axios.get.mockResolvedValueOnce({
      data: { data: ["2023-02-23T21:23:00+00:00,2001,2002,2003,2004"] },
    });

    const chart = await loadChart(
      db,
      new Date("2023-02-23T21:30Z").getTime(),
      new Date("2023-02-23T21:23Z").getTime()
    );

    expect(axios.get.mock.calls).toHaveLength(2);
    expect(axios.get.mock.calls[0]).toEqual([
      "https://charts.finsa.com.au/data/minute/67995/mid",
      { params: { m: "2023-02-23T21:30:00.000Z", l: 4 } },
    ]);
    expect(axios.get.mock.calls[1]).toEqual([
      "https://charts.finsa.com.au/data/minute/67995/mid",
      { params: { m: "2023-02-23T21:24:00.000Z", l: 1 } },
    ]);

    expect(chart).toMatchObject([
      { timestamp: "2023-02-23T21:30:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:29:00.000Z", O: null },
      { timestamp: "2023-02-23T21:28:00.000Z", O: 2001 },
      { timestamp: "2023-02-23T21:27:00.000Z", O: 2001 },
      { timestamp: "2023-02-23T21:26:00.000Z", O: null },
      { timestamp: "2023-02-23T21:25:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:24:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:23:00.000Z", O: 2001 },
    ]);

    const dbState = await Tester.grabFromDB();
    expect(dbState).toMatchObject([
      { timestamp: "2023-02-23T21:31:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:30:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:29:00.000Z", O: null },
      { timestamp: "2023-02-23T21:28:00.000Z", O: 2001 },
      { timestamp: "2023-02-23T21:27:00.000Z", O: 2001 },
      { timestamp: "2023-02-23T21:26:00.000Z", O: null },
      { timestamp: "2023-02-23T21:25:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:24:00.000Z", O: 1001 },
      { timestamp: "2023-02-23T21:23:00.000Z", O: 2001 },
      { timestamp: "2023-02-23T21:22:00.000Z", O: 1001 },
    ]);
  });
});
