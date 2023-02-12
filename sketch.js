function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function preload() {
  getChartData();
}

function getChartURL() {
  return "https://charts.finsa.com.au/data/minute/67995/mid?l=3&m=2023-02-10T14:22:00.000Z";
}

function getChartData() {
  httpGet(
    getChartURL(),
    (data) => {
      console.log(data);
    },
    (error) => {
      console.error(error);
    }
  );
}

function draw() {
  background(129);
  frameRate(60);
  if (mouseIsPressed) {
    fill(0);
  } else {
    fill(123, 56, 89);
  }
  ellipse(mouseX, mouseY, 80, 80);
}
