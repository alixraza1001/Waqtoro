/**
 * WAQTORO — Checkout Page JavaScript
 * (Cloud-Synced Version 2 — Google & Email Auth)
 */
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PROMO_CODES = { 'WAQTORO10': 0.10, 'LUXURY20': 0.20, 'WELCOME15': 0.15 };

let currentStep = 1;
let shippingMethod = 'standard';
let shippingCost   = 0;
let paymentMethod  = 'card';
let promoDiscount  = 0;
let currentUser    = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial Checks
  if (!WaqtoroCart.items.length) {
    window.location.href = 'cart.html';
    return;
  }
  renderSidebar();

  // 2. Auth State Check & Pre-fill
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      prefillUserInfo(user);
    }
  });

  // 3. Attach Listeners
  initListeners();
});

function initListeners() {
  // Step Navigation
  document.getElementById('go-to-step-2')?.addEventListener('click', () => goToStep(2));
  document.getElementById('go-to-step-1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('go-to-step-3')?.addEventListener('click', () => goToStep(3));
  document.getElementById('go-to-step-2-back')?.addEventListener('click', () => goToStep(2));
  document.getElementById('go-to-step-4')?.addEventListener('click', () => goToStep(4));
  document.getElementById('go-to-step-3-back')?.addEventListener('click', () => goToStep(3));
  
  document.querySelectorAll('.btn-edit[data-edit-step]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.editStep)));
  });

  // Shipping
  document.getElementById('ship-standard-input')?.addEventListener('change', (e) => selectShipping(e.target));

  // Payment
  document.querySelectorAll('.payment-method-tab').forEach(btn => {
    btn.addEventListener('click', () => selectPaymentTab(btn, btn.dataset.method));
  });

  // Card Formatting
  document.getElementById('p-card')?.addEventListener('input', (e) => formatCard(e.target));
  document.getElementById('p-expiry')?.addEventListener('input', (e) => formatExpiry(e.target));

  // Promo
  document.getElementById('apply-promo-btn')?.addEventListener('click', applyPromo);

  // Place Order
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);
}

function prefillUserInfo(user) {
  const nameParts = (user.displayName || "").split(" ");
  const fname = document.getElementById('c-fname');
  const lname = document.getElementById('c-lname');
  const email = document.getElementById('c-email');

  if (fname && !fname.value) fname.value = nameParts[0] || "";
  if (lname && !lname.value) lname.value = nameParts.slice(1).join(" ") || "";
  if (email && !email.value) email.value = user.email || "";
}

/* ---- STEP NAVIGATION ---- */
function goToStep(step) {
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  document.getElementById(`step-${currentStep}`).style.display = 'none';
  document.getElementById(`step-${step}`).style.display = 'block';
  updateStepIndicators(step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (step === 4) populateReview();
}

function updateStepIndicators(step) {
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`step-ind-${i}`);
    if (ind) {
      ind.classList.remove('active', 'done');
      if (i < step)  ind.classList.add('done');
      if (i === step) ind.classList.add('active');
    }
  }
  document.querySelectorAll('.step-line').forEach((line, i) => {
    line.classList.toggle('done', i < step - 1);
  });
  document.querySelectorAll('.checkout-step.done .step-circle').forEach(c => {
    c.innerHTML = '✓';
  });
}

function validateStep(step) {
  if (step === 1) {
    const required = ['c-fname', 'c-lname', 'c-email', 'c-phone', 'c-address', 'c-city'];
    for (const id of required) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        el?.focus();
        showToast('Please fill in all required fields.', 'info');
        return false;
      }
    }
  }
  if (step === 3 && paymentMethod === 'card') {
    const card = document.getElementById('p-card')?.value.replace(/\s/g, '');
    if (!card || card.length < 13) {
      showToast('Please enter a valid card number.', 'info');
      return false;
    }
  }
  return true;
}

/* ---- SIDEBAR ---- */
function renderSidebar() {
  const itemsEl = document.getElementById('checkout-cart-items');
  const subtotalEl = document.getElementById('co-subtotal');
  const totalEl = document.getElementById('co-total');
  const shippingEl = document.getElementById('co-shipping');

  if (!itemsEl) return;

  itemsEl.innerHTML = WaqtoroCart.items.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return '';
    return `
      <div class="checkout-cart-item">
        <div class="checkout-cart-img"><img src="${IMG_BASE}${Array.isArray(p.img) ? p.img[0] : p.img}" alt="${p.name}" /></div>
        <div class="checkout-cart-info">
          <p class="checkout-cart-brand">${p.brand}</p>
          <p class="checkout-cart-name">${p.name}</p>
          <p class="checkout-cart-qty">Qty: ${item.qty}</p>
        </div>
        <span class="checkout-cart-price">${formatPrice(p.price * item.qty)}</span>
      </div>
    `;
  }).join('');

  const subtotal = WaqtoroCart.total();
  const discount = Math.round(subtotal * promoDiscount);
  const total    = subtotal - discount + shippingCost;

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl)    totalEl.textContent    = formatPrice(total);
  if (shippingEl) shippingEl.textContent = shippingCost > 0 ? formatPrice(shippingCost) : 'Free';
}

/* ---- SHIPPING ---- */
function selectShipping(radio) {
  document.querySelectorAll('.shipping-option').forEach(opt => opt.classList.remove('selected'));
  radio.closest('.shipping-option').classList.add('selected');
  shippingMethod = radio.value;
  shippingCost   = 0;
  renderSidebar();
}

/* ---- PAYMENT ---- */
function selectPaymentTab(btn, method) {
  document.querySelectorAll('.payment-method-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  paymentMethod = method;

  document.getElementById('pay-card').style.display   = method === 'card'    ? 'flex' : 'none';
  document.getElementById('pay-paypal').style.display = method === 'paypal'  ? 'block' : 'none';
  document.getElementById('pay-cod').style.display    = method === 'cod'     ? 'block' : 'none';
}

/* ---- CARD FORMATTING ---- */
function formatCard(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) val = val.substring(0, 2) + ' / ' + val.substring(2);
  input.value = val;
}

/* ---- PROMO ---- */
function applyPromo() {
  const codeInput = document.getElementById('co-promo');
  const code = codeInput?.value.trim().toUpperCase();
  const msg  = document.getElementById('co-promo-msg');
  if (PROMO_CODES[code]) {
    promoDiscount = PROMO_CODES[code];
    if (msg) { msg.textContent = `✓ ${Math.round(promoDiscount * 100)}% discount applied!`; msg.style.color = 'var(--clr-green)'; }
    if (codeInput) codeInput.disabled = true;
    renderSidebar();
  } else {
    if (msg) { msg.textContent = '✕ Invalid code.'; msg.style.color = 'var(--clr-red)'; }
  }
}

/* ---- REVIEW & PLACE ORDER ---- */
function populateReview() {
  const fname   = document.getElementById('c-fname')?.value;
  const lname   = document.getElementById('c-lname')?.value;
  const email   = document.getElementById('c-email')?.value;
  const phone   = document.getElementById('c-phone')?.value;
  const address = document.getElementById('c-address')?.value;
  const city    = document.getElementById('c-city')?.value;

  document.getElementById('review-contact').textContent = `${fname} ${lname} · ${email} · ${phone}`;
  document.getElementById('review-address').textContent = `${address}, ${city}`;
  document.getElementById('review-shipping').textContent = shippingMethod === 'standard' ? 'Standard Delivery — Free' : shippingMethod;
  document.getElementById('review-payment').textContent = paymentMethod === 'card' ? 'Credit/Debit Card' : paymentMethod.toUpperCase();

  const reviewItems = document.getElementById('review-items');
  if (reviewItems) {
    reviewItems.innerHTML = WaqtoroCart.items.map(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      if (!p) return '';
      return `
        <div class="review-item-row">
          <div class="review-item-img"><img src="${IMG_BASE}${p.img}" alt="${p.name}" /></div>
          <div class="review-item-info">
            <p class="review-item-name">${p.name} <span style="color:var(--clr-muted)">× ${item.qty}</span></p>
            <p class="review-item-brand">${p.brand}</p>
          </div>
          <span class="review-item-price">${formatPrice(p.price * item.qty)}</span>
        </div>
      `;
    }).join('');
  }
}

async function placeOrder() {
  const btn = document.getElementById('place-order-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing…';
  }

  const orderId = 'WQT-' + Date.now().toString(36).toUpperCase();
  const order = {
    id: orderId,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    items: [...WaqtoroCart.items],
    subtotal: WaqtoroCart.total(),
    shippingCost,
    total: WaqtoroCart.total() - Math.round(WaqtoroCart.total() * promoDiscount) + shippingCost,
    shipping: shippingMethod,
    payment: paymentMethod,
    userId: auth.currentUser ? auth.currentUser.uid : null,
    createdAt: serverTimestamp(),
    customer: {
      name: `${document.getElementById('c-fname').value} ${document.getElementById('c-lname').value}`,
      email: document.getElementById('c-email').value,
      address: `${document.getElementById('c-address').value}, ${document.getElementById('c-city').value}`
    }
  };

  try {
    // 1. Save to Cloud Firestore
    await addDoc(collection(db, 'orders'), order);

    // 2. Clear local cart
    WaqtoroCart.items = [];
    WaqtoroCart.save();

    // 3. Email Notification (using global emailjs from checkout.html script)
    if (typeof emailjs !== 'undefined') {
       await sendEmailNotifications(order);
    }

    // 4. Redirect
    localStorage.setItem('waqtoro_last_order', JSON.stringify(order));
    window.location.href = 'order-confirmation.html';

  } catch (error) {
    console.error("Order Failure:", error);
    showToast("There was an error placing your order. Please try again.", "info");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Place Order';
    }
  }
}

async function sendEmailNotifications(order) {
  const orderDetailsText = `New Order: ${order.id}\nTotal: Rs. ${order.total.toLocaleString()}\nCustomer: ${order.customer.name}\nEmail: ${order.customer.email}\nAddress: ${order.customer.address}`;
  
  try {
    emailjs.init("V4AbfNxoQW2_Zwp-R");
    await emailjs.send("service_amn9ohp", "template_sfia319", {
      to_email: "waqtoro@gmail.com",
      order_id: order.id,
      message: orderDetailsText,
      from_name: "Waqtoro Store"
    });
  } catch (e) { console.error("Email error:", e); }
}

function showToast(msg, type) {
  if (window.showToast) window.showToast(msg, type);
  else alert(msg);
}
