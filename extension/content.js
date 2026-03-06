(function () {
  function processOneImage(img, index) {
    var src = img.src || img.currentSrc;
    if (!src || src.startsWith('data:')) return Promise.resolve();

    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'FETCH_IMAGE', url: src }, function (response) {
        if (!response || !response.ok) {
          resolve();
          return;
        }
        var blob = new Blob([response.buffer], { type: 'image/*' });
        var blobUrl = URL.createObjectURL(blob);
        var imgEl = new Image();
        imgEl.onload = function () {
          window.FaceBlur.processImageToDataURL(imgEl).then(function (dataUrl) {
            img.src = dataUrl;
            img.setAttribute('data-face-blur-done', '1');
            URL.revokeObjectURL(blobUrl);
            resolve();
          }).catch(function () {
            URL.revokeObjectURL(blobUrl);
            resolve();
          });
        };
        imgEl.onerror = function () {
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        imgEl.src = blobUrl;
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
      chain = chain.then(processOneImage.bind(null, images[i], i));
    }
  }

  if (window.FaceBlur) {
    run();
  } else {
    window.addEventListener('load', function () {
      if (window.FaceBlur) run();
    });
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
