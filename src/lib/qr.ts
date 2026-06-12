// Minimal QR code generator — byte mode, ECC level M, versions 1–10.
// Port of the public-domain "QR Code generator library" algorithm by Project
// Nayuki (https://www.nayuki.io/page/qr-code-generator-library), trimmed to
// what the shop poster needs. No external dependencies; output is a boolean
// module matrix and an SVG string. QR codes must stay dark-on-light for
// scanner compatibility — do not theme the SVG colors.

const MIN_VERSION = 1;
const MAX_VERSION = 10;

// ECC level M tables, indexed by version (index 0 unused).
const ECC_CODEWORDS_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_ERROR_CORRECTION_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

// Format bits for ECC level M = 0b00 (per QR spec table).
const ECC_FORMAT_BITS = 0;

function getNumRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}

function getNumDataCodewords(ver: number): number {
  return Math.floor(getNumRawDataModules(ver) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ver] * NUM_ERROR_CORRECTION_BLOCKS[ver];
}

// ── Reed–Solomon over GF(2^8 / 0x11D) ──────────────────────────────────────

function rsMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsComputeDivisor(degree: number): number[] {
  const result: number[] = new Array(degree - 1).fill(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = rsMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 0x02);
  }
  return result;
}

function rsComputeRemainder(data: number[], divisor: number[]): number[] {
  const result: number[] = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= rsMultiply(coef, factor);
    });
  }
  return result;
}

// ── Bit buffer helpers ──────────────────────────────────────────────────────

function appendBits(bb: number[], val: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1);
}

// ── Codeword assembly ───────────────────────────────────────────────────────

function addEccAndInterleave(data: number[], ver: number): number[] {
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ver];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ver];
  const rawCodewords = Math.floor(getNumRawDataModules(ver) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = rsComputeDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      // Skip the padding byte in short blocks
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// ── Matrix construction ─────────────────────────────────────────────────────

interface QrGrid {
  size: number;
  modules: boolean[][];
  isFunction: boolean[][];
}

function makeGrid(size: number): QrGrid {
  return {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    isFunction: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
  };
}

function setFunctionModule(g: QrGrid, x: number, y: number, isDark: boolean): void {
  g.modules[y][x] = isDark;
  g.isFunction[y][x] = true;
}

function getAlignmentPatternPositions(ver: number, size: number): number[] {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function drawFinderPattern(g: QrGrid, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < g.size && yy >= 0 && yy < g.size) {
        setFunctionModule(g, xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }
}

function drawAlignmentPattern(g: QrGrid, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunctionModule(g, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFormatBits(g: QrGrid, mask: number): void {
  const data = (ECC_FORMAT_BITS << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i++) setFunctionModule(g, 8, i, ((bits >>> i) & 1) !== 0);
  setFunctionModule(g, 8, 7, ((bits >>> 6) & 1) !== 0);
  setFunctionModule(g, 8, 8, ((bits >>> 7) & 1) !== 0);
  setFunctionModule(g, 7, 8, ((bits >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i++) setFunctionModule(g, 14 - i, 8, ((bits >>> i) & 1) !== 0);

  for (let i = 0; i < 8; i++) setFunctionModule(g, g.size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i++) setFunctionModule(g, 8, g.size - 15 + i, ((bits >>> i) & 1) !== 0);
  setFunctionModule(g, 8, g.size - 8, true); // Dark module
}

function drawVersion(g: QrGrid, ver: number): void {
  if (ver < 7) return;
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (ver << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const color = ((bits >>> i) & 1) !== 0;
    const a = g.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(g, a, b, color);
    setFunctionModule(g, b, a, color);
  }
}

function drawFunctionPatterns(g: QrGrid, ver: number): void {
  // Timing patterns
  for (let i = 0; i < g.size; i++) {
    setFunctionModule(g, 6, i, i % 2 === 0);
    setFunctionModule(g, i, 6, i % 2 === 0);
  }
  // Finder patterns
  drawFinderPattern(g, 3, 3);
  drawFinderPattern(g, g.size - 4, 3);
  drawFinderPattern(g, 3, g.size - 4);
  // Alignment patterns
  const alignPos = getAlignmentPatternPositions(ver, g.size);
  const numAlign = alignPos.length;
  for (let i = 0; i < numAlign; i++) {
    for (let j = 0; j < numAlign; j++) {
      if (!((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0))) {
        drawAlignmentPattern(g, alignPos[i], alignPos[j]);
      }
    }
  }
  drawFormatBits(g, 0); // placeholder, overwritten after mask selection
  drawVersion(g, ver);
}

function drawCodewords(g: QrGrid, data: number[]): void {
  let i = 0; // bit index
  for (let right = g.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < g.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? g.size - 1 - vert : vert;
        if (!g.isFunction[y][x] && i < data.length * 8) {
          g.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }
}

function applyMask(g: QrGrid, mask: number): void {
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      let invert: boolean;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
        case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
        default: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
      }
      if (!g.isFunction[y][x] && invert) g.modules[y][x] = !g.modules[y][x];
    }
  }
}

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

function finderPenaltyCountPatterns(runHistory: number[]): number {
  const n = runHistory[1];
  const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
  return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0) +
    (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
}

function finderPenaltyTerminateAndCount(currentRunColor: boolean, currentRunLength: number, runHistory: number[], size: number): number {
  if (currentRunColor) {
    finderPenaltyAddHistory(currentRunLength, runHistory, size);
    currentRunLength = 0;
  }
  currentRunLength += size;
  finderPenaltyAddHistory(currentRunLength, runHistory, size);
  return finderPenaltyCountPatterns(runHistory);
}

function finderPenaltyAddHistory(currentRunLength: number, runHistory: number[], size: number): void {
  if (runHistory[0] === 0) currentRunLength += size;
  runHistory.pop();
  runHistory.unshift(currentRunLength);
}

function getPenaltyScore(g: QrGrid): number {
  let result = 0;
  const size = g.size;

  // Adjacent modules in row/column with same color, and finder-like patterns
  for (let y = 0; y < size; y++) {
    let runColor = false;
    let runX = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x++) {
      if (g.modules[y][x] === runColor) {
        runX++;
        if (runX === 5) result += PENALTY_N1;
        else if (runX > 5) result++;
      } else {
        finderPenaltyAddHistory(runX, runHistory, size);
        if (!runColor) result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        runColor = g.modules[y][x];
        runX = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(runColor, runX, runHistory, size) * PENALTY_N3;
  }
  for (let x = 0; x < size; x++) {
    let runColor = false;
    let runY = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y++) {
      if (g.modules[y][x] === runColor) {
        runY++;
        if (runY === 5) result += PENALTY_N1;
        else if (runY > 5) result++;
      } else {
        finderPenaltyAddHistory(runY, runHistory, size);
        if (!runColor) result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        runColor = g.modules[y][x];
        runY = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(runColor, runY, runHistory, size) * PENALTY_N3;
  }

  // 2×2 blocks of same color
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = g.modules[y][x];
      if (c === g.modules[y][x + 1] && c === g.modules[y + 1][x] && c === g.modules[y + 1][x + 1]) {
        result += PENALTY_N2;
      }
    }
  }

  // Balance of dark modules
  let dark = 0;
  for (const row of g.modules) for (const cell of row) if (cell) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * PENALTY_N4;

  return result;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Encode text as a QR code module matrix (true = dark).
 * Byte mode, ECC level M, automatic version 1–10 (up to ~213 bytes).
 */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));

  // Pick the smallest version that fits
  let version = -1;
  let dataUsedBits = 0;
  for (let ver = MIN_VERSION; ver <= MAX_VERSION; ver++) {
    const charCountBits = ver <= 9 ? 8 : 16;
    const used = 4 + charCountBits + bytes.length * 8;
    if (used <= getNumDataCodewords(ver) * 8) {
      version = ver;
      dataUsedBits = used;
      break;
    }
  }
  if (version === -1) throw new Error(`Text too long for QR version ${MAX_VERSION} (${bytes.length} bytes)`);

  // Build the bit stream: mode indicator (0100 = byte), char count, data
  const bb: number[] = [];
  appendBits(bb, 4, 4);
  appendBits(bb, bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) appendBits(bb, b, 8);
  if (bb.length !== dataUsedBits) throw new Error("Bit length assertion failed");

  // Terminator + bit padding
  const dataCapacityBits = getNumDataCodewords(version) * 8;
  appendBits(bb, 0, Math.min(4, dataCapacityBits - bb.length));
  appendBits(bb, 0, (8 - bb.length % 8) % 8);

  // Byte padding (0xEC, 0x11 alternating)
  for (let padByte = 0xec; bb.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
    appendBits(bb, padByte, 8);
  }

  // Pack bits into codewords
  const dataCodewords: number[] = new Array(bb.length / 8).fill(0);
  bb.forEach((bit, i) => {
    dataCodewords[i >>> 3] |= bit << (7 - (i & 7));
  });

  const allCodewords = addEccAndInterleave(dataCodewords, version);

  // Build the matrix
  const size = version * 4 + 17;
  const g = makeGrid(size);
  drawFunctionPatterns(g, version);
  drawCodewords(g, allCodewords);

  // Choose the mask with the lowest penalty
  let bestMask = 0;
  let minPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(g, mask);
    drawFormatBits(g, mask);
    const penalty = getPenaltyScore(g);
    if (penalty < minPenalty) {
      bestMask = mask;
      minPenalty = penalty;
    }
    applyMask(g, mask); // undo (XOR is self-inverse)
  }
  applyMask(g, bestMask);
  drawFormatBits(g, bestMask);

  return g.modules;
}

/**
 * Render text as an SVG QR code string. Always dark-on-light (#1A1613 on
 * #FFFFFF) — QR codes must keep high contrast to scan reliably.
 */
export function qrSvg(text: string, options?: { moduleSize?: number; margin?: number }): string {
  const matrix = qrMatrix(text);
  const moduleSize = options?.moduleSize ?? 8;
  const margin = options?.margin ?? 4;
  const size = matrix.length;
  const dim = (size + margin * 2) * moduleSize;

  let path = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        path += `M${(x + margin) * moduleSize} ${(y + margin) * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#FFFFFF"/><path d="${path}" fill="#1A1613"/></svg>`;
}
