import sharp from 'sharp';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { ImageProcessingOptions, MpregResult } from '@dtypes/image';
import { getEnvironment } from '@config/environment.js';
import { logger } from '@logger/index.js';

const PROJECT_ROOT = join(import.meta.dir, '..', '..', '..');
const MPREG_BASE_PATH = join(PROJECT_ROOT, 'assets', 'mpreg.png');
const MPREG_OUTPUT_SIZE = 512;
const MPREG_SVG_VIEWBOX = 36;
const MPREG_HEAD_CX = 16.75;
const MPREG_HEAD_CY = 7.4;
const MPREG_HEAD_R = 7.23;

export async function getDominantColor(input: Buffer): Promise<number> {
  const { data } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const buckets = new Map<number, number>();
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;

    // eslint-disable-next-line security/detect-object-injection
    const key = ((data[i] >> 5) << 10) | ((data[i + 1] >> 5) << 5) | (data[i + 2] >> 5);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    total++;
  }

  if (total === 0) return 0x36393f;

  let bestKey = 0;
  let bestCount = -1;
  for (const [key, count] of buckets) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }

  const r = ((bestKey >> 10) & 0x1f) << 5;
  const g = ((bestKey >> 5) & 0x1f) << 5;
  const b = (bestKey & 0x1f) << 5;
  return (r << 16) | (g << 8) | b;
}

export async function generateMpregImage(avatarUrl: string): Promise<MpregResult> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const baseBytes = await readFile(MPREG_BASE_PATH);

  const avatarRes = await fetch(avatarUrl);
  const avatarBytes = Buffer.from(await avatarRes.arrayBuffer());
  const dominantColor = await getDominantColor(avatarBytes);

  const scale = MPREG_OUTPUT_SIZE / MPREG_SVG_VIEWBOX;
  const headX = MPREG_HEAD_CX * scale;
  const headY = MPREG_HEAD_CY * scale;
  const headRadius = MPREG_HEAD_R * scale;
  const circleDiameter = Math.round(headRadius * 2);

  const circleMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${circleDiameter}" height="${circleDiameter}">` +
      `<circle cx="${circleDiameter / 2}" cy="${circleDiameter / 2}" r="${circleDiameter / 2}" fill="#fff"/>` +
      '</svg>'
  );

  const croppedAvatar = await sharp(avatarBytes)
    .resize(circleDiameter, circleDiameter, { fit: 'cover' })
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const buffer = await sharp(baseBytes)
    .composite([
      {
        input: croppedAvatar,
        left: Math.round(headX - headRadius),
        top: Math.round(headY - headRadius),
      },
    ])
    .png()
    .toBuffer();

  return { buffer, dominantColor };
}

export async function processImage(
  input: Buffer | string,
  options: ImageProcessingOptions = {}
): Promise<Buffer> {
  const env = getEnvironment();

  const defaultOptions: ImageProcessingOptions = {
    quality: env.IMAGE_QUALITY,
    format: 'png',
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    let pipeline = sharp(input);

    if (finalOptions.width || finalOptions.height) {
      pipeline = pipeline.resize(finalOptions.width, finalOptions.height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    switch (finalOptions.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: finalOptions.quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: finalOptions.quality });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: finalOptions.quality });
        break;
      case 'gif':
        pipeline = pipeline.gif();
        break;
    }

    const result = await pipeline.toBuffer();
    logger.debug('Image processed successfully', {
      size: result.length,
      format: finalOptions.format,
    });
    return result;
  } catch (error) {
    logger.error('Failed to process image', { error: error as Error });
    throw error;
  }
}

export async function createPlaceholder(
  width: number,
  height: number,
  text: string,
  backgroundColor = '#2f3136',
  textColor = '#ffffff'
): Promise<Buffer> {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="${textColor}"
            text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function getImageDimensions(
  input: Buffer | string
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(input).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

export async function convertToWebP(input: Buffer | string, quality = 80): Promise<Buffer> {
  return sharp(input).webp({ quality }).toBuffer();
}

export async function addWatermark(
  input: Buffer | string,
  watermarkText: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right'
): Promise<Buffer> {
  const { width, height } = await getImageDimensions(input);

  let x: number;
  let y: number;

  switch (position) {
    case 'top-left':
      x = 10;
      y = 30;
      break;
    case 'top-right':
      x = width - 150;
      y = 30;
      break;
    case 'bottom-left':
      x = 10;
      y = height - 20;
      break;
    case 'bottom-right':
      x = width - 150;
      y = height - 20;
      break;
  }

  const watermarkSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${x}" y="${y}" font-family="Arial" font-size="16"
            fill="rgba(255, 255, 255, 0.5)">${watermarkText}</text>
    </svg>
  `;

  return sharp(input)
    .composite([{ input: Buffer.from(watermarkSvg), gravity: 'northwest' }])
    .toBuffer();
}
