const fs = require('fs');
const path = require('path');
const readline = require('readline');

const pngparse = require('pngParse');
const parseArgs = require('minimist');

let args = parseArgs(process.argv.slice(2));

import { Canvas } from './canvas.js';
import { drawTriangle } from './rasterize.js';

try {
  fs.mkdirSync(path.join('.','out'));
} catch (e) {
  console.warn('output directory already exists');
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

function score(ctx, masterID) {
  var total = 0;
  var id = ctx.getImageData(0, 0, w, h);
  for (var i = 0; i < id.data.length; i+=4*skip) {
    total += diff(
      id.data[i], id.data[i+1], id.data[i+2],
      masterID.data[i], masterID.data[i+1], masterID.data[i+2]
    );
  }
  return (total / w / h / skip);
}

function diff(r, g, b, r2, g2, b2) {
  let y1 = r * .299 + g * .587 + .114 * b;
  let y2 = r2 * .299 + g2 * .587 + .114 * b2;
  let yd = (y2 - y1) / 255;
  let rd = (r2 - r) / 255;
  let gd = (g2 - g) / 255;
  let bd = (b2 - b) / 255;
  return yd * yd * .7 + (rd * rd + gd * gd + bd * bd) / 10;
}

function draw(ctx, dna) {
  let r = dna[0];
  let g = dna[1];
  let b = dna[2];
  let a, x, y;

  ctx.fillStyle = {r,g,b,a:255};
  ctx.fillRect(0, 0, w, h);
  let id = ctx.getImageData(0, 0, w, h);

  var polys = [];
  for (var i = 3; i < dna.length; i += 11) {
    var poly = [];
    poly.push(dna[i])
    r = dna[i + 1];
    g = dna[i + 2];
    b = dna[i + 3];
    a = dna[i + 4];
    poly.push({r, g, b, a});
    for (var j = 0; j < 3; j++) {
      poly.push(dna[i + 5 + j * 2] / 255 * w|0, dna[i + 6 + j * 2] / 255 * h|0);
    }
    polys.push(poly);
  }
  polys.sort(function sort(a,b) {
    return a[0] - b[0];
  });

  polys.forEach(function drawPoly(o) {
    drawTriangle(id, o[1], ...o.slice(2));
  });
  ctx.putImageData(id, 0, 0, w, h);
}

function drawSVG(dna, gen) {

  let r = dna[0];
  let g = dna[1];
  let b = dna[2];
  let bgColor = `rgb(${r},${g},${b})`;
  let a, x, y;

  let polys = [];
  for (var i = 3; i < dna.length; i += 11) {
    var poly = [];
    poly.push(dna[i]);
    r = dna[i + 1];
    g = dna[i + 2];
    b = dna[i + 3];
    a = dna[i + 4];
    poly.push(`<path fill="rgba(${r},${g},${b},${a/255})" d="M${dna[i+5]},${dna[i+6]}L${dna[i+7]} ${dna[i+8]},${dna[i+9]},${dna[i+10]}z"/>`);
    polys.push(poly);
  }
  polys.sort(function (a,b) {
    return a[0] - b[0];
  });

  let out = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" style="background:${bgColor}">
  ${polys.map(p => p[1]).join('')}
</svg>`;

  fs.writeFileSync(path.join('.', 'out', 'gen-' + pad(gen, 7) + '.svg'), out);

}

function padHex(n) {
  return ('0' + n.toString(16)).substr(-2);
}

function pad(n, w) {
  return ('0'.repeat(w) + n.toString()).substr(-w);
}

const size = parseInt(args.size, 10) || parseInt(args.s, 10) || 256;
const n = parseInt(args.num, 10) || parseInt(args.n, 10) || 100;
const limit = parseInt(args.limit, 10) || parseInt(args.l, 10) || Infinity;
const decay = parseInt(args.decay, 10) || parseInt(args.d, 10) || 1e5;
const snapshot = parseInt(args.snapshot, 10) || parseInt(args.p, 10) || 10000;
const w = size;
const h = size;
const filePath = path.join(process.cwd(), args._[0]);
let radiation;
let dna = [];
let gen = 0;
let skip = 1;

console.log(`${'*'.repeat(20)}
Image:             ${filePath}
Number of shapes:  ${n}
Canvas size:       ${size}
Generation limit:  ${limit}
Mutation Falloff:  ${decay}
Snapshot Interval: ${snapshot}
${'*'.repeat(20)}`);

console.log('press q to quit');

pngparse.parseFile(filePath, (err, data) => {
  if (err) {
    throw err;
  }
  let ntp = 0;
  for (let i = 0; i < data.data.length; i+=4) {
    if (data.data[i+3] !== 0) {
      ntp++
    }
  }
  console.log('found ' + ntp + ' non-transparent pixels.');

  let input = new Canvas(data.width, data.height);
  let inputCtx = input.getContext('2d');
  inputCtx.putImageData(data, 0, 0);

  startGenetics(input);
});

process.stdin.on('keypress', (str, key) => {
  if (str === 'q') {
    console.log('exiting...');
    finalize();
    process.exit();
  }
  if (str === 's') {
    drawSVG(dna, gen);
    console.log('writing snapshot at generation ' + gen);
  }
  if (str === 'k') {
    skip = (skip + 1) % 10 + 1;
    console.log('scoring skip set to ' + skip);
  }
});

function finalize() {
  fs.writeFileSync('./dna.txt', dna.map(padHex).join(''));
  drawSVG(dna, gen);
}

function startGenetics(input) {

  for (var i = 0; i < n * 11 + 3; i++) {
    dna.push(Math.random() * 256 | 0);
  }

  let master = new Canvas(w, h);
  let parent = new Canvas(w, h);
  let child = new Canvas(w, h);
  let masterCtx = master.getContext('2d');
  let parentCtx = parent.getContext('2d');
  let childCtx = child.getContext('2d');

  // fill with white
  for (let i = 0; i < masterCtx.imageData.length; i++) {
    masterCtx.imageData[i] = 255;
  }
  // render our input to master
  masterCtx.drawImage(input, 0, 0, input.width, input.height, 0, 0, w, h);
  let masterID = masterCtx.getImageData(0, 0, w, h);

  let improvements = 0;
  let lastGen = Date.now() - 1000;
  let parentScore = Infinity;

  function generation() {

    let childDna = dna.slice(0);
    for (let i = 0; i < Math.pow(100, radiation); i++) {
      let gene = Math.random() * dna.length | 0;
      childDna[gene] = childDna[gene] ^ (1 << (Math.random() * 8 | 0));
    }

    draw(childCtx, childDna);

    let childScore = score(childCtx, masterID);

    if (childScore < parentScore) {
      improvements++;
      parentScore = childScore;
      dna = childDna;
      draw(parentCtx, dna);
    }
  }


  let gpsSmooth = 0;

  function batch() {
    radiation = 1 / (1 + gen/decay);

    let sTime = Date.now();
    let cur = gen;
    while (Date.now() - sTime < 500) {
      gen++;
      generation();
      if ((gen % snapshot) < 1) {
        drawSVG(dna, gen);
      }
      if (gen >= limit) {
        drawSVG(dna, gen);
        break;
      }
    }

    let gps = (gen - cur) * 2;
    if (gpsSmooth) {
      gpsSmooth = gps * .1 + (gpsSmooth) * .9
    } else {
      gpsSmooth = gps;
    }
    console.log(`------------------------
generation:   ${gen}
gps:          ${gps}
mutations:    ${Math.pow(100,radiation)|0}
score:        ${(parentScore * 1e6|0)}
improvements: ${improvements}`.trim());
    if (isFinite(limit)) {
      let timeLeft = (limit - gen) / gpsSmooth | 0;
      let secs = pad(timeLeft % 60, 2);
      let mins = pad(timeLeft / 60 | 0, 2);
      let hrs = pad(timeLeft / 3600 | 0, 2);
      console.log(`remaining:    ${hrs}:${mins}:${secs}`);
    }

    if (gen < limit) {
      setTimeout(batch, 0);
    } else {
      finalize
      process.exit();
    }
  }
  drawSVG(dna, gen);
  batch()

}
