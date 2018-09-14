function plotTriangleHalf(id, color, x1, y1, x2, y2, x3)
{
  let px1 = x1;
  let py1 = y1;
  let s1x = x1 < x2 ? 1 : -1;
  let d1x = (x2 - x1) * s1x;
  let sy = y1 < y2 ? 1 : -1;
  let dy = (y2 - y1) * -sy;
  let err1 = d1x + dy;
  let e21;

  let px2 = x1;
  let py2 = y1;
  let s2x = x1 < x3 ? 1 : -1;
  let d2x = (x3 - x1) * s2x;
  let err2 = d2x + dy;
  let e22;

  for (let q2 = 0; q2 < 1000; q2++) {
    setPixel(id, color, px1, py1);
    if (px1 === x2 && py1 === y2) break;
    e21 = 2 * err1;
    if (e21 >= dy) { err1 += dy; px1 += s1x; }
    if (e21 <= d1x) {
      err1 += d1x;
      py1 += sy;
      for (let q = 0; q < 1000; q++) {
        setPixel(id, color, px2, py2);
        e22 = 2 * err2;
    	if (e22 >= dy) { err2 += dy; px2 += s2x; }
        if (e22 <= d2x) {
          err2 += d2x;
          py2 += sy;
        }
        if (py2 === py1) break;
      }
      for (let fx = px1 + 1; fx < px2; fx++) {
        setPixel(id, color, fx, py1);
      }
    }
  }
}

export function drawTriangle(id, color, x1, y1, x2, y2, x3, y3) {
  let xa = x1;
  let ya = y1;
  let xb = x2;
  let yb = y2;
  let xc = x3;
  let yc = y3;
  // sort verticies for topmost
  if (yb < ya) {
    [ya, yb] = [yb, ya];
    [xa, xb] = [xb, xa];
  }
  if (yc < yb) {
    [yb, yc] = [yc, yb];
    [xb, xc] = [xc, xb];
  }
  if (yb < ya) {
    [ya, yb] = [yb, ya];
    [xa, xb] = [xb, xa];
  }

  // cut triangle in half vertically
  let xa1 = xa;
  let ya1 = ya;
  let xb1 = xb;
  let yb1 = yb;
  let xc1 = Math.round(xa + (xc - xa) * (yb - ya) / (yc - ya));

  if (xc1 < xb1) {
    [xb1, xc1] = [xc1, xb1];
  }

  plotTriangleHalf(id, color, xa1, ya1, xb1, yb1, xc1);

  if (yc - yb > 1) {
    // other half
    let xa2 = xc;
    let ya2 = yc;
    let yb2 = yb+1;
    let xb2 = Math.round(xb + (xc - xb) * 1 / (yc - yb2));
    let xc2 = Math.round(xa + (xc - xa) * (yb2 - ya) / (yc - ya));

    if (xc2 < xb2) {
      [xb2, xc2] = [xc2, xb2];
    }

    plotTriangleHalf(id, color, xa2, ya2, xb2, yb2, xc2);

  }
}

function setPixel(id, color, x, y) {
  if (x < 0 || x > id.width ||
      y < 0 || y > id.height ||
      color.a === 0
    ) {
    return;
  }
  
  let idx = (y * id.width + x) * 4;
  let data = id.data;
  let aDest = data[idx + 3] / 255;
  let aSrc = color.a / 255;
  let iASrc = 1 - aSrc;
  let aOut = (aSrc + aDest * iASrc);

  data[idx + 3] = aOut * 255 | 0;
  data[idx] = ((color.r * aSrc + data[idx] * aDest * iASrc)) / aOut | 0;
  data[idx + 1] = ((color.g * aSrc + data[idx + 1] * aDest * iASrc)) / aOut | 0;
  data[idx + 2] = ((color.b * aSrc + data[idx + 2] * aDest * iASrc)) / aOut | 0;
}
