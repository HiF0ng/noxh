(() => {
  const isLocalPreview = location.protocol === 'file:' || /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
  const style = document.getElementById('noxh-404-style');
  if (location.protocol === 'file:' && style) style.href = 'assets/css/style.css?v=34';
  if (isLocalPreview) return;
  document.querySelectorAll('[data-production-href]').forEach(link => { link.href = link.dataset.productionHref; });
})();
