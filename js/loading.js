window.addEventListener('load', function () {
  const overlay = document.getElementById('loading-overlay');
  const MIN_DISPLAY_TIME = 2000; // 至少顯示 N 秒
  const startTime = performance.now();

  function hideOverlay() {
    overlay.classList.add('loaded');
    document.body.classList.remove('loading-locked');

    overlay.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName === 'opacity') {
        overlay.remove();
        overlay.removeEventListener('transitionend', onEnd);
      }
    });
  }

  const elapsed = performance.now() - startTime;
  const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

  // 確保至少顯示一秒再執行淡出
  setTimeout(hideOverlay, remaining);
});