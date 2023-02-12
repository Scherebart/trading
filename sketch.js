function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
}

function draw() {
  if (mouseIsPressed) {
    fill(0);
  } else {
    fill(123,56,89);
  }
  ellipse(mouseX, mouseY, 80, 80);
}
