// Fetch image and send as ArrayBuffer (Blob doesn't survive message passing).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'FETCH_IMAGE') return;
  fetch(msg.url, { mode: 'cors' })
    .then(r => r.arrayBuffer())
    .then(buf => sendResponse({ ok: true, buffer: buf }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
  return true;
});
