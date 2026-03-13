(function () {
  function isExtensionContextValid() {
    try { return !!chrome.runtime?.id; } catch (e) { return false; }
  }
  function processWithBlobUrl(img, blobUrl) {
    var imgEl = new Image();
    return new Promise(function (resolve) {
      imgEl.onload = function () {
        if (!isExtensionContextValid()) { if (blobUrl) URL.revokeObjectURL(blobUrl); resolve(); return; }
        window.FaceBlur.processImageToDataURL(imgEl).then(function (dataUrl) {
          if (!isExtensionContextValid()) return;
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
    if (!isExtensionContextValid()) return Promise.resolve();

    return new Promise(function (resolve) {
      var sent;
      try {
        sent = chrome.runtime.sendMessage({ type: 'FETCH_IMAGE', url: src }, function (response) {
          try {
            if (!isExtensionContextValid()) {
              resolve();
              return;
            }
            if (chrome.runtime.lastError) {
              tryFallback();
              return;
            }
            if (response && response.ok && response.buffer && response.buffer.byteLength > 0) {
              var blob = new Blob([response.buffer], { type: 'image/*' });
              var blobUrl = URL.createObjectURL(blob);
              processWithBlobUrl(img, blobUrl).then(resolve).catch(function () { resolve(); });
              return;
            }
            tryFallback();
          } catch (e) {
            resolve();
            return;
          }
          function tryFallback() {
            try {
              if (!isExtensionContextValid()) { resolve(); return; }
              window.FaceBlur.processImageToDataURL(img).then(function (dataUrl) {
                try {
                  if (!isExtensionContextValid()) return;
                  img.src = dataUrl;
                  img.setAttribute('data-face-blur-done', '1');
                } catch (e) {}
              }).catch(function () { }).then(resolve);
            } catch (e) {
              resolve();
            }
          }
        });
      } catch (e) {
        resolve();
        return;
      }
      if (sent && typeof sent.then === 'function' && typeof sent.catch === 'function') {
        sent.catch(function () { resolve(); });
      }
    });
  }

  function run() {
    if (!isExtensionContextValid()) return;
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
      chain = chain.then(processOneImage.bind(null, images[i])).catch(function () {});
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
