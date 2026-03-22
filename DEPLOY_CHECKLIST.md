# WAQTORO Firebase Deploy Checklist

## 1) Pre-deploy sanity checks
- Confirm key UX flows locally:
  - Home -> Shop -> Product -> Add to Cart
  - Cart -> Checkout -> Order Confirmation
  - Contact form submit
  - Account sign-in / registration / forgot password
- Verify mobile behavior:
  - Hamburger menu open/close + link click close
  - Shop mobile filter open/close + overlay + ESC
  - Product sticky mobile add-to-cart
- Confirm there are no dead links in nav/footer paths.

## 2) Version and cache checks
- If you changed JS/CSS heavily, ensure version query params are current where used (for example `?v=1.0.x`).
- Keep `firebase.json` cache headers as configured:
  - HTML: no-cache
  - Images: long immutable cache
  - JS/CSS: short public cache with revalidation

## 3) Firebase login and project
- Ensure you are logged in:
  - `firebase login`
- Confirm active project:
  - `firebase use`

## 4) Deploy hosting
- Run from repository root:
  - `firebase deploy --only hosting`

## 5) Post-deploy smoke test (production)
- Open `https://waqtoro.live`
- Test these pages quickly:
  - `/`
  - `/pages/shop`
  - `/pages/product?id=1`
  - `/pages/cart`
  - `/pages/checkout`
  - `/pages/contact`
  - `/pages/account`
- Validate:
  - Search redirects to Shop and filters by query
  - Checkout shows inline validation and trust copy
  - 404 page is branded

## 6) Rollback plan (if needed)
- Revert to last known good state in git.
- Re-run:
  - `firebase deploy --only hosting`

## 7) Optional monitoring after release
- Watch browser console and client errors captured in local storage key:
  - `waqtoro_client_errors`
- Track conversion checkpoints:
  - Product add-to-cart
  - Cart -> Checkout click
  - Checkout completion
