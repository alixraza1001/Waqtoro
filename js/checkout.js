/**
 * WAQTORO — Checkout Page JavaScript
 * (Cloud-Synced Version 2 — Google & Email Auth)
 */
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PROMO_CODES = { 'WAQTORO10': 0.10, 'LUXURY20': 0.20, 'WELCOME15': 0.15 };


const CHECKOUT_STEP_HELPER_COPY = {
  1: 'Step 1 of 4 — Add your contact and shipping details.',
  2: 'Step 2 of 4 — Confirm your shipping method.',
  3: 'Step 3 of 4 — Choose how you want to pay.',
  4: 'Step 4 of 4 — Review everything before placing your order.'
};

let currentStep = 1;
let shippingMethod = 'standard';
let shippingCost   = 0;
let paymentMethod  = 'cod';
let promoDiscount  = 0;
let appliedPromoCode = '';
let currentUser    = null;

const STEP1_FIELD_RULES = [
  { id: 'c-fname', message: 'First name is required.' },
  { id: 'c-lname', message: 'Last name is required.' },
  { id: 'c-email', message: 'Email address is required.' },
  { id: 'c-phone', message: 'Phone number is required.' },
  { id: 'c-address', message: 'Street address is required.' },
  { id: 'c-city', message: 'City is required.' }
];

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
  updateStepHelper(currentStep);
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

  STEP1_FIELD_RULES.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });

  ['p-card', 'p-expiry', 'p-cvv'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => clearFieldError(el));
  });
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
  updateStepHelper(step);
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (step === 4) populateReview();
}

function updateStepHelper(step) {
  const helper = document.getElementById('checkout-step-helper');
  if (!helper) return;
  helper.textContent = CHECKOUT_STEP_HELPER_COPY[step] || '';
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
    let firstInvalid = null;

    STEP1_FIELD_RULES.forEach(({ id, message }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim()) {
        setFieldError(el, message);
        if (!firstInvalid) firstInvalid = el;
      } else {
        clearFieldError(el);
      }
    });

    const emailEl = document.getElementById('c-email');
    if (emailEl && emailEl.value.trim() && !isValidEmail(emailEl.value.trim())) {
      setFieldError(emailEl, 'Enter a valid email address.');
      if (!firstInvalid) firstInvalid = emailEl;
    }

    const phoneEl = document.getElementById('c-phone');
    if (phoneEl && phoneEl.value.trim() && !isValidPhone(phoneEl.value.trim())) {
      setFieldError(phoneEl, 'Enter a valid phone number.');
      if (!firstInvalid) firstInvalid = phoneEl;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      showToast('Please correct the highlighted fields.', 'info');
      return false;
    }
  }
  if (step === 3 && paymentMethod === 'card') {
    const cardEl = document.getElementById('p-card');
    const card = cardEl?.value.replace(/\s/g, '');
    if (!card || card.length < 13) {
      if (cardEl) {
        setFieldError(cardEl, 'Please enter a valid card number.');
        cardEl.focus();
      }
      showToast('Please enter a valid card number.', 'info');
      return false;
    }
  }
  return true;
}

function getFieldErrorNode(inputEl) {
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return null;
  let errorNode = formGroup.querySelector('.field-error');
  if (!errorNode) {
    errorNode = document.createElement('p');
    errorNode.className = 'field-error';
    formGroup.appendChild(errorNode);
  }
  return errorNode;
}

function setFieldError(inputEl, message) {
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.add('has-error');
  const errorNode = getFieldErrorNode(inputEl);
  if (errorNode) errorNode.textContent = message;
}

function clearFieldError(inputEl) {
  const formGroup = inputEl.closest('.form-group');
  if (!formGroup) return;
  formGroup.classList.remove('has-error');
  const errorNode = formGroup.querySelector('.field-error');
  if (errorNode) errorNode.textContent = '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^[+\d\s()-]{7,20}$/.test(value);
}

/* ---- SIDEBAR ---- */
function renderSidebar() {
  const itemsEl = document.getElementById('checkout-cart-items');
  const subtotalEl = document.getElementById('co-subtotal');
  const discountRowEl = document.getElementById('co-discount-row');
  const discountLabelEl = document.getElementById('co-discount-label');
  const discountEl = document.getElementById('co-discount');
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
  if (discountRowEl && discountLabelEl && discountEl) {
    if (discount > 0) {
      discountRowEl.style.display = 'flex';
      discountLabelEl.textContent = appliedPromoCode ? `Discount (${appliedPromoCode})` : 'Discount';
      discountEl.textContent = `-${formatPrice(discount)}`;
    } else {
      discountRowEl.style.display = 'none';
      discountLabelEl.textContent = 'Discount';
      discountEl.textContent = '-';
    }
  }
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
  if (btn.dataset.unavailable === 'true') {
    showToast('This payment method is coming soon. Please use Cash on Delivery for now.', 'info');
    return;
  }

  document.querySelectorAll('.payment-method-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  paymentMethod = method;

  document.getElementById('pay-online').style.display   = method === 'online'   ? 'block' : 'none';
  document.getElementById('pay-card').style.display     = method === 'card'     ? 'flex' : 'none';
  document.getElementById('pay-paypal').style.display   = method === 'paypal'   ? 'block' : 'none';
  document.getElementById('pay-cod').style.display      = method === 'cod'      ? 'block' : 'none';
}

/** 
 * ---- JAZZCASH REDIRECTION ---- 
 * Calculates HMAC-SHA256 hash and submits the hidden form.
 */
async function redirectToJazzCash(order) {
  const form = document.getElementById('jazzcash-checkout-form');
  if (!form) return;

  // 1. Prepare Data (Sandbox Values for now)
  const MerchantID = "MC12345"; // Placeholder
  const Password   = "password";  // Placeholder
  const Salt       = "salt123";      // Placeholder
  
  const txnRefNo   = "T" + Date.now();
  const amount     = Math.round(order.total * 100); // Amount in Paisas
  const dateTime   = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];
  const expiry     = new Date(Date.now() + 3600000).toISOString().replace(/[-:T]/g, "").split(".")[0]; 

  const params = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET", // Default to Wallet for now
    pp_Language: "EN",
    pp_MerchantID: MerchantID,
    pp_Password: Password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amount.toString(),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: dateTime,
    pp_BillReference: order.id,
    pp_Description: "Order " + order.id + " from Waqtoro",
    pp_TxnExpiryDateTime: expiry,
    pp_ReturnURL: window.location.origin + "/pages/order-confirmation.html",
    ppmpf_1: "customer_name",
    ppmpf_2: "customer_email",
    ppmpf_3: "customer_phone",
    ppmpf_4: "customer_address",
    ppmpf_5: "customer_city"
  };

  // 2. Generate Secure Hash
  // Sort keys alphabetically and join with '&'
  const sortedKeys = Object.keys(params).sort();
  let hashString = Salt;
  for (const key of sortedKeys) {
    if (params[key] !== "") hashString += "&" + params[key];
  }

  const hash = await generateSHA256Hash(hashString);
  params.pp_SecureHash = hash;

  // 3. Populate Form & Submit
  for (const key in params) {
    const input = form.querySelector(`input[name="${key}"]`);
    if (input) input.value = params[key];
  }

  form.submit();
}

async function generateSHA256Hash(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
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
    appliedPromoCode = code;
    window.WaqtoroAnalytics?.track('apply_coupon', {
      coupon: code,
      discount_percent: Math.round(promoDiscount * 100)
    });
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
  document.getElementById('review-shipping').textContent = shippingMethod === 'standard' ? 'Standard Delivery — Free (3–5 business days)' : shippingMethod;
  document.getElementById('review-payment').textContent = paymentMethod === 'card' ? 'Credit/Debit Card' : paymentMethod.toUpperCase();

  const reviewItems = document.getElementById('review-items');
  if (reviewItems) {
    reviewItems.innerHTML = WaqtoroCart.items.map(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      if (!p) return '';
      return `
        <div class="review-item-row">
          <div class="review-item-img"><img src="${IMG_BASE}${Array.isArray(p.img) ? p.img[0] : p.img}" alt="${p.name}" /></div>
          <div class="review-item-info">
            <p class="review-item-name">${p.name} <span style="color:var(--clr-muted)">× ${item.qty}</span></p>
            <p class="review-item-brand">${p.brand}${item.color ? ` · ${item.color}` : ''}</p>
          </div>
          <span class="review-item-price">${formatPrice(p.price * item.qty)}</span>
        </div>
      `;
    }).join('');
  }
}

async function placeOrder() {
  if (paymentMethod === 'online' || paymentMethod === 'card' || paymentMethod === 'paypal') {
    showToast("Online payments are temporarily unavailable. Please use Cash on Delivery or contact us.", "info");
    return;
  }

  const btn = document.getElementById('place-order-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Processing…';
  }

  const orderId = 'WQT-' + Date.now().toString(36).toUpperCase();
  const computedSubtotal = WaqtoroCart.total();
  const computedDiscount = Math.round(computedSubtotal * promoDiscount);
  const computedTotal = computedSubtotal - computedDiscount + shippingCost;
  const order = {
    id: orderId,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    items: [...WaqtoroCart.items],
    subtotal: computedSubtotal,
    discount: computedDiscount,
    promoCode: appliedPromoCode || null,
    shippingCost,
    total: computedTotal,
    shipping: shippingMethod,
    payment: paymentMethod,
    status: 'placed',
    statusTimeline: [
      {
        status: 'placed',
        label: 'Order Placed',
        at: new Date().toISOString()
      }
    ],
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

    // 1.2 Notify PakkOrder (WhatsApp automation)
    sendToPakkOrder(order);



    // 1.1 Save local order history for guest tracking
    persistOrderHistory(order);

    window.WaqtoroAnalytics?.track('purchase', {
      transaction_id: order.id,
      value: order.total,
      currency: 'PKR',
      shipping: order.shippingCost,
      coupon: order.promoCode,
      item_count: order.items.reduce((sum, item) => sum + item.qty, 0)
    });

    // 2. Clear local cart
    WaqtoroCart.items = [];
    WaqtoroCart.save();

    // 3. Email Notification
    if (typeof emailjs !== 'undefined') {
       await sendEmailNotifications(order);
    }

    // 4. Redirect to Confirmation
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

function persistOrderHistory(order) {
  const history = JSON.parse(localStorage.getItem('waqtoro_orders_history') || '[]');
  history.push(order);
  localStorage.setItem('waqtoro_orders_history', JSON.stringify(history.slice(-25)));
}

// ── PakkOrder: manual trigger (checkout has no <form>, so snippet can't auto-detect) ──
function sendToPakkOrder(order) {
  try {
    const key = document.querySelector('script[data-key]')?.getAttribute('data-key');
    if (!key) return;
    const phone = document.getElementById('c-phone')?.value?.trim();
    if (!phone) return;
    const itemsText = order.items.map(i => `${i.qty}x ${i.id}`).join(', ');
    fetch('https://pakkorder.com/new-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-License-Key': key },
      body: JSON.stringify({
        buyer_phone:   phone,
        buyer_email:   document.getElementById('c-email')?.value?.trim() || undefined,
        order_id:      order.id,
        order_details: `${itemsText} — Rs. ${order.total.toLocaleString()}`,
      })
    }).catch(e => console.warn('[PakkOrder] notification failed:', e.message));
  } catch (e) {
    console.warn('[PakkOrder] sendToPakkOrder error:', e.message);
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
