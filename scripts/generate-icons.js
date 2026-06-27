/**
 * Generates 16×16, 48×48, and 128×128 indigo (#6366f1) PNG icons.
 * Pure Node.js — no external dependencies.
 */
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')

mkdirSync(outDir, { recursive: true })

// CRC32 lookup table (IEEE polynomial)
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[i] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xff]
  return (~crc) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crcBuf])
}

function createSolidPNG(size, r, g, b) {
  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdrData = Buffer.allocUnsafe(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8
  ihdrData[9] = 2
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  // Raw image data: each row prefixed with filter byte 0 (None)
  const row = Buffer.allocUnsafe(1 + size * 3)
  row[0] = 0 // filter: None
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = r
    row[2 + x * 3] = g
    row[3 + x * 3] = b
  }
  const rows = Buffer.concat(Array.from({ length: size }, () => row))
  const compressed = deflateSync(rows)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// Indigo-500: #6366f1 → rgb(99, 102, 241)
const [R, G, B] = [99, 102, 241]

for (const size of [16, 48, 128]) {
  const png = createSolidPNG(size, R, G, B)
  const dest = join(outDir, `icon${size}.png`)
  writeFileSync(dest, png)
  console.log(`✓ icon${size}.png  (${png.length} bytes)`)
}
