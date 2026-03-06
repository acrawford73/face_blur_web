/**
 * Shared face-blur logic: detect faces and blur those regions on a canvas.
 * Uses @vladmandic/face-api (Tiny Face Detector).
 * Expects global faceapi to be set (loaded before this script).
 */
(function () {
  const MODEL_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
  const BLUR_PIXELS = 16;
  const BOX_PADDING = 0.15;

  let modelLoaded = false;

  function ensureModelLoaded() {
    if (modelLoaded) return Promise.resolve();
    if (typeof faceapi === 'undefined') return Promise.reject(new Error('face-api not loaded'));
    return faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE).then(function () {
      modelLoaded = true;
    });
  }

  function blurRegions(canvas, detections) {
    if (!detections.length) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    var blurCanvas = document.createElement('canvas');
    var blurCtx = blurCanvas.getContext('2d');
    for (var i = 0; i < detections.length; i++) {
      var b = detections[i].box;
      var padW = b.width * BOX_PADDING;
      var padH = b.height * BOX_PADDING;
      var x = Math.max(0, Math.floor(b.x - padW));
      var y = Math.max(0, Math.floor(b.y - padH));
      var bw = Math.min(w - x, Math.ceil(b.width + 2 * padW));
      var bh = Math.min(h - y, Math.ceil(b.height + 2 * padH));
      if (bw <= 0 || bh <= 0) continue;
      blurCanvas.width = bw;
      blurCanvas.height = bh;
      blurCtx.drawImage(canvas, x, y, bw, bh, 0, 0, bw, bh);
      blurCtx.filter = 'blur(' + BLUR_PIXELS + 'px)';
      blurCtx.drawImage(blurCanvas, 0, 0, bw, bh, 0, 0, bw, bh);
      blurCtx.filter = 'none';
      ctx.drawImage(blurCanvas, 0, 0, bw, bh, x, y, bw, bh);
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  function processImageToDataURL(input) {
    var imgPromise = typeof input === 'string' ? loadImage(input) : Promise.resolve(input);
    return ensureModelLoaded().then(function () {
      return imgPromise;
    }).then(function (img) {
      if (!img.complete || img.naturalWidth === 0) {
        return new Promise(function (resolve, reject) {
          img.onload = function () { resolve(img); };
          img.onerror = function () { reject(new Error('Image failed to load')); };
        });
      }
      return img;
    }).then(function (img) {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5
      })).then(function (detections) {
        blurRegions(canvas, detections);
        return canvas.toDataURL('image/png');
      });
    });
  }

  window.FaceBlur = {
    ensureModelLoaded: ensureModelLoaded,
    processImageToDataURL: processImageToDataURL,
    blurRegions: blurRegions,
    MODEL_BASE: MODEL_BASE
  };
})();
