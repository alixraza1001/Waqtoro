import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { arrayUnion, collection, doc, getDoc, getDocs, query, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STATUS_ORDER = ['placed', 'processing', 'dispatched', 'delivered'];
const EMAILJS_SERVICE_ID = 'service_amn9ohp';
const EMAILJS_TEMPLATE_ID = 'template_sfia319';
const EMAILJS_PUBLIC_KEY = 'V4AbfNxoQW2_Zwp-R';

let allOrders = [];
let isAdminUser = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    renderDenied();
    return;
  }

  isAdminUser = await checkAdminAccess(user);
  if (!isAdminUser) {
    renderDenied();
    return;
  }

  renderPanel();
  await loadOrders();
  setupSearch();
});

async function checkAdminAccess(user) {
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

function renderDenied() {
  document.getElementById('admin-loading').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('admin-denied').style.display = 'block';
}

function renderPanel() {
  document.getElementById('admin-loading').style.display = 'none';
  document.getElementById('admin-denied').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
}

async function loadOrders() {
  try {
    const snap = await getDocs(query(collection(db, 'orders')));
    allOrders = [];

    snap.forEach((orderDoc) => {
      const data = orderDoc.data();
      allOrders.push({
        ...data,
        id: data.id || orderDoc.id,
        orderDocId: orderDoc.id
      });
    });

    allOrders.sort((a, b) => {
      const dateA = normalizeDate(a);
      const dateB = normalizeDate(b);
      return dateB - dateA;
    });

    renderOrders('');
  } catch (error) {
    console.error('Failed to load admin orders:', error);
    window.showToast?.('Failed to load orders.', 'info');
  }
}

function normalizeDate(order) {
  const ts = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null;
  if (ts) return ts;
  const parsed = Date.parse(order.date || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeStatus(rawStatus) {
  const normalized = String(rawStatus || 'placed').toLowerCase();
  if (normalized === 'shipped') return 'dispatched';
  if (!STATUS_ORDER.includes(normalized)) return 'placed';
  return normalized;
}

function statusLabel(status) {
  if (status === 'placed') return 'Order Placed';
  if (status === 'processing') return 'Processing';
  if (status === 'dispatched') return 'Dispatched';
  if (status === 'delivered') return 'Delivered';
  return 'Order Placed';
}

function badgeColors(status) {
  if (status === 'delivered') return { bg: 'var(--clr-green)', color: '#fff' };
  if (status === 'dispatched') return { bg: '#3498db', color: '#fff' };
  return { bg: 'var(--clr-gold)', color: 'var(--clr-black)' };
}

function setupSearch() {
  const input = document.getElementById('admin-order-search');
  if (!input) return;
  input.addEventListener('input', () => renderOrders(input.value.trim().toLowerCase()));
}

function renderOrders(searchTerm) {
  const filtered = allOrders.filter((order) => {
    if (!searchTerm) return true;
    const haystack = [
      order.id,
      order.customer?.name,
      order.customer?.email
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(searchTerm);
  });

  const activeOrders = filtered.filter((o) => normalizeStatus(o.status) !== 'delivered');
  const completedOrders = filtered.filter((o) => normalizeStatus(o.status) === 'delivered');

  document.getElementById('admin-active-count').textContent = String(activeOrders.length);
  document.getElementById('admin-completed-count').textContent = String(completedOrders.length);
  document.getElementById('admin-active-heading-count').textContent = String(activeOrders.length);
  document.getElementById('admin-completed-heading-count').textContent = String(completedOrders.length);

  const activeContainer = document.getElementById('admin-active-orders');
  const completedContainer = document.getElementById('admin-completed-orders');

  activeContainer.innerHTML = activeOrders.length
    ? activeOrders.map(buildOrderCard).join('')
    : '<p class="admin-empty">No active orders.</p>';

  completedContainer.innerHTML = completedOrders.length
    ? completedOrders.map(buildOrderCard).join('')
    : '<p class="admin-empty">No completed orders.</p>';

  document.querySelectorAll('.admin-status-save').forEach((btn) => {
    btn.addEventListener('click', () => saveStatus(btn));
  });
}

function buildOrderCard(order) {
  const normalizedStatus = normalizeStatus(order.status);
  const label = statusLabel(normalizedStatus);
  const badge = badgeColors(normalizedStatus);
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const timelinePreview = buildTimelinePreview(order.statusTimeline || []);

  return `
    <article class="admin-order-card">
      <div class="admin-order-top">
        <div class="admin-order-id">${order.id}</div>
        <span class="admin-badge" style="background:${badge.bg};color:${badge.color};">${label}</span>
      </div>
      <p class="admin-order-meta">${order.customer?.name || 'Customer'} · ${order.customer?.email || 'No email'} · ${itemCount} item${itemCount === 1 ? '' : 's'} · Rs. ${(order.total || 0).toLocaleString('en-PK')}</p>
      ${timelinePreview}
      <div class="admin-order-actions">
        <select class="admin-order-status" data-order-doc-id="${order.orderDocId}" data-order-id="${order.id}">
          <option value="placed" ${normalizedStatus === 'placed' ? 'selected' : ''}>Order Placed</option>
          <option value="processing" ${normalizedStatus === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="dispatched" ${normalizedStatus === 'dispatched' ? 'selected' : ''}>Dispatched</option>
          <option value="delivered" ${normalizedStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
        </select>
        <button class="btn btn-ghost admin-status-save" data-order-doc-id="${order.orderDocId}" data-order-id="${order.id}">Update Status</button>
        <a href="track-order?id=${encodeURIComponent(order.id)}" class="btn btn-primary" style="font-size:0.74rem;padding:0.48rem 0.85rem;text-decoration:none;">Track View</a>
      </div>
    </article>
  `;
}

function buildTimelinePreview(timeline) {
  if (!Array.isArray(timeline) || !timeline.length) {
    return '<div class="admin-order-timeline"><p class="admin-timeline-empty">No status timeline yet.</p></div>';
  }

  const parsed = [...timeline]
    .map((entry) => ({
      status: normalizeStatus(entry?.status),
      label: entry?.label || statusLabel(normalizeStatus(entry?.status)),
      at: entry?.at || null,
      by: entry?.by || null
    }))
    .sort((a, b) => Date.parse(b.at || '') - Date.parse(a.at || ''))
    .slice(0, 3);

  return `
    <div class="admin-order-timeline">
      ${parsed.map((entry) => `
        <p><strong>${entry.label}</strong> · ${formatTimelineDate(entry.at)}${entry.by ? ` · by ${entry.by}` : ''}</p>
      `).join('')}
    </div>
  `;
}

function formatTimelineDate(value) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'time unavailable';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function saveStatus(buttonEl) {
  const orderDocId = buttonEl.dataset.orderDocId;
  const orderId = buttonEl.dataset.orderId;
  if (!orderDocId || !orderId) return;

  const selectEl = document.querySelector(`.admin-order-status[data-order-doc-id="${orderDocId}"]`);
  const nextStatus = normalizeStatus(selectEl?.value);

  buttonEl.disabled = true;
  buttonEl.textContent = 'Saving...';

  try {
    const timelineEntry = {
      status: nextStatus,
      label: statusLabel(nextStatus),
      at: new Date().toISOString(),
      by: auth.currentUser?.uid || null
    };

    await updateDoc(doc(db, 'orders', orderDocId), {
      status: nextStatus,
      statusTimeline: arrayUnion(timelineEntry),
      updatedAt: new Date().toISOString()
    });

    const index = allOrders.findIndex((o) => o.orderDocId === orderDocId);
    if (index >= 0) {
      allOrders[index].status = nextStatus;
      allOrders[index].statusTimeline = Array.isArray(allOrders[index].statusTimeline)
        ? [...allOrders[index].statusTimeline, timelineEntry]
        : [timelineEntry];
    }

    await sendStatusUpdateNotification(allOrders[index]);

    window.showToast?.(`Order ${orderId} set to ${statusLabel(nextStatus)}.`, 'check');
    const searchTerm = (document.getElementById('admin-order-search')?.value || '').trim().toLowerCase();
    renderOrders(searchTerm);
  } catch (error) {
    console.error('Admin panel status update failed:', error);
    window.showToast?.('Could not update order status.', 'info');
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = 'Update Status';
  }
}

async function sendStatusUpdateNotification(order) {
  if (!order?.customer?.email || typeof emailjs === 'undefined') return;

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    const readableStatus = statusLabel(normalizeStatus(order.status));
    const message = `Your order ${order.id} status is now: ${readableStatus}. You can track it anytime at https://waqtoro.live/pages/track-order?id=${encodeURIComponent(order.id)}`;

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: order.customer.email,
      order_id: order.id,
      message,
      from_name: 'Waqtoro Order Updates'
    });
  } catch (error) {
    console.error('Status notification email failed:', error);
  }
}
