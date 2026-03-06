/**
 * Face Blur Widget - embed on any page to blur faces in images when the page loads.
 * Images only (no video). Works best with same-origin or CORS-enabled images.
 *
 * Usage: Add before </body>
 *   <script src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js"></script>
 *   <script src="path/to/face-blur-widget.js"></script>
 *
 * Or load this script (it will load face-api automatically):
 *   <script src="path/to/face-blur-widget.js" data-auto-load></script>
 *
 * Optional: set blur strength (default 16) via data-blur-pixels:
 *   <script src="path/to/face-blur-widget.js" data-blur-pixels="24"></script>
 */
(function () {
  var script = document.currentScript;
  var blurPixels = 16;
  if (script && script.getAttribute('data-blur-pixels')) {
    var n = parseInt(script.getAttribute('data-blur-pixels'), 10);
    if (!isNaN(n) && n > 0) blurPixels = n;
  }
  var MODEL_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
  var BOX_PADDING = 0.15;
  var FACE_API_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js';

  var modelLoaded = false;
  var faceApiLoaded = false;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        if (typeof faceapi !== 'undefined') return resolve();
        document.addEventListener('face-api-ready', resolve, { once: true });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () {
        faceApiLoaded = true;
        document.dispatchEvent(new CustomEvent('face-api-ready'));
        resolve();
      };
      s.onerror = reject;
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function ensureModelLoaded() {
    if (modelLoaded) return Promise.resolve();
    if (typeof faceapi === 'undefined') {
      return loadScript(FACE_API_URL).then(function () { return ensureModelLoaded(); });
    }
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
      blurCtx.filter = 'blur(' + blurPixels + 'px)';
      blurCtx.drawImage(blurCanvas, 0, 0, bw, bh, 0, 0, bw, bh);
      blurCtx.filter = 'none';
      ctx.drawImage(blurCanvas, 0, 0, bw, bh, x, y, bw, bh);
    }
  }

  function processImage(img) {
    var src = img.src || img.currentSrc;
    if (!src || src.startsWith('data:')) return Promise.resolve();

    return ensureModelLoaded().then(function () {
      return new Promise(function (resolve, reject) {
        var el = new Image();
        el.crossOrigin = 'anonymous';
        el.onload = resolve.bind(null, el);
        el.onerror = function () { reject(new Error('Image load failed')); };
        el.src = src;
      });
    }).then(function (el) {
      var canvas = document.createElement('canvas');
      canvas.width = el.naturalWidth;
      canvas.height = el.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(el, 0, 0);
      return faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5
      })).then(function (detections) {
        blurRegions(canvas, detections);
        return canvas.toDataURL('image/png');
      });
    }).then(function (dataUrl) {
      img.src = dataUrl;
      img.setAttribute('data-face-blur-done', '1');
    }).catch(function () {});
  }

  function run() {
    var images = Array.prototype.filter.call(
      document.querySelectorAll('img'),
      function (img) {
        var s = img.src || img.currentSrc;
        return !img.hasAttribute('data-face-blur-done') && s && !s.startsWith('data:');
      }
    );
    var chain = Promise.resolve();
    for (var i = 0; i < images.length; i++) {
      chain = chain.then(processImage.bind(null, images[i]));
    }
  }

  function init() {
    ensureModelLoaded().then(run);
    var observer = new MutationObserver(run);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
