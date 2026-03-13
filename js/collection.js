/**
 * WAQTORO — Collection Page JavaScript (Men's & Women's)
 */

let collectionGender = 'men';
let collectionSort = 'default';
let collectionCategory = 'all';

function initCollection(gender) {
  collectionGender = gender;
  setupCategoryPills();
  setupSort();
  renderCollection();
}

function setupCategoryPills() {
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      collectionCategory = pill.dataset.filter;
      renderCollection();
    });
  });
}

function setupSort() {
  const select = document.getElementById('mens-sort');
  if (!select) return;
  select.addEventListener('change', () => {
    collectionSort = select.value;
    renderCollection();
  });
}

function filterByStyle(category) {
  collectionCategory = category;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === category);
  });
  renderCollection();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCollection() {
  const grid = document.getElementById('mens-grid');
  const countEl = document.getElementById('mens-count');
  if (!grid) return;

  let filtered = PRODUCTS.filter(p =>
    p.gender === collectionGender || p.gender === 'unisex'
  );

  if (collectionCategory !== 'all') {
    filtered = filtered.filter(p => p.category === collectionCategory);
  }

  if (collectionSort === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
  if (collectionSort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
  if (collectionSort === 'rating')     filtered.sort((a,b) => b.rating - a.rating);

  if (countEl) countEl.textContent = `${filtered.length} watches`;

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--clr-muted);">
      <p style="font-size:1.1rem;">No watches in this category yet.</p>
      <button class="btn btn-ghost" style="margin-top:1rem;" onclick="filterByStyle('all')">View All</button>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => buildProductCard(p)).join('');
  WaqtoroWishlist.updateButtons();

  grid.querySelectorAll('.product-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, i * 70);
  });
}
