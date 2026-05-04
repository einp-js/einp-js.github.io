// Navigation drawer toggle
document.addEventListener('DOMContentLoaded', () => {
  const navDrawer = document.getElementById('nav-drawer');
  const toggleBtn = document.getElementById('toggle-nav');
  const closeBtn = document.getElementById('close-nav');

  if (toggleBtn && navDrawer) {
    toggleBtn.addEventListener('click', () => {
      navDrawer.classList.toggle('open');
    });
  }

  if (closeBtn && navDrawer) {
    closeBtn.addEventListener('click', () => {
      navDrawer.classList.remove('open');
    });
  }

  // Close drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (navDrawer && toggleBtn && !navDrawer.contains(e.target) && !toggleBtn.contains(e.target)) {
      navDrawer.classList.remove('open');
    }
  });
});
