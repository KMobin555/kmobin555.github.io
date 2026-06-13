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

  // ── CV Modal ───────────────────────────────────────────────────────────
  const viewBtn = document.getElementById('view-cv');
  const cvModal = document.getElementById('cv-modal');
  const cvClose = document.getElementById('cv-close');

  if (viewBtn && cvModal) {
    const openModal = () => {
      cvModal.classList.add('open');
      cvModal.setAttribute('aria-hidden', 'false');
      cvClose?.focus();
    };
    const closeModal = () => {
      cvModal.classList.remove('open');
      cvModal.setAttribute('aria-hidden', 'true');
      viewBtn.focus();
    };
    viewBtn.addEventListener('click', openModal);
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
