// Small interactions: contact form validation and year update
document.addEventListener('DOMContentLoaded', function(){
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if(!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    status.textContent = '';
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if(!name || !email || !message){
      status.textContent = 'Please fill out all fields.';
      return;
    }
    if(!/^\S+@\S+\.\S+$/.test(email)){
      status.textContent = 'Please provide a valid email.';
      return;
    }

    // Since there's no backend, show a friendly message and clear the form.
    status.textContent = 'Thanks — your message has been noted (demo).';
    form.reset();
  });
});

// Theme toggle and CV modal
document.addEventListener('DOMContentLoaded', function(){
  // Theme handling
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  function applyTheme(theme){
    if(theme === 'light') root.setAttribute('data-theme','light');
    else root.removeAttribute('data-theme');
    try{ localStorage.setItem('theme', theme); }catch(e){}
  }
  const saved = (function(){ try{ return localStorage.getItem('theme'); }catch(e){return null} })() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(saved);
  if(themeToggle){
    themeToggle.addEventListener('click', function(){
      const isLight = root.getAttribute('data-theme') === 'light';
      applyTheme(isLight ? 'dark' : 'light');
    });
  }

  // CV modal
  const viewBtn = document.getElementById('view-cv');
  const cvModal = document.getElementById('cv-modal');
  const cvClose = document.getElementById('cv-close');
  if(viewBtn && cvModal){
    function openModal(){
      cvModal.classList.add('open');
      cvModal.setAttribute('aria-hidden','false');
      // focus the close button for accessibility
      const closeBtn = document.getElementById('cv-close');
      if(closeBtn) closeBtn.focus();
    }
    function closeModal(){
      cvModal.classList.remove('open');
      cvModal.setAttribute('aria-hidden','true');
      viewBtn.focus();
    }
    viewBtn.addEventListener('click', openModal);
    if(cvClose) cvClose.addEventListener('click', closeModal);
    cvModal.addEventListener('click', function(e){
      if(e.target && e.target.dataset && e.target.dataset.close === 'true') closeModal();
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && cvModal.getAttribute('aria-hidden') === 'false') closeModal(); });
  }
});
