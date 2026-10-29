document.addEventListener('DOMContentLoaded', function () {

  // ── Year ──────────────────────────────────────────────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Theme toggle ───────────────────────────────────────────────────────
  const themeBtn  = document.getElementById('theme-toggle');
  const iconSun   = document.getElementById('icon-sun');
  const iconMoon  = document.getElementById('icon-moon');

  themeBtn?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    iconSun.classList.toggle('hidden', !isDark);
    iconMoon.classList.toggle('hidden', isDark);
  });

  // ── Mobile menu (below 1024px) ─────────────────────────────────────────
  const menuBtn   = document.getElementById('menu-toggle');
  const menu      = document.getElementById('mobile-menu');
  const iconMenu  = document.getElementById('icon-menu');
  const iconClose = document.getElementById('icon-close');

  if (menuBtn && menu) {
    const setMenu = open => {
      menu.classList.toggle('hidden', !open);
      document.documentElement.classList.toggle('menu-open', open);   // hides the floating Events switch
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      iconMenu.classList.toggle('hidden', open);
      iconClose.classList.toggle('hidden', !open);
    };
    const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.addEventListener('click', () => setMenu(!isOpen()));
    menu.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
    document.addEventListener('click', e => {
      if (isOpen() && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen()) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  // ── CV Modal ───────────────────────────────────────────────────────────
  const viewBtn = document.getElementById('view-cv');
  const viewBtnMobile = document.getElementById('view-cv-mobile');
  const cvModal = document.getElementById('cv-modal');
  const cvClose = document.getElementById('cv-close');

  if (viewBtn && cvModal) {
    // Phones can't show a PDF inside the modal's iframe (blank on Android,
    // first page only on iOS), so small screens open it in a new tab instead.
    const small = window.matchMedia('(max-width: 767px)');
    const cvUrl = cvModal.querySelector('a[download]')?.getAttribute('href');
    let opener = viewBtn;
    const openModal = e => {
      opener = e?.currentTarget || viewBtn;
      if (small.matches && cvUrl) { window.open(cvUrl, '_blank', 'noopener'); return; }
      cvModal.classList.add('open');
      cvModal.setAttribute('aria-hidden', 'false');
      cvClose?.focus();
    };
    const closeModal = () => {
      cvModal.classList.remove('open');
      cvModal.setAttribute('aria-hidden', 'true');
      opener.focus();
    };
    viewBtn.addEventListener('click', openModal);
    viewBtnMobile?.addEventListener('click', openModal);
    cvClose?.addEventListener('click', closeModal);
    cvModal.addEventListener('click', e => {
      if (e.target === cvModal || e.target.hasAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && cvModal.getAttribute('aria-hidden') !== 'true') closeModal();
    });
  }

  // ── Contact Form ───────────────────────────────────────────────────────
  const form   = document.getElementById('contact-form');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const name    = form.elements['name'].value.trim();
      const email   = form.elements['email'].value.trim();
      const message = form.elements['message'].value.trim();

      if (!name || !email || !message) {
        status.textContent = 'Please fill out all fields.';
        status.style.color = '#dc2626';
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        status.textContent = 'Please enter a valid email address.';
        status.style.color = '#dc2626';
        return;
      }
      status.textContent = '✓ Thanks for reaching out! I\'ll get back to you soon.';
      status.style.color = '#16a34a';
      form.reset();
    });
  }

  // ── Scroll Reveal (.fade-up → .visible) ───────────────────────────────
  const fadeEls = document.querySelectorAll('.fade-up');
  if (fadeEls.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.08 });
    fadeEls.forEach(el => obs.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  // ── Active Nav ─────────────────────────────────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nl');

  if (sections.length && navLinks.length) {
    const navObs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          document.querySelector(`.nl[href="#${en.target.id}"]`)?.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    sections.forEach(s => navObs.observe(s));
  }

});
