// mark JS active so reveal/anim styles apply (no-JS still shows content)
document.documentElement.className = 'js';

// theme: default light, remember the visitor's choice. The <head> inline script
// usually sets this before paint; this is a fallback if that ever changes.
(function () {
  var root = document.documentElement;
  if (!root.getAttribute('data-theme')) {
    var t = 'light';
    try { t = localStorage.getItem('kv-theme') || 'light'; } catch (e) {}
    root.setAttribute('data-theme', t);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));

  // light / dark toggle
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) themeSwitch.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('kv-theme', next); } catch (e) {}
  });

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

// shared Chart.js theme defaults (called by pages after Chart loads).
// Colours are theme-neutral so charts stay legible in both light and dark
// without needing a redraw when the visitor flips the toggle.
function applyChartTheme() {
  if (!window.Chart) return;
  Chart.defaults.color = '#8b93a7';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.borderColor = 'rgba(130,140,160,0.16)';
}
