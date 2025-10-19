document.addEventListener('hidden.bs.modal', function () {
  // 強制移除殘留的 backdrop
  const backdrops = document.querySelectorAll('.modal-backdrop');
  backdrops.forEach(backdrop => backdrop.remove());

  // 同時移除 body 上可能殘留的樣式
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});
document.addEventListener('show.bs.modal', function () {
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
});