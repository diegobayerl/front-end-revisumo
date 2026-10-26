(() => {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem('ritmo-theme'); } catch {}
  let theme = saved === 'dark' || saved === 'light' ? saved : preference.matches ? 'dark' : 'light';
  const icons = {
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };
  function apply() {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-set-theme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.setTheme===theme)));
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      const next = theme === 'dark' ? 'light' : 'dark';
      button.innerHTML = icons[next];
      button.setAttribute('aria-label', next === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro');
      button.title = button.getAttribute('aria-label');
    });
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', event => {
    const choice=event.target.closest('[data-set-theme]');
    if (!choice&&!event.target.closest('[data-theme-toggle]')) return;
    theme = choice?choice.dataset.setTheme:theme === 'dark' ? 'light' : 'dark';
    saved = theme;
    try { localStorage.setItem('ritmo-theme', theme); } catch {}
    apply();
  });
  preference.addEventListener('change', event => {
    if (saved === 'dark' || saved === 'light') return;
    theme = event.matches ? 'dark' : 'light';
    apply();
  });
})();
