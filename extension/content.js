(function () {
  function processWithBlobUrl(img, blobUrl) {
    var imgEl = new Image();
    return new Promise(function (resolve) {
      imgEl.onload = function () {
        window.FaceBlur.processImageToDataURL(imgEl).then(function (dataUrl) {
          img.src = dataUrl;
          img.setAttribute('data-face-blur-done', '1');
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          resolve();
        }).catch(function () {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          resolve();
        });
      };
      imgEl.onerror = function () {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        resolve();
      };
      imgEl.src = blobUrl;
    });
  }

  function processOneImage(img) {
    var src = img.src || img.currentSrc;
    if (!src || src.startsWith('data:')) return Promise.resolve();

    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'FETCH_IMAGE', url: src }, function (response) {
        if (chrome.runtime.lastError) {
          tryFallback();
          return;
        }
        if (response && response.ok && response.buffer && response.buffer.byteLength > 0) {
          var blob = new Blob([response.buffer], { type: 'image/*' });
          var blobUrl = URL.createObjectURL(blob);
          processWithBlobUrl(img, blobUrl).then(resolve);
          return;
        }
        tryFallback();
        function tryFallback() {
          window.FaceBlur.processImageToDataURL(img).then(function (dataUrl) {
            img.src = dataUrl;
            img.setAttribute('data-face-blur-done', '1');
          }).catch(function () { }).then(resolve);
        }
      });
    });
  }

  function run() {
    var images = Array.prototype.filter.call(
      document.querySelectorAll('img'),
      function (img) {
        var s = img.src || img.currentSrc;
        return !img.hasAttribute('data-face-blur-done') && s && !s.startsWith('data:');
      }
    );
    if (images.length === 0) return;

    var chain = Promise.resolve();
    for (var i = 0; i < images.length; i++) {
      chain = chain.then(processOneImage.bind(null, images[i]));
    }
  }

  function start() {
    if (!window.FaceBlur) return;
    window.FaceBlur.ensureModelLoaded().then(run).catch(function () {});
  }
  if (window.FaceBlur) {
    start();
  } else {
    window.addEventListener('load', function () { start(); });
  }

  var observer = new MutationObserver(run);
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
