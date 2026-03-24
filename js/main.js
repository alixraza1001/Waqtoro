/**
 * WAQTORO — Global JavaScript
 * Handles: Navbar, Search, Cart, Wishlist, Toast, Back-to-Top, Animations
 */

/* =================== ERROR MONITORING =================== */
const WaqtoroErrorMonitor = window.WaqtoroErrorMonitor = {
  initialized: false,
  storageKey: 'waqtoro_client_errors',
  maxItems: 50,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    window.addEventListener('error', (event) => {
      this.capture('error', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack || null
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.capture('unhandledrejection', {
        message: reason?.message || String(reason),
        stack: reason?.stack || null
      });
    });
  },

  capture(type, payload) {
    try {
      const entry = {
        type,
        payload,
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      existing.push(entry);
      const trimmed = existing.slice(-this.maxItems);
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));

      const endpoint = window.WAQTORO_ERROR_ENDPOINT || localStorage.getItem('waqtoro_error_endpoint');
      if (endpoint && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(entry)], { type: 'application/json' });
        navigator.sendBeacon(endpoint, blob);
      }
    } catch (error) {
      console.error('Error monitor capture failed:', error);
    }
  }
};

/* =================== ANALYTICS =================== */
const WaqtoroAnalytics = window.WaqtoroAnalytics = {
  storageKey: 'waqtoro_analytics_events',
  maxItems: 200,

  track(eventName, payload = {}) {
    try {
      const event = {
        event: eventName,
        payload,
        path: window.location.pathname,
        timestamp: Date.now()
      };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(event);

      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, payload);
      }

      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      existing.push(event);
      localStorage.setItem(this.storageKey, JSON.stringify(existing.slice(-this.maxItems)));
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }
};

/* =================== CART STATE =================== */
const WaqtoroCart = window.WaqtoroCart = {
  items: JSON.parse(localStorage.getItem('waqtoro_cart') || '[]'),

  save() {
    localStorage.setItem('waqtoro_cart', JSON.stringify(this.items));
    this.updateCount();
  },

  add(productId, color = null) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = this.items.find(i => i.id === productId && i.color === color);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ id: productId, qty: 1, color: color });
    }
    this.save();
    WaqtoroAnalytics.track('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      price: product.price,
      quantity: 1,
      color: color || null,
      currency: 'PKR'
    });
    showToast(`<strong>${product.brand} ${product.name}</strong> ${color ? `(${color}) ` : ''}added to cart`, 'cart');
  },

  remove(productId, color = null) {
    this.items = this.items.filter(i => !(i.id === productId && i.color === color));
    this.save();
  },

  updateQty(productId, qty, color = null) {
    const item = this.items.find(i => i.id === productId && i.color === color);
    if (item) {
      item.qty = qty;
      if (qty <= 0) this.remove(productId, color);
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
      if (mobileMenu.classList.contains('open')) {
        closeMobileMenu();
        return;
      }
      mobileMenu.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    });
    mobileClose?.addEventListener('click', closeMobileMenu);
    mobileMenu.addEventListener('click', (e) => {
      if (e.target === mobileMenu) closeMobileMenu();
    });
    mobileMenu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  function closeMobileMenu() {
    mobileMenu?.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/* =================== ADMIN NAV LINK =================== */
function adminPanelPath() {
  const inPagesDir = window.location.pathname.toLowerCase().includes('/pages/');
  return inPagesDir ? 'admin-orders' : 'pages/admin-orders';
}

function removeAdminNavLinks() {
  document.querySelectorAll('[data-admin-nav-link]').forEach((el) => {
    const wrapper = el.closest('li[data-admin-nav-item]');
    if (wrapper) {
      wrapper.remove();
      return;
    }
    el.remove();
  });
}

function ensureAdminNavLinks() {
  const href = adminPanelPath();

  const desktopList = document.querySelector('.nav-links');
  if (desktopList && !desktopList.querySelector('[data-admin-nav-link]')) {
    const item = document.createElement('li');
    item.setAttribute('data-admin-nav-item', 'true');
    item.innerHTML = `<a href="${href}" class="nav-link" data-admin-nav-link="true">Admin Panel</a>`;
    desktopList.appendChild(item);
  }

  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu && !mobileMenu.querySelector('[data-admin-nav-link]')) {
    const link = document.createElement('a');
    link.href = href;
    link.className = 'nav-link';
    link.setAttribute('data-admin-nav-link', 'true');
    link.textContent = 'Admin Panel';
    mobileMenu.appendChild(link);
  }
}

function cacheAdminState(uid, isAdmin) {
  try {
    sessionStorage.setItem('waqtoro_admin_uid', uid || '');
    sessionStorage.setItem('waqtoro_admin_access', isAdmin ? '1' : '0');
  } catch {}
}

function readCachedAdminState(uid) {
  try {
    const cachedUid = sessionStorage.getItem('waqtoro_admin_uid');
    const cachedAccess = sessionStorage.getItem('waqtoro_admin_access');
    if (cachedUid && cachedUid === uid && cachedAccess) {
      return cachedAccess === '1';
    }
  } catch {}
  return null;
}

async function initAdminNavbarLink() {
  if (!document.querySelector('.nav-links') && !document.getElementById('mobile-menu')) return;

  try {
    const [{ auth, db }, authModule, firestoreModule] = await Promise.all([
      import('./firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')
    ]);

    const { onAuthStateChanged } = authModule;
    const { doc, getDoc } = firestoreModule;

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        cacheAdminState('', false);
        removeAdminNavLinks();
        return;
      }

      const cached = readCachedAdminState(user.uid);
      if (cached === true) {
        ensureAdminNavLinks();
        return;
      }
      if (cached === false) {
        removeAdminNavLinks();
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        const isAdmin = adminSnap.exists();
        cacheAdminState(user.uid, isAdmin);
        if (isAdmin) ensureAdminNavLinks();
        else removeAdminNavLinks();
      } catch {
        removeAdminNavLinks();
      }
    });
  } catch (error) {
    console.warn('Admin navbar link init skipped:', error);
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
      const keyword = searchInput.value.trim();
      const isRootPage = !window.location.pathname.includes('/pages/');
      const searchPage = isRootPage ? `pages/shop?q=${encodeURIComponent(keyword)}` : `shop?q=${encodeURIComponent(keyword)}`;
      WaqtoroAnalytics.track('search', { search_term: keyword });
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
    const path = window.location.pathname.toLowerCase();
    const isProductDetailPage = /(^|\/)product(\.html)?$/.test(path);

    // Add to cart
    const cartBtn = e.target.closest('.add-to-cart-btn');
    if (cartBtn && !isProductDetailPage) {
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
  WaqtoroAnalytics.track('page_view', {
    page_path: window.location.pathname,
    page_title: document.title
  });
  WaqtoroErrorMonitor.init();
  WaqtoroCart.updateCount();
  WaqtoroWishlist.updateButtons();
  initNavbar();
  initAdminNavbarLink();
  initSearch();
  initBackToTop();
  initAnimations();
  initGlobalProductHandlers();
  initNewsletter();

  // Load reviews after page is fully loaded and browser is idle
  // to avoid impacting LCP / TBT metrics
  window.addEventListener('load', () => {
    const loadReviews = () => {
      import('/js/reviews-live.js?v=1.0.1').catch((err) => {
        console.error('Failed to load live reviews module:', err);
      });
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadReviews, { timeout: 4000 });
    } else {
      setTimeout(loadReviews, 1500);
    }
  });
});
