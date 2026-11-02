const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Validates image buffer magic bytes
 * Returns format ('jpg', 'png', 'webp') or null if invalid
 */
function detectImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  // 'R','I','F','F' = 0x52, 0x49, 0x46, 0x46
  // 'W','E','B','P' = 0x57, 0x45, 0x42, 0x50
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Process uploaded buffer:
 * 1. Checks signature
 * 2. Strips EXIF metadata using sharp
 * 3. Saves to /uploads with random uuid filename
 * Returns relative path: `/uploads/${filename}`
 */
async function processAndSaveImage(buffer, originalMimeType) {
  const detectedFormat = detectImageSignature(buffer);

  if (!detectedFormat) {
    const err = new Error('Invalid file signature. File is not a valid JPG, PNG, or WebP image.');
    err.statusCode = 400;
    throw err;
  }

  const filename = `${randomUUID()}.${detectedFormat}`;
  const targetPath = path.join(UPLOADS_DIR, filename);

  // Sharp strips all EXIF metadata by default when converting/saving
  // rotate() auto-orients based on original EXIF orientation before stripping
  let sharpInstance = sharp(buffer).rotate();

  if (detectedFormat === 'jpg') {
    sharpInstance = sharpInstance.jpeg({ quality: 85 });
  } else if (detectedFormat === 'png') {
    sharpInstance = sharpInstance.png({ compressionLevel: 8 });
  } else if (detectedFormat === 'webp') {
    sharpInstance = sharpInstance.webp({ quality: 85 });
  }

  await sharpInstance.toFile(targetPath);

  return `/uploads/${filename}`;
}

module.exports = {
  UPLOADS_DIR,
  detectImageSignature,
  processAndSaveImage
};
