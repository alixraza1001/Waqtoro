/**
 * WAQTORO — Account Page JavaScript
 * (Cloud-Synced Version 2 — Google & Email Auth)
 */
import { auth, db, googleProvider } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion,
  collection, 
  query, 
  where, 
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Global cache for current user data
let currentUserData = null;
let currentUserIsAdmin = false;
const ADMIN_SEED_EMAILS = ['waqtoro@gmail.com'];

/* =================== AUTH INITIALIZATION =================== */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Listen for Auth State
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await syncUserProfile(user);
    } else {
      currentUserData = null;
      showAuth();
    }
  });

  // 2. Attach Event Listeners
  initEventListeners();
});

function initEventListeners() {
  // Auth Tabs
  document.getElementById('login-tab')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('register-tab')?.addEventListener('click', () => switchAuthTab('register'));

  // Forms
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
  document.getElementById('settings-form')?.addEventListener('submit', saveSettings);

  // Buttons
  document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleLogin);
  document.getElementById('google-reg-btn')?.addEventListener('click', handleGoogleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('forgot-password-link')?.addEventListener('click', handleForgotPassword);

  // Dashboard Nav
  document.querySelectorAll('.dash-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.dataset.tab;
      switchDashTab(tab);
    });
  });
}

/* =================== PROFILE SYNCING =================== */
async function syncUserProfile(user) {
  try {
    if (ADMIN_SEED_EMAILS.includes((user.email || '').toLowerCase())) {
      await setDoc(doc(db, 'admins', user.uid), {
        email: user.email,
        role: 'admin',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    currentUserIsAdmin = adminSnap.exists();

    if (userSnap.exists()) {
      currentUserData = userSnap.data();
    } else {
      // Create new profile if it's a first-time Google login
      const [firstName, ...lastNames] = (user.displayName || "User").split(" ");
      currentUserData = {
        firstName: firstName || "User",
        lastName: lastNames.join(" ") || "",
        email: user.email,
        uid: user.uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, currentUserData);
    }

    await loadOrderHistory(user.uid, currentUserIsAdmin);
    showDashboard(currentUserData);
  } catch (error) {
    console.error("Profile Sync Error:", error);
    showToast("Error syncing profile. Please refresh.", "info");
  }
}

async function loadOrderHistory(uid, isAdmin = false) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = isAdmin ? query(ordersRef) : query(ordersRef, where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    
    let orders = [];
    querySnapshot.forEach((orderDoc) => {
      const data = orderDoc.data();
      orders.push({
        ...data,
        id: data.id || orderDoc.id,
        orderDocId: orderDoc.id
      });
    });

    // Sort in JS instead (descending by createdAt/date)
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.date || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.date || 0);
      return dateB - dateA;
    });

    currentUserData.orders = orders;
  } catch (error) {
    console.warn("Order History Load Error:", error);
    currentUserData.orders = []; // Fallback to empty
  }
}

/* =================== AUTH HANDLERS =================== */
async function handleGoogleLogin() {
  try {
    await signInWithPopup(auth, googleProvider);
    showToast("Signed in with Google! 🚀", "check");
  } catch (error) {
    console.error("Google Login Error:", error);
    showToast("Google sign-in failed.", "info");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    showToast("Welcome back! Signed in.", "check");
  } catch (error) {
    console.error("Login Error:", error);
    showToast("Invalid email or password.", "info");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const fName = document.getElementById('reg-firstname').value.trim();
  const lName = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const conf  = document.getElementById('reg-confirm').value;

  if (pass !== conf) {
    showToast("Passwords do not match.", "info");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Save profile to Firestore
    const userData = {
      firstName: fName,
      lastName: lName,
      email: email,
      uid: user.uid,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', user.uid), userData);
    
    showToast(`Welcome to Waqtoro, ${fName}! 🎉`, "check");
  } catch (error) {
    console.error("Register Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      showToast("Email already registered.", "info");
    } else {
      showToast("Registration failed.", "info");
    }
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showToast("You have been signed out.", "info");
  } catch (error) {
    showToast("Error signing out.", "info");
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  if (!email) {
    showToast('Enter your email above first, then click Forgot password.', 'info');
    document.getElementById('login-email')?.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showToast('Password reset link sent to your email.', 'check');
  } catch (error) {
    console.error('Forgot password error:', error);
    showToast('Could not send reset email. Check the email and try again.', 'info');
  }
}

/* =================== DASHBOARD UI =================== */
function showAuth() {
  document.getElementById('auth-panel').style.display = 'block';
  document.getElementById('dashboard-panel').style.display = 'none';
}

function showDashboard(user) {
  document.getElementById('auth-panel').style.display = 'none';
  document.getElementById('dashboard-panel').style.display = 'grid';

  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  const dashNameEl = document.getElementById('dash-first-name');

  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.firstName.charAt(0).toUpperCase();
  if (dashNameEl) dashNameEl.textContent = user.firstName;

  // Prefill settings
  const sfname = document.getElementById('s-fname');
  const slname = document.getElementById('s-lname');
  const semail = document.getElementById('s-email');
  if (sfname) sfname.value = user.firstName;
  if (slname) slname.value = user.lastName;
  if (semail) semail.value = user.email;

  // Stats
  const wishlistItems = (typeof WaqtoroWishlist !== 'undefined' && WaqtoroWishlist.items) || [];
  const wishlistCountEl = document.getElementById('dash-wishlist-count');
  if (wishlistCountEl) wishlistCountEl.textContent = wishlistItems.length;
  
  const userOrders = user.orders || [];
  const statNums = document.querySelectorAll('.dash-stat-num');
  if (statNums.length >= 3) {
    statNums[0].textContent = userOrders.length;
    const totalSpent = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    statNums[2].textContent = `Rs. ${totalSpent.toLocaleString('en-PK')}`;
  }

  renderOrders(userOrders, currentUserIsAdmin);
  renderDashWishlist();
}

function renderOrders(orders, isAdmin = false) {
  const container = document.getElementById('tab-orders');
  if (!container) return;

  const sectionTitle = isAdmin ? 'Order Management' : 'My Orders';
  const activeOrders = orders.filter((order) => normalizeOrderStatus(order.status) !== 'delivered');
  const completedOrders = orders.filter((order) => normalizeOrderStatus(order.status) === 'delivered');

  if (orders.length === 0) {
    container.innerHTML = `
      <h2 class="dash-title">${sectionTitle}</h2>
      <div class="empty-dash">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>No orders yet.</p>
        <a href="shop" class="btn btn-primary" style="margin-top:1rem;">Start Shopping</a>
      </div>
    `;
    return;
  }

  const buildOrderCard = (order) => {
    const normalizedStatus = normalizeOrderStatus(order.status);
    const status = statusLabel(normalizedStatus);
    const statusColor = normalizedStatus === 'delivered'
      ? 'var(--clr-green)'
      : (normalizedStatus === 'dispatched' ? '#3498db' : 'var(--clr-gold)');
    const textColor = normalizedStatus === 'delivered' || normalizedStatus === 'dispatched' ? '#fff' : 'var(--clr-black)';

    return `
    <div class="order-card" style="background: var(--clr-bg-3); padding: 1.5rem; border-radius: 12px; margin-top: 1.5rem; border: 1px solid var(--clr-border);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
        <div>
          <p style="font-size: 0.7rem; color: var(--clr-muted); text-transform:uppercase; letter-spacing:0.05em;">Order ID</p>
          <strong style="color: var(--clr-white); font-size:0.9rem;">${order.id}</strong>
        </div>
        <div>
          <span class="badge" style="background: ${statusColor}; color: ${textColor}; font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 4px;">${status}</span>
        </div>
      </div>
      <div style="padding: 1rem 0; border-top: 1px solid var(--clr-border); border-bottom: 1px solid var(--clr-border); margin-bottom: 1rem;">
         <p style="color: var(--clr-white-dim); font-size: 0.85rem;">${order.items.length} Item${order.items.length > 1 ? 's' : ''} · Total: Rs. ${(order.total || 0).toLocaleString('en-PK')}</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size: 0.75rem; color: var(--clr-muted);">${order.date || 'Today'}</span>
        <a href="track-order?id=${encodeURIComponent(order.id)}" class="btn btn-primary" style="font-size:0.7rem; padding: 0.4rem 0.8rem; text-decoration:none;">Track Order</a>
      </div>
      ${isAdmin ? `
        <div style="margin-top:1rem;display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;">
          <select class="admin-order-status" data-order-doc-id="${order.orderDocId}" data-order-id="${order.id}" style="min-width:170px;padding:0.45rem 0.6rem;background:var(--clr-bg);border:1px solid var(--clr-border);border-radius:8px;color:var(--clr-white);">
            <option value="placed" ${normalizedStatus === 'placed' ? 'selected' : ''}>Order Placed</option>
            <option value="processing" ${normalizedStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="dispatched" ${normalizedStatus === 'dispatched' ? 'selected' : ''}>Dispatched</option>
            <option value="delivered" ${normalizedStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
          <button class="btn btn-ghost admin-status-save" data-order-doc-id="${order.orderDocId}" data-order-id="${order.id}" style="font-size:0.7rem;padding:0.45rem 0.8rem;">Update Status</button>
        </div>
      ` : ''}
    </div>
  `;
  };

  const activeOrdersHTML = activeOrders.length
    ? activeOrders.map(buildOrderCard).join('')
    : `<div class="empty-dash" style="margin-top:1.5rem;"><p>No active orders right now.</p></div>`;

  const completedOrdersHTML = completedOrders.length
    ? completedOrders.map(buildOrderCard).join('')
    : `<p style="margin-top:1rem;color:var(--clr-muted);font-size:0.85rem;">No completed orders yet.</p>`;

  const adminHint = isAdmin ? `<p style="margin-top:0.4rem;color:var(--clr-muted);font-size:0.78rem;">Admin mode: updates here are reflected in customer order tracking.</p>` : '';
  container.innerHTML = `
    <h2 class="dash-title">${sectionTitle}</h2>
    ${adminHint}
    <h3 style="margin-top:1rem;font-size:1rem;color:var(--clr-white-dim);">Active Orders (${activeOrders.length})</h3>
    ${activeOrdersHTML}
    <h3 style="margin-top:2rem;font-size:1rem;color:var(--clr-white-dim);">Completed Orders (${completedOrders.length})</h3>
    ${completedOrdersHTML}
  `;

  if (isAdmin) {
    container.querySelectorAll('.admin-status-save').forEach((btn) => {
      btn.addEventListener('click', () => handleAdminStatusUpdate(btn));
    });
  }
}

function normalizeOrderStatus(rawStatus) {
  const normalized = String(rawStatus || 'placed').toLowerCase();
  if (normalized === 'shipped') return 'dispatched';
  if (!['placed', 'processing', 'dispatched', 'delivered'].includes(normalized)) return 'placed';
  return normalized;
}

function statusLabel(status) {
  const labels = {
    placed: 'Order Placed',
    processing: 'Processing',
    dispatched: 'Dispatched',
    delivered: 'Delivered'
  };
  return labels[status] || 'Order Placed';
}

async function handleAdminStatusUpdate(buttonEl) {
  const orderDocId = buttonEl.dataset.orderDocId;
  const orderId = buttonEl.dataset.orderId;
  if (!orderDocId || !orderId) return;

  const selectEl = document.querySelector(`.admin-order-status[data-order-doc-id="${orderDocId}"]`);
  const nextStatus = normalizeOrderStatus(selectEl?.value);
  if (!nextStatus) return;

  buttonEl.disabled = true;
  buttonEl.textContent = 'Saving...';

  try {
    await updateDoc(doc(db, 'orders', orderDocId), {
      status: nextStatus,
      statusTimeline: arrayUnion({
        status: nextStatus,
        label: statusLabel(nextStatus),
        at: new Date().toISOString(),
        by: auth.currentUser?.uid || null
      }),
      updatedAt: new Date().toISOString()
    });

    if (currentUserData?.orders?.length) {
      const orderIndex = currentUserData.orders.findIndex(o => o.orderDocId === orderDocId);
      if (orderIndex >= 0) {
        currentUserData.orders[orderIndex].status = nextStatus;
      }
    }

    showToast(`Order ${orderId} set to ${statusLabel(nextStatus)}.`, 'check');
    await loadOrderHistory(auth.currentUser.uid, currentUserIsAdmin);
    renderOrders(currentUserData.orders || [], currentUserIsAdmin);
  } catch (error) {
    console.error('Admin status update error:', error);
    showToast('Could not update order status.', 'info');
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = 'Update Status';
  }
}

function renderDashWishlist() {
  const grid = document.getElementById('dash-wishlist-grid');
  if (!grid) return;
  const ids = (typeof WaqtoroWishlist !== 'undefined' && WaqtoroWishlist.items) || [];
  if (!ids.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-muted);">
      <p>Your wishlist is empty.</p>
      <a href="shop" class="btn btn-ghost" style="margin-top:1rem;">Add some watches ♥</a>
    </div>`;
    return;
  }
  const items = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.filter(p => ids.includes(p.id)) : [];
  if (typeof buildProductCard === 'function') {
    grid.innerHTML = items.map(p => buildProductCard(p)).join('');
    if (WaqtoroWishlist.updateButtons) WaqtoroWishlist.updateButtons();
  }
}

async function saveSettings(e) {
  e.preventDefault();
  if (!currentUserData) return;
  
  const fn = document.getElementById('s-fname').value.trim();
  const ln = document.getElementById('s-lname').value.trim();
  const phone = document.getElementById('s-phone').value.trim();

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
      firstName: fn,
      lastName: ln,
      phone: phone
    });

    currentUserData.firstName = fn;
    currentUserData.lastName = ln;
    currentUserData.phone = phone;

    showToast("Settings saved!", "check");
    showDashboard(currentUserData);
  } catch (error) {
    console.error("Save Settings Error:", error);
    showToast("Failed to save settings.", "info");
  }
}

/* =================== UTILS =================== */
function switchAuthTab(tab) {
  const lForm = document.getElementById('login-form');
  const rForm = document.getElementById('register-form');
  const lTab  = document.getElementById('login-tab');
  const rTab  = document.getElementById('register-tab');

  if (lForm) lForm.style.display = (tab === 'login' ? 'flex' : 'none');
  if (rForm) rForm.style.display = (tab === 'register' ? 'flex' : 'none');
  if (lTab) lTab.classList.toggle('active', tab === 'login');
  if (rTab) rTab.classList.toggle('active', tab === 'register');
}

function switchDashTab(tabName) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.dash-nav-btn').forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.add('active');
  
  const targetBtn = document.querySelector(`.dash-nav-btn[data-tab="${tabName}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  if (tabName === 'wishlist') renderDashWishlist();
}

function showToast(msg, type) {
  if (window.showToast) window.showToast(msg, type);
  else alert(msg);
}
