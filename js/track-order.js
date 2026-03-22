import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs, limit, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STATUS_STEPS = ['placed', 'processing', 'dispatched', 'delivered'];
const STATUS_LABELS = {
  placed: 'Order Placed',
  processing: 'Processing',
  dispatched: 'Dispatched',
  delivered: 'Delivered'
};

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user || null;
});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('track-order-btn');
  const idInput = document.getElementById('track-order-id');

  btn?.addEventListener('click', onTrack);
  idInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onTrack();
  });

  const params = new URLSearchParams(window.location.search);
  const prefill = params.get('id');
  if (prefill && idInput) {
    idInput.value = prefill.toUpperCase();
    onTrack();
  }
});

async function onTrack() {
  const orderId = (document.getElementById('track-order-id')?.value || '').trim().toUpperCase();
  const email = (document.getElementById('track-order-email')?.value || '').trim().toLowerCase();

  if (!orderId) {
    window.showToast?.('Enter a valid order ID first.', 'info');
    return;
  }

  let order = findLocalOrder(orderId, email);

  if (!order && currentUser) {
    order = await findFirestoreOrder(orderId, currentUser.uid, email);
  }

  if (!order) {
    renderNotFound('No matching order found. Use the same account or device used during checkout, or contact support.');
    return;
  }

  renderOrder(order);
  window.WaqtoroAnalytics?.track('track_order_lookup', {
    order_id: orderId,
    found: true
  });
}

function findLocalOrder(orderId, email) {
  const history = JSON.parse(localStorage.getItem('waqtoro_orders_history') || '[]');
  const last = JSON.parse(localStorage.getItem('waqtoro_last_order') || 'null');
  const combined = [...history, ...(last ? [last] : [])];

  return combined.find((order) => {
    if (!order || String(order.id || '').toUpperCase() !== orderId) return false;
    if (!email) return true;
    return String(order.customer?.email || '').toLowerCase() === email;
  }) || null;
}

async function findFirestoreOrder(orderId, uid, email) {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', uid),
      where('id', '==', orderId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = snap.docs[0].data();
    if (email) {
      const orderEmail = String(data.customer?.email || '').toLowerCase();
      if (orderEmail !== email) return null;
    }

    return data;
  } catch (error) {
    console.error('Track order lookup failed:', error);
    return null;
  }
}

function renderOrder(order) {
  const status = String(order.status || 'placed').toLowerCase();
  const resultEl = document.getElementById('track-result');
  const listEl = document.getElementById('track-status-list');
  const emptyEl = document.getElementById('track-empty-msg');

  document.getElementById('track-meta-id').textContent = order.id || '—';
  document.getElementById('track-meta-status').textContent = STATUS_LABELS[status] || 'Order Placed';
  document.getElementById('track-meta-date').textContent = order.date || '—';
  document.getElementById('track-meta-eta').textContent = order.shipping === 'standard' ? '3–5 business days' : 'Estimated soon';

  const activeIndex = Math.max(0, STATUS_STEPS.indexOf(status));
  listEl.innerHTML = STATUS_STEPS.map((step, index) => {
    const done = index <= activeIndex;
    return `
      <div class="track-status-step ${done ? 'done' : ''}">
        <div class="track-status-dot">${done ? '✓' : index + 1}</div>
        <div class="track-status-text">
          <strong>${STATUS_LABELS[step]}</strong>
          <p>${statusDescription(step, done)}</p>
        </div>
      </div>
    `;
  }).join('');

  if (emptyEl) emptyEl.textContent = '';
  resultEl?.classList.add('visible');
}

function renderNotFound(message) {
  const resultEl = document.getElementById('track-result');
  const listEl = document.getElementById('track-status-list');
  const emptyEl = document.getElementById('track-empty-msg');

  document.getElementById('track-meta-id').textContent = '—';
  document.getElementById('track-meta-status').textContent = 'Not Found';
  document.getElementById('track-meta-date').textContent = '—';

  if (listEl) listEl.innerHTML = '';
  if (emptyEl) emptyEl.textContent = message;
  resultEl?.classList.add('visible');

  window.WaqtoroAnalytics?.track('track_order_lookup', {
    order_id: (document.getElementById('track-order-id')?.value || '').trim().toUpperCase(),
    found: false
  });
}

function statusDescription(step, done) {
  if (step === 'placed') return done ? 'Order has been confirmed.' : 'Waiting for confirmation.';
  if (step === 'processing') return done ? 'Quality check and packing in progress/completed.' : 'Waiting to enter processing.';
  if (step === 'dispatched') return done ? 'Your shipment is on the way.' : 'Will appear once courier dispatches your order.';
  if (step === 'delivered') return done ? 'Order delivered successfully.' : 'Expected after dispatch and transit.';
  return '';
}
