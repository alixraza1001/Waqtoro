# Waqtoro

Waqtoro is a responsive ecommerce storefront project built around a premium watch retail concept. The project focuses on the full customer journey — browsing products, managing a cart and wishlist, signing in, checking out, reviewing products, and tracking orders — with Firebase-backed account and cloud-sync features.

## Project overview

The goal of Waqtoro is to explore a polished direct-to-consumer ecommerce experience without hiding the implementation behind a large commerce framework. Much of the storefront is built with structured HTML, CSS and JavaScript modules, while Firebase provides cloud-backed user and data features.

## Implemented experience

Repository code includes customer-facing flows for:

- responsive home and collection pages
- men's and women's catalog browsing
- brand and shop views
- product search
- cart management
- wishlist management
- customer account flows
- Google / email authentication integration
- checkout and order confirmation
- order history / order tracking
- product reviews
- contact and supporting storefront pages
- mobile navigation and responsive UI behavior

## Frontend architecture

The storefront uses dedicated JavaScript modules for different customer journeys rather than placing all logic into one global script.

Examples include:

```text
js/
├── main.js
├── home.js
├── cart.js
├── checkout.js
├── account.js
├── sync.js
├── wishlist-page.js
├── reviews-live.js
├── track-order.js
├── collection.js
└── brands.js
```

This keeps cart, account, review, collection and synchronization responsibilities separated while allowing the site to remain lightweight.

## Firebase-backed features

Firebase is used for cloud-connected product behavior. Repository modules include account/authentication and synchronization logic that can move selected local customer state into Firestore when a user is signed in.

The project also includes Firebase deployment configuration and supporting maintenance tools.

## Tech stack

- HTML5
- CSS3
- JavaScript
- Firebase / Firestore
- Firebase Admin for maintenance tooling
- Google / email authentication flows
- LocalStorage for local-first cart/order state where appropriate
- Sharp-based image optimization tooling

## Ecommerce flows

A typical customer journey looks like:

```text
Browse collection
      ↓
View / search products
      ↓
Add to cart or wishlist
      ↓
Sign in / continue shopping
      ↓
Checkout
      ↓
Order confirmation
      ↓
Track order / view account history
```

## Run locally

Waqtoro is primarily a static frontend project. Serve the repository through a local HTTP server rather than opening files directly so browser modules and Firebase-connected flows behave consistently.

For the small Node-based project tools:

```bash
npm install
```

Useful repository tooling includes image optimization and review-schema migration scripts defined in `package.json`.

Firebase-dependent flows require your own development Firebase configuration.

## Project status

Waqtoro is a working ecommerce implementation/case-study project with a broad storefront feature set. The README focuses on the software architecture and customer experience rather than the commercial positioning of the sample catalogue.

---

Built by [Ali Raza Memon](https://github.com/alixraza1001).
