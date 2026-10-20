(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dotsEl = document.querySelector('.deck-dots');
  const prevBtn = document.querySelector('[data-nav="prev"]');
  const nextBtn = document.querySelector('[data-nav="next"]');
  let index = 0;

  function parseHash() {
    const h = location.hash.replace(/^#/, '');
    const n = parseInt(h, 10);
    if (n >= 1 && n <= slides.length) return n - 1;
    return 0;
  }

  function goTo(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, j) => s.classList.toggle('active', j === index));
    if (dotsEl) {
      dotsEl.querySelectorAll('span').forEach((d, j) => d.classList.toggle('active', j === index));
    }
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    location.replace('#' + (index + 1));
  }

  if (dotsEl) {
    slides.forEach((_, i) => {
      const d = document.createElement('span');
      d.title = 'Slide ' + (i + 1);
      d.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(d);
    });
  }

  prevBtn?.addEventListener('click', () => goTo(index - 1));
  nextBtn?.addEventListener('click', () => goTo(index + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(index - 1);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      goTo(index + 1);
    }
  });

  window.addEventListener('hashchange', () => goTo(parseHash()));
  goTo(parseHash());
})();
