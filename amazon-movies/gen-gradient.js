#!/usr/bin/env node
var Canvas = require('canvas');
var fs = require('fs');

const WIDTH = 250;
const HEIGHT = 450 + 120;
const GRADIENT_STOPS = [
    { position: 0, color: "#1c1c1c" },
    { position: 100, color: "#222222" },
    { position: 500, color: "#070707" },
    { position: HEIGHT, color: "#070707" },
];

var canvas = new Canvas(WIDTH, HEIGHT);
var context = canvas.getContext('2d');

var gradient = context.createLinearGradient(0, 0, WIDTH, 0);
gradient.addColorStop(0, 'white');
gradient.addColorStop(1, 'transparent');
context.fillStyle = gradient;
context.fillRect(0, 0, WIDTH, HEIGHT);

gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
GRADIENT_STOPS.forEach(function(gradientStop) {
    gradient.addColorStop(gradientStop.position / HEIGHT, gradientStop.color);
});
context.globalCompositeOperation = 'source-atop';
context.fillStyle = gradient;
context.fillRect(0, 0, WIDTH, HEIGHT);

var out = fs.createWriteStream("gradient.png");
var stream = canvas.pngStream();
stream.on("data", function(chunk) {
    out.write(chunk);
});

