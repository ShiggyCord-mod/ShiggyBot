export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'gif';
}

export interface MpregResult {
  buffer: Buffer;
  dominantColor: number;
}
