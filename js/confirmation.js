/**
 * WAQTORO — Order Confirmation JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const order = JSON.parse(localStorage.getItem('waqtoro_last_order'));
  if (!order) {
    // No order found, redirect to shop
    window.location.href = 'shop.html';
    return;
  }

  populateConfirmation(order);
  launchConfetti();
  renderSuggested(order.items);
});

function populateConfirmation(order) {
  document.getElementById('conf-order-id').textContent = order.id;
  const trackLink = document.getElementById('conf-track-link');
  if (trackLink && order.id) {
    trackLink.href = `track-order?id=${encodeURIComponent(order.id)}`;
  }
  document.getElementById('conf-address').textContent  = order.customer.address;
  document.getElementById('conf-customer').textContent = `${order.customer.name} · ${order.customer.email}`;
  const phoneEl = document.getElementById('conf-phone');
  if (phoneEl) phoneEl.textContent = order.customer.phone || '—';
  document.getElementById('conf-date').textContent     = order.date;
  const etaEl = document.getElementById('conf-eta');
  if (etaEl) {
    etaEl.textContent = order.shipping === 'standard' ? '3–5 business days' : 'Estimated soon';
  }

  const paymentLabels = { card: 'Credit / Debit Card', paypal: 'PayPal', cod: 'Cash on Delivery' };
  document.getElementById('conf-payment').textContent = paymentLabels[order.payment] || order.payment;

  const shippingEl = document.getElementById('conf-shipping');
  if (order.shippingCost > 0) {
    shippingEl.textContent = formatPrice(order.shippingCost);
    shippingEl.style.color = '';
  } else {
    shippingEl.textContent = 'Free';
  }

  document.getElementById('conf-subtotal').textContent = formatPrice(order.subtotal);
  document.getElementById('conf-total').textContent    = formatPrice(order.total);

  window.WaqtoroAnalytics?.track('purchase_confirmation_view', {
    transaction_id: order.id,
    value: order.total,
    currency: 'PKR'
  });

  const itemsEl = document.getElementById('conf-items');
  if (itemsEl) {
    itemsEl.innerHTML = order.items.map(item => {
      const p = PRODUCTS.find(pr => pr.id === item.id);
      if (!p) return '';
      return `
        <div class="conf-item">
          <div class="conf-item-img">
            <img src="${IMG_BASE}${Array.isArray(p.img) ? p.img[0] : p.img}" alt="${p.name}" />
          </div>
          <div class="conf-item-info">
            <p class="conf-item-name">${p.name} <span style="color:var(--clr-muted);font-weight:400;">× ${item.qty}</span></p>
            <p class="conf-item-brand">${p.brand} Inspired${item.color ? ` · <span style="color:var(--clr-gold)">${item.color}</span>` : ''}</p>
          </div>
          <span class="conf-item-price">${formatPrice(p.price * item.qty)}</span>
        </div>
      `;
    }).join('');
  }
}

function renderSuggested(orderedItems) {
  const grid = document.getElementById('conf-suggested-grid');
  if (!grid) return;
  if (typeof renderProductSkeletons === 'function') {
    renderProductSkeletons('conf-suggested-grid', 4);
  }
  const orderedIds  = orderedItems.map(i => i.id);
  const suggestions = PRODUCTS.filter(p => !orderedIds.includes(p.id)).slice(0, 4);
  grid.innerHTML = suggestions.map(p => buildProductCard(p)).join('');
  WaqtoroWishlist.updateButtons();
}

function copyOrderId() {
  const id = document.getElementById('conf-order-id')?.textContent;
  if (!id) return;
  navigator.clipboard?.writeText(id).then(() => {
    showToast('Order number copied!', 'check');
  });
}

/* ---- CONFETTI ---- */
function launchConfetti() {
  const canvas  = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#c9a84c', '#e8d48a', '#ffffff', '#f0c040', '#a07830', '#27ae60'];
  const pieces = [];

  for (let i = 0; i < 130; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -200,
      w: Math.random() * 10 + 4,
      h: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      opacity: 1
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      if (frame > 80) p.opacity = Math.max(0, p.opacity - 0.012);

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (pieces.some(p => p.opacity > 0)) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}
