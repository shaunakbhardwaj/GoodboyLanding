(() => {
  const hero = document.querySelector('.hero');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.createElement('nav');
  nav.className = 'pill-nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = `<a class="pill-nav__brand" href="./" aria-label="Goodboy Dynamics home"><img src="assets/goodboysvg.svg" width="1775" height="388" alt=""></a><div class="pill-nav__items"><a href="${hero ? '' : './'}#about">About</a><a href="${hero ? '' : './'}#services">Services</a><a href="blog.html" ${hero ? '' : 'aria-current="page"'}>Blog</a><a href="${hero ? '' : './'}#contact">Contact</a></div>`;
  document.body.prepend(nav);
  const brand = nav.querySelector('.pill-nav__brand');
  const target = brand.querySelector('img');
  const mobile = () => window.innerWidth <= 520;
  if (!hero) {
    nav.style.setProperty('--logo-space', mobile() ? '86px' : '120px');
    window.addEventListener('resize', () => nav.style.setProperty('--logo-space', mobile() ? '86px' : '120px'));
    return;
  }
  const source = hero.querySelector('.wordmark__mark');
  const placeholder = source.parentElement;
  const lockup = source.closest('.wordmark');
  const flying = lockup.cloneNode(true);
  flying.classList.add('travelling-wordmark');
  const sub = flying.querySelector('.wordmark__sub');
  flying.setAttribute('aria-hidden', 'true');
  // One visible wordmark for the whole journey; the original keeps its layout.
  lockup.style.visibility = 'hidden';
  target.style.visibility = 'hidden';
  document.body.append(flying);
  let pending = false;
  let geometry = null;
  let previousProgress = -1;
  let needsMeasure = true;
  const measure = () => {
    // Measure only after layout changes, never during the scroll animation.
    const from = placeholder.getBoundingClientRect();
    const space = mobile() ? 86 : 120;
    nav.style.setProperty('--logo-space', `${space}px`);
    const to = target.getBoundingClientRect();
    geometry = {
      x: from.left, y: from.top + window.scrollY, width: from.width,
      targetX: to.left, targetY: to.top, targetWidth: to.width,
      distance: Math.max(220, hero.offsetHeight * 0.62), space,
    };
    previousProgress = -1;
    needsMeasure = false;
  };
  const update = () => {
    pending = false;
    if (needsMeasure) measure();
    const g = geometry;
    const raw = Math.min(1, Math.max(0, window.scrollY / g.distance));
    const progress = reduced.matches ? (raw > 0.12 ? 1 : 0) : raw * raw * (3 - 2 * raw);
    if (progress === previousProgress) return;
    previousProgress = progress;
    nav.style.setProperty('--logo-space', `${g.space * progress}px`);
    brand.tabIndex = progress > 0.98 ? 0 : -1;
    brand.setAttribute('aria-hidden', String(progress <= 0.98));
    brand.style.pointerEvents = progress > 0.98 ? 'auto' : 'none';
    // The centered pill grows by `space`; its logo center moves by half that.
    const targetX = g.targetX - g.space * (1 - progress) / 2;
    const x = g.x + (targetX - g.x) * progress;
    const y = g.y + (g.targetY - g.y) * progress;
    const width = g.width + (g.targetWidth - g.width) * progress;
    flying.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${width / 560})`;
    sub.style.opacity = String(1 - Math.min(1, raw * 3));
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  update();
  if (window.scrollY < 10 && !reduced.matches) flying.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 850, easing: 'ease-out' });
  window.addEventListener('scroll', schedule, { passive: true });
  const invalidate = () => { needsMeasure = true; schedule(); };
  // Safari's collapsing toolbar fires resize without changing layout width.
  let viewportWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth !== viewportWidth || window.matchMedia('(pointer: fine)').matches) {
      viewportWidth = window.innerWidth;
      invalidate();
    }
  });
  const layoutObserver = new ResizeObserver(invalidate);
  layoutObserver.observe(hero);
  layoutObserver.observe(lockup);
  layoutObserver.observe(nav.querySelector('.pill-nav__items'));
  window.addEventListener('pageshow', invalidate);
  reduced.addEventListener('change', schedule);
  document.fonts.ready.then(invalidate);
})();
