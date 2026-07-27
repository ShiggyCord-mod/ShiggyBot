import sharp from 'sharp';
import { getEnvironment } from '@config/environment.js';
import { logger } from '@logger/index.js';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'gif';
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
