/**
 * WAQTORO — Brands Page JavaScript
 */

const ALL_BRANDS = [
  { name: 'Rolex',          origin: 'Switzerland', founded: 1905, note: 'The pinnacle of prestige watchmaking.' },
  { name: 'Omega',          origin: 'Switzerland', founded: 1848, note: 'Legendary precision and exploration.' },
  { name: 'TAG Heuer',      origin: 'Switzerland', founded: 1860, note: 'Racing spirit meets Swiss excellence.' },
  { name: 'Tissot',         origin: 'Switzerland', founded: 1853, note: 'Innovators by tradition since 1853.' },
  { name: 'Seiko',          origin: 'Japan',       founded: 1881, note: 'Japanese master craftsmanship.' },
  { name: 'Casio',          origin: 'Japan',       founded: 1946, note: 'Bold, durable, iconic G-Shock culture.' },
  { name: 'Longines',       origin: 'Switzerland', founded: 1832, note: 'Elegance is an attitude.' },
  { name: 'Rado',           origin: 'Switzerland', founded: 1917, note: 'Pioneers of high-tech ceramic watches.' },
  { name: 'IWC',            origin: 'Switzerland', founded: 1868, note: 'Engineering meets timeless design.' },
  { name: 'Breitling',      origin: 'Switzerland', founded: 1884, note: 'Professional instruments for professionals.' },
  { name: 'Hublot',         origin: 'Switzerland', founded: 1980, note: 'The art of fusion.' },
  { name: 'Michael Kors',    origin: 'USA',         founded: 1981, note: 'Jet-set luxury for the modern lifestyle.' },
  { name: 'Calvin Klein',    origin: 'USA',         founded: 1968, note: 'Minimalist, trendy, and sophisticated.' },
];

document.addEventListener('DOMContentLoaded', () => {
  renderBrands();

  document.getElementById('back-to-brands-btn')?.addEventListener('click', () => {
    document.getElementById('brands-grid').closest('.section-pad').style.display = '';
    document.getElementById('brand-products-section').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

function renderBrands() {
  const grid = document.getElementById('brands-grid');
  if (!grid) return;

  grid.innerHTML = ALL_BRANDS.map(brand => {
    const count = PRODUCTS.filter(p => p.brand === brand.name).length;
    const letter = brand.name.charAt(0);
    return `
      <div class="brand-card" onclick="showBrandProducts('${brand.name}')" data-animate>
        <div class="brand-card-letter">${letter}</div>
        <h3 class="brand-card-name">${brand.name}</h3>
        <p class="brand-card-count">${count > 0 ? `${count} Replica${count > 1 ? 's' : ''}` : 'Coming Soon'} &bull; ${brand.origin}</p>
        <p style="font-size:0.78rem;color:var(--clr-muted);margin-bottom:1rem;font-style:italic;">"${brand.note}"</p>
        <span class="brand-card-btn">View Collection →</span>
      </div>
    `;
  }).join('');

  // Trigger animations
  setTimeout(() => {
    document.querySelectorAll('.brand-card[data-animate]').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 60);
    });
  }, 100);
}

function showBrandProducts(brandName) {
  const section = document.getElementById('brand-products-section');
  const title = document.getElementById('brand-products-title');
  const grid = document.getElementById('brand-products-grid');
  const brandsSection = document.getElementById('brands-grid').closest('.section-pad');

  if (!section || !grid) return;

  const products = PRODUCTS.filter(p => p.brand === brandName);
  title.textContent = `${brandName} Inspired`;

  if (!products.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-muted);">
      <p>No replicas available for this brand yet — check back soon!</p>
    </div>`;
  } else {
    grid.innerHTML = products.map(p => buildProductCard(p)).join('');
    WaqtoroWishlist.updateButtons();
  }

  brandsSection.style.display = 'none';
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
