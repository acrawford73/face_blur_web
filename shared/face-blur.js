/**
 * Shared face-blur logic: detect faces and blur those regions on a canvas.
 * Uses @vladmandic/face-api (Tiny Face Detector).
 * No dependencies; expects global faceapi and model base URL to be set.
 */

const MODEL_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
const BLUR_PIXELS = 16;
const BOX_PADDING = 0.15; // expand box by 15% on each side

let modelLoaded = false;

async function ensureModelLoaded() {
  if (modelLoaded) return;
  if (typeof faceapi === 'undefined') throw new Error('face-api not loaded');
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE);
  modelLoaded = true;
}

/**
 * Blur regions of a canvas given face bounding boxes.
 * @param {HTMLCanvasElement} canvas - Canvas with image already drawn
 * @param {Array<{ box: { x: number, y: number, width: number, height: number } }>} detections
 */
function blurRegions(canvas, detections) {
  if (!detections.length) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const blurCanvas = document.createElement('canvas');
  const blurCtx = blurCanvas.getContext('2d');

  for (const d of detections) {
    const b = d.box;
    const padW = b.width * BOX_PADDING;
    const padH = b.height * BOX_PADDING;
    let x = Math.max(0, Math.floor(b.x - padW));
    let y = Math.max(0, Math.floor(b.y - padH));
    let bw = Math.min(w - x, Math.ceil(b.width + 2 * padW));
    let bh = Math.min(h - y, Math.ceil(b.height + 2 * padH));
    if (bw <= 0 || bh <= 0) continue;

    blurCanvas.width = bw;
    blurCanvas.height = bh;
    blurCtx.drawImage(canvas, x, y, bw, bh, 0, 0, bw, bh);
    blurCtx.filter = `blur(${BLUR_PIXELS}px)`;
    blurCtx.drawImage(blurCanvas, 0, 0, bw, bh, 0, 0, bw, bh);
    blurCtx.filter = 'none';
    ctx.drawImage(blurCanvas, 0, 0, bw, bh, x, y, bw, bh);
  }
}

/**
 * Process an image (img element or URL): draw to canvas, detect faces, blur them, return data URL.
 * @param {HTMLImageElement | string} input - Image element or URL (same-origin or CORS-enabled)
 * @returns {Promise<string>} data URL of the image with faces blurred
 */
async function processImageToDataURL(input) {
  await ensureModelLoaded();
  const img = typeof input === 'string'
    ? await loadImage(input)
    : input;
  if (!img.complete || img.naturalWidth === 0) {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Image failed to load'));
    });
  }
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const detections = await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,
    scoreThreshold: 0.5
  }));
  blurRegions(canvas, detections);
  return canvas.toDataURL('image/png');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

if (typeof window !== 'undefined') {
  window.FaceBlur = {
    ensureModelLoaded,
    processImageToDataURL,
    blurRegions,
    MODEL_BASE
  };
}
