// mark JS active so reveal/anim styles apply (no-JS still shows content)
document.documentElement.className = 'js';

document.addEventListener('DOMContentLoaded', () => {
  // mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));

  // scroll progress
  const bar = document.querySelector('.progress');
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // animated number counters
  const fmt = (v, suffix, dp) => v.toFixed(dp) + suffix;
  const counters = document.querySelectorAll('[data-count]');
  const cio = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dp = parseInt(el.dataset.dp || '0', 10);
      const dur = 1200; const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, suffix, dp);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(target, suffix, dp);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => cio.observe(el));
});

// shared Chart.js theme defaults (called by pages after Chart loads)
function applyChartTheme() {
  if (!window.Chart) return;
  Chart.defaults.color = '#aeb6c7';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
}
