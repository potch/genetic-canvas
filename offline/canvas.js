export class Canvas {
  constructor (width, height) {
    this.width = width;
    this.height = height;
    this.context2d = new Canvas2DContext(this.width, this.height);
  }

  getContext(type) {
    if (type === '2d') {
      return this.context2d;
    }
    throw new Error(`context type "${type}" not supported`);
  }
}

class Canvas2DContext {
  constructor (width, height) {
    this.width = width;
    this.height = height;
    this.imageData = new Uint8ClampedArray(width * height * 4);
    this._fillColor = { r: 0, g: 0, b: 0, a: 255 };
  }

  // nearest neighbor because easy.
  drawImage(canvas, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    let ctx = canvas.getContext('2d');
    let id = ctx.getImageData(sx, sy, sWidth, sHeight);

    for (let py = dy; py < dy + dHeight; py++) {
      for (let px = dx; px < dx + dWidth; px++) {
        let tx = Math.round((px - dx) * sWidth / dWidth + sx);
        let ty = Math.round((py - dy) * sHeight / dHeight + sy);
        let sIdx = (ty * id.width + tx) * 4;
        this._paintPixel(
          id.data[sIdx],
          id.data[sIdx + 1],
          id.data[sIdx + 2],
          id.data[sIdx + 3],
          px, py
        );
      }
    }
  }

  set fillStyle(s) {
    this._fillColor = s;
  }

  fillRect(x, y, width, height) {
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        this._paintPixel(
          this._fillColor.r,
          this._fillColor.g,
          this._fillColor.b,
          this._fillColor.a,
          px, py
        );
      }
    }
  }

  getImageData(x, y, width, height) {
    if (x === 0 && y === 0 && width === this.width && height === this.height) {
      return {
        width, height,
        data: this.imageData.slice(0)
      };
    }
    let data = new Uint8ClampedArray(width * height * 4);
    let pos = 0;
    for (let py = y; py < y + height; py++) {
      for (let px = x; px < x + width; px++) {
        let pIdx = (py * this.width + px) * 4;
        data[pos] = this.imageData[pIdx];
        data[pos + 1] = this.imageData[pIdx + 1];
        data[pos + 2] = this.imageData[pIdx + 2];
        data[pos + 3] = this.imageData[pIdx + 3];
        pos += 4;
      }
    }
    return { width, height, data };
  }

  putImageData(id, x, y) {
    if (x === 0 && y === 0 && id.width === this.width && id.height === this.height) {
      this.imageData = id.data.slice(0);
    }
    for (let py = y; py < y + id.height; py++) {
      for (let px = x; px < x + id.width; px++) {
        let pIdx = (py * this.width + px) * 4;
        let sIdx = ((py - y) * id.width + (px - x)) * 4;
        this.imageData[pIdx] = id.data[sIdx];
        this.imageData[pIdx + 1] = id.data[sIdx + 1];
        this.imageData[pIdx + 2] = id.data[sIdx + 2];
        this.imageData[pIdx + 3] = id.data[sIdx + 3];
      }
    }
  }

  _paintPixel(r, g, b, a, x, y) {
    let idx = (y * this.width + x) * 4;
    let data = this.imageData;

    let aDest = data[idx + 3] / 255;
    let rDest = data[idx] / 255 * aDest;
    let gDest = data[idx + 1] / 255 * aDest;
    let bDest = data[idx + 2] / 255 * aDest;

    let aSrc = a / 255;
    let rSrc = r / 255 * aSrc;
    let gSrc = g / 255 * aSrc;
    let bSrc = b / 255 * aSrc;

    let aOut = (aSrc + aDest * (1 - aSrc));
    data[idx + 3] = aOut * 255 | 0;
    data[idx] = ((rSrc + rDest * (1 - aSrc))) / aOut * 255 | 0;
    data[idx + 1] = (gSrc + gDest * (1 - aSrc)) / aOut * 255 | 0;
    data[idx + 2] = (bSrc + bDest * (1 - aSrc)) / aOut * 255 | 0;
  }

}
