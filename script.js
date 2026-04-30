// Dotsbar Core Script - Making it the BEST
// Features: Smooth scroll, accordion, PWA, dark mode, mock auth, lazy load, animation observer

// Polyfill for older browsers
if (!window.IntersectionObserver) {
  console.warn('IntersectionObserver not supported');
}

// Configuration
const CONFIG = {
  smoothScroll: true,
  darkMode: localStorage.getItem('darkMode') === 'enabled',
  mockUser: localStorage.getItem('mockUser') || null
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initDotsbar);

function initDotsbar() {
  // Smooth scrolling for navigation
  setupSmoothScroll();
  
  // FAQ Accordion
  setupAccordion();
  
  // Animation observer for scroll reveals
  setupScrollAnimations();
  
  // Lazy loading for placeholders/images
  setupLazyLoading();
  
  // Dark mode toggle
  setupDarkMode();
  
  // Mock authentication
  setupMockAuth();
  
  // Auth Modal
  setupAuthModal();
  
  // PWA registration
  registerSW();
  
  // Socket.io prep (for bar/rooms pages)
  initSocketPrep();
  
  console.log('🌟 Dotsbar initialized - Ready to vibe!');
}

// 1. Smooth Scrolling
function setupSmoothScroll() {
  if (!CONFIG.smoothScroll) return;
  
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offsetTop = target.offsetTop - 80; // Account for fixed header
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

// 2. FAQ Accordion
function setupAccordion() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isOpen = content.style.display === 'block';
      
      // Close all others
      document.querySelectorAll('.accordion-content').forEach(c => {
        c.style.display = 'none';
      });
      
      // Toggle current
      content.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('active', !isOpen);
    });
  });
}

// 3. Scroll Animations (Intersection Observer)
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .step, .testimonial, .pillar').forEach(el => {
    el.classList.add('animate-out');
    observer.observe(el);
  });
}

// 4. Lazy Loading
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || img.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll('.lazy, .placeholder').forEach(el => {
      imageObserver.observe(el);
    });
  }
}

// 5. Dark Mode
function setupDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle') || createDarkModeToggle();
  if (CONFIG.darkMode) {
    document.body.classList.add('dark-mode');
  }
  
  toggle.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('darkMode', e.target.checked ? 'enabled' : 'disabled');
  });
}

function createDarkModeToggle() {
  const toggle = document.createElement('label');
  toggle.innerHTML = `
    <input type="checkbox" id="dark-mode-toggle" ${CONFIG.darkMode ? 'checked' : ''}>
    <span class="slider"></span>
  `;
  toggle.className = 'dark-mode-switch';
  // Append to header or settings
  const header = document.querySelector('header');
  if (header) {
    header.appendChild(toggle);
  }
  return document.getElementById('dark-mode-toggle');
}

// 6. Mock Authentication
function setupMockAuth() {
  const loginBtn = document.querySelector('a[href="#login"]');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = prompt('Enter your vibe name:');
      if (name) {
        CONFIG.mockUser = { id: Date.now(), name };
        localStorage.setItem('mockUser', JSON.stringify(CONFIG.mockUser));
        alert(`Welcome, ${name}! 🎉`);
        updateUIForAuth();
      }
    });
  }
  
  if (CONFIG.mockUser) {
    updateUIForAuth();
  }
}

function updateUIForAuth() {
  const userEl = document.createElement('span');
  userEl.className = 'user-profile';
  userEl.textContent = CONFIG.mockUser.name;
  userEl.title = 'Logged in';
  const nav = document.querySelector('nav');
  if (nav) {
    nav.appendChild(userEl);
  }
}

// 7. PWA Service Worker
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered');
    } catch (e) {
      console.warn('SW registration failed');
    }
  }
}

// 8. Socket.io Prep (for real-time pages)
function initSocketPrep() {
  // Load Socket.io client CDN dynamically if on voice pages
  if (document.body.classList.contains('voice-page')) {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    document.head.appendChild(script);
  }
}

// 9. Auth Modal
function setupAuthModal() {
  const modal = document.getElementById('auth-modal');
  const loginLink = document.getElementById('login-link');
  const closeBtn = document.querySelector('.close');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');

  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      modal.style.display = 'block';
    });
  }

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });

  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      modal.style.display = 'none';
      window.location.href = 'rooms.html';
    } else {
      alert('Login failed');
    }
  });

  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const isCreator = document.getElementById('reg-creator').checked;
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, isCreator })
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      modal.style.display = 'none';
      window.location.href = 'rooms.html';
    } else {
      alert('Registration failed');
    }
  });
}

// Export for other modules
window.Dotsbar = {
  config: CONFIG,
  init: initDotsbar,
  user: () => CONFIG.mockUser
};
