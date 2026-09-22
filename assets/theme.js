// Apply before paint. Light is the default, including when storage is blocked.
(() => {
  const root = document.documentElement;
  const key = 'kv-theme';
  let theme = 'light';
  try {
    if (localStorage.getItem(key) === 'dark') theme = 'dark';
  } catch (_) {}

  function apply(value) {
    root.dataset.theme = value;
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const target = value === 'light' ? 'dark' : 'light';
      button.textContent = target === 'dark' ? 'Dark mode' : 'Light mode';
      button.setAttribute('aria-label', `Switch to ${target} mode`);
    });
  }

  apply(theme);
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        apply(next);
        try { localStorage.setItem(key, next); } catch (_) {}
      });
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      apply(event.newValue === 'dark' ? 'dark' : 'light');
    }
  });
})();
