(() => {
  const hero = document.querySelector('.hero');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.createElement('nav');
  nav.className = 'pill-nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = `<a class="pill-nav__brand" href="./" aria-label="Goodboy Dynamics home"><img src="assets/goodboysvg.svg" width="1775" height="388" alt=""></a><div class="pill-nav__items"><a href="${hero ? '' : './'}#about">About</a><a href="${hero ? '' : './'}#focus">Focus</a><a href="blog.html" ${hero ? '' : 'aria-current="page"'}>Journal</a><a href="${hero ? '' : './'}#contact">Contact</a></div>`;
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
  const update = () => {
    pending = false;
    const from = placeholder.getBoundingClientRect();
    const distance = Math.max(220, hero.offsetHeight * 0.62);
    const raw = Math.min(1, Math.max(0, window.scrollY / distance));
    const progress = reduced.matches ? (raw > 0.12 ? 1 : 0) : raw * raw * (3 - 2 * raw);
    nav.style.setProperty('--logo-space', `${(mobile() ? 86 : 120) * progress}px`);
    brand.tabIndex = progress > 0.98 ? 0 : -1;
    brand.setAttribute('aria-hidden', String(progress <= 0.98));
    brand.style.pointerEvents = progress > 0.98 ? 'auto' : 'none';
    const to = target.getBoundingClientRect();
    const x = from.left + (to.left - from.left) * progress;
    // Start from the unscrolled hero position so the logo never exits above the pill.
    const initialY = from.top + window.scrollY;
    const y = initialY + (to.top - initialY) * progress;
    const width = from.width + (to.width - from.width) * progress;
    flying.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${width / 560})`;
    sub.style.opacity = String(1 - Math.min(1, raw * 3));
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  update();
  if (window.scrollY < 10 && !reduced.matches) flying.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 850, easing: 'ease-out' });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(lockup);
  window.addEventListener('pageshow', schedule);
  reduced.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);
})();
