const colorTools = (function () {
  //===========================================================================
  // Module-wide Constants
  //===========================================================================
  const HEX_RADIX = 16;
  const MAX_RGB_VALUE = 255;

  //===========================================================================
  // Static utilities
  //===========================================================================

  const clampRGB = function (roughValue) {
    let value = Number.parseInt(roughValue);
    value = Math.max(value, 0);
    value = Math.min(value, MAX_RGB_VALUE);
    return value;
  }

  const clampAlpha = function (roughValue) {
    if (roughValue === null || roughValue === undefined) {
      return 1; // No alpha channel; make it opaque.
    }
    let value = Number.parseInt(roughValue);
    value = Math.max(value, 0);
    value = Math.min(value, 1);
    return value;
  }

  //===========================================================================
  // Color
  //===========================================================================

  class Color {
    constructor (r, g, b, a = 1) {
      this.red = clampRGB(r);
      this.green = clampRGB(g);
      this.blue = clampRGB(b);
      this.alpha = clampAlpha(a);
    }

    get brightness () {
      return this.alpha * (
        (this.red * 0.2126) +
        (this.green * 0.7152) +
        (this.blue * 0.0722)
      );
    }

    toRGBAString () {
      return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
    }

    toHexString () {
      const r = this.red.toString(HEX_RADIX);
      const g = this.green.toString(HEX_RADIX);
      const b = this.blue.toString(HEX_RADIX);
      const a = Math.round(this.alpha.toString(HEX_RADIX) * MAX_RGB_VALUE);
      
      return `#${r}${g}${b}${a}`;
    }
  }

  //===========================================================================
  // Gradient Map
  //===========================================================================
  class GradientMap {
    constructor (stops) {
      this._stopNumbers = Object.keys(stops).sort((a, b) => a - b);
      this._stops = Object.assign({}, stops);
    }
  
    get firstStopNumber () {
      return this._stopNumbers[0];
    }
  
    get lastStopNumber () {
      return this._stopNumbers[this._stopNumbers.length - 1];
    }
  
    getColorAt (num) {
      if (num <= this.firstStopNumber) {
        return this._stops[this.firstStopNumber];
      }
  
      if (num >= this.lastStopNumber()) {
        return this._stops[this.lastStopNumber];
      }
  
      // Find the nearest stops.
      let indexBelow = this._stopIndexBelow(num);
      let lowerNum = this._stopNumbers[indexBelow];
      if (lowerNum == num) {
        // The number is equal to this stop!
        return this._stops[lowerNum];
      }
  
      // Interpolate between the nearest stops.
      let upperNum = this._stopNumbers[indexBelow + 1];
      if (lowerNum > num || upperNum <= num) {
        throw new Error(`${num} not between ${lowerNum} and ${upperNum}`);
      }
      const color = this._interpolateColor(
        this._stops[lowerNum],
        this._stops[upperNum],
        (num - lowerNum) / (upperNum - lowerNum)
      );
      return this._colorToString(color);
    }
  
    _stopIndexBelow (num) {
      let minIndex = 0;
      let maxIndex = this._stopNumbers.length - 1;
      let i = 0;
      while (minIndex < maxIndex) {
        i = Math.floor((maxIndex + minIndex) / 2);
        if (this._stopNumbers[i] > num) {
          maxIndex = i;
        } else {
          minIndex = i + 1;
        }
      }
      return i;
    }
  
    // A fractionB between 0 and 1 represents a part-way point
    // between colorA and colorB.
    _interpolateColor (colorA, colorB, fractionB) {
      if (fractionB <= 0) {
        return Object.assign({}, colorA);
      }
  
      if (fractionB >= 1) {
        return Object.assign({}, colorB);
      }
  
      const fractionA = 1 - fractionB;
      return {
        red: (colorA.red * fractionA) + (colorB.red * fractionB),
        green: (colorA.green * fractionA) + (colorB.green * fractionB),
        blue: (colorA.blue * fractionA) + (colorB.blue * fractionB),
      };
    }
  }

  //===========================================================================
  // Color Parsing
  //===========================================================================
  const parseColor = function (arg) {
    if ('red' in arg) {
      // It's an RGB or RGBA object.
      return new Color(arg.red, arg.green, arg.blue, arg.alpha);
    }

    if ('string' == typeof arg) {
      try {
        if (arg.startsWith('rgb')) {
          if (arg.startsWith('rgba')) {
            return _parseRGBAColor(arg);
          } else {
            return _parseRGBColor(arg);
          }
        } else if (arg.startsWith('#')) {
          return _parseHexColor(arg);
        }
        throw new Error("Only RGB, RGBA, and hex color strings are supported.");
      } catch (err) {
        throw new Error(
          "Unsupported color string: " + arg,
          { cause: err }
        );
      }
    } else {
      throw new Error("Cannot parse color from non-string: " + arg);
    }
  };

  const RGB_REGEX = /^rgb\( *(\d+), *(\d+), *(\d+) *\)$/i;

  const _parseRGBColor = function (str) {
    if (RGB_REGEX.test(str)) {
      let [, r, g, b] = str.match(RGB_REGEX);
      return new Color(
        Number.parseFloat(r),
        Number.parseFloat(g),
        Number.parseFloat(b)
      );
    } else {
      throw new Error("Unsupported RGB format: " + str);
    }
  };

  const RGBA_REGEX = /^rgba\( *(\d+), *(\d+), *(\d+), *([01]?\.?\d+) *\)$/i;

  const _parseRGBAColor = function (str) {
    if (RGBA_REGEX.test(str)) {
      const [, r, g, b, a] = str.match(RGBA_REGEX);
      return new Color(
        Number.parseFloat(r),
        Number.parseFloat(g),
        Number.parseFloat(b),
        Number.parseFloat(a)
      );
    } else {
      throw new Error("Unsupported RGBA format: " + str);
    }
  };

  const HEX_REGEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
  const SHORT_HEX_REGEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
  const SHORT_HEX_MULTIPLIER = 17; // 0xF == 15, and 15 * 17 == 255

  const _parseHexColor = function (str) {
    let r, g, b, a;
    let multiplier = 1;
    if (HEX_REGEX.test(str)) {
      [, r, g, b, a] = str.match(HEX_REGEX);
    } else if (SHORT_HEX_REGEX.test(str)) {
      [, r, g, b, a] = str.match(SHORT_HEX_REGEX);
      multiplier = SHORT_HEX_MULTIPLIER;
    } else {
      throw new Error("Unsupported hex format: " + str);
    }

    let alpha = 1;
    if (a !== null) {
      alpha = (Number.parseInt(a, HEX_RADIX) * multiplier) / MAX_RGB_VALUE;
    }

    return new Color(
      Number.parseInt(r, HEX_RADIX) * multiplier,
      Number.parseInt(g, HEX_RADIX) * multiplier,
      Number.parseInt(b, HEX_RADIX) * multiplier,
      alpha
    );
  };

  //===========================================================================
  // Module Return
  //===========================================================================
  return {
    Color,
    GradientMap,
    parseColor,
  };
}());

export default colorTools;