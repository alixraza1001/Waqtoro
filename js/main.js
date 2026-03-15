/**
 * WAQTORO — Global JavaScript
 * Handles: Navbar, Search, Cart, Wishlist, Toast, Back-to-Top, Animations
 */

/* =================== CART STATE =================== */
const WaqtoroCart = window.WaqtoroCart = {
  items: JSON.parse(localStorage.getItem('waqtoro_cart') || '[]'),

  save() {
    localStorage.setItem('waqtoro_cart', JSON.stringify(this.items));
    this.updateCount();
  },

  add(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = this.items.find(i => i.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ id: productId, qty: 1 });
    }
    this.save();
    showToast(`<strong>${product.brand} ${product.name}</strong> added to cart`, 'cart');
  },

  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
  },

  updateQty(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.qty = qty;
      if (qty <= 0) this.remove(productId);
      else this.save();
    }
  },

  total() {
    return this.items.reduce((sum, i) => {
      const p = PRODUCTS.find(pr => pr.id === i.id);
      return p ? sum + p.price * i.qty : sum;
    }, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  updateCount() {
    const el = document.getElementById('cart-count');
    if (el) el.textContent = this.count();
  }
};

/* =================== WISHLIST STATE =================== */
const WaqtoroWishlist = window.WaqtoroWishlist = {
  items: JSON.parse(localStorage.getItem('waqtoro_wishlist') || '[]'),

  save() {
    localStorage.setItem('waqtoro_wishlist', JSON.stringify(this.items));
  },

  toggle(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const idx = this.items.indexOf(productId);
    if (idx === -1) {
      this.items.push(productId);
      showToast(`<strong>${product.brand} ${product.name}</strong> saved to wishlist`, 'heart');
    } else {
      this.items.splice(idx, 1);
      showToast(`Removed from wishlist`, 'heart');
    }
    this.save();
    this.updateButtons();
  },

  has(productId) {
    return this.items.includes(productId);
  },

  updateButtons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const id = parseInt(btn.dataset.id);
      if (this.has(id)) {
        btn.classList.add('wishlisted');
        btn.title = 'Remove from Wishlist';
      } else {
        btn.classList.remove('wishlisted');
        btn.title = 'Add to Wishlist';
      }
    });
  }
};

/* =================== TOAST =================== */
function showToast(message, type = 'cart') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    cart: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
    heart: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    check: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${icons[type] || icons.check}<p>${message}</p>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3100);
}

/* =================== NAVBAR =================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  function handleScroll() {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    mobileClose?.addEventListener('click', closeMobileMenu);
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMobileMenu();
    });
  }

  function closeMobileMenu() {
    mobileMenu?.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* =================== SEARCH =================== */
function initSearch() {
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchInput = document.getElementById('search-input');

  if (!searchBtn || !searchOverlay) return;

  const open = () => {
    searchOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => searchInput?.focus(), 100);
  };
  const close = () => {
    searchOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  searchBtn.addEventListener('click', open);
  searchClose?.addEventListener('click', close);
  searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) close(); });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // Search submit
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      const isRootPage = !window.location.pathname.includes('/pages/');
      const searchPage = isRootPage ? `pages/search.html?q=${encodeURIComponent(searchInput.value.trim())}` : `search.html?q=${encodeURIComponent(searchInput.value.trim())}`;
      window.location.href = searchPage;
    }
  });
}

/* =================== BACK TO TOP =================== */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* =================== SCROLL ANIMATIONS =================== */
function initAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* =================== EVENT DELEGATION: CART & WISHLIST =================== */
function initGlobalProductHandlers() {
  document.addEventListener('click', (e) => {
    // Add to cart
    const cartBtn = e.target.closest('.add-to-cart-btn');
    if (cartBtn) {
      const id = parseInt(cartBtn.dataset.id);
      WaqtoroCart.add(id);
    }

    // Wishlist toggle
    const wishBtn = e.target.closest('.wishlist-btn');
    if (wishBtn) {
      const id = parseInt(wishBtn.dataset.id);
      WaqtoroWishlist.toggle(id);
    }
  });
}

/* =================== NEWSLETTER =================== */
function initNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletter-email')?.value;
    if (email) {
      showToast(`<strong>Thank you!</strong> You're subscribed for exclusive updates.`, 'check');
      form.reset();
    }
  });
}

/* =================== INIT =================== */
document.addEventListener('DOMContentLoaded', () => {
  WaqtoroCart.updateCount();
  WaqtoroWishlist.updateButtons();
  initNavbar();
  initSearch();
  initBackToTop();
  initAnimations();
  initGlobalProductHandlers();
  initNewsletter();

  const isRoot = !window.location.pathname.includes('/pages/');
  const reviewsPath = isRoot ? './js/reviews-live.js' : '../js/reviews-live.js';
  
  import(reviewsPath).catch((err) => {
    console.error('Failed to load live reviews module from', reviewsPath, ':', err);
  });
});
