document.addEventListener("DOMContentLoaded", function () {
  const cards = document.querySelectorAll(".product-card");

  cards.forEach(card => {
    card.addEventListener("click", function (e) {
      // 防止 Bootstrap modal 馬上打開
      e.stopPropagation();
      e.preventDefault();

      // 如果已經翻轉一次 → 第二次才打開 modal
      if (this.classList.contains("flipped")) {
        this.classList.remove("flipped");
        const targetModal = this.getAttribute("data-bs-target");
        const modal = new bootstrap.Modal(document.querySelector(targetModal));
        modal.show();
      } else {
        this.classList.add("flipped");
      }
    });
  });
});