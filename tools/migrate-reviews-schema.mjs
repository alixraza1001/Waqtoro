import admin from 'firebase-admin';

const args = new Set(process.argv.slice(2));
const dryRun = !args.has('--apply');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Missing GOOGLE_APPLICATION_CREDENTIALS environment variable.');
  console.error('Run with a Firebase service account JSON path.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

function normalizeProductId(data) {
  const raw = data.productId ?? data.productID ?? data.product_id;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function migrate() {
  const snapshot = await db.collection('reviews').get();
  let scanned = 0;
  let toUpdate = 0;

  for (const docSnap of snapshot.docs) {
    scanned += 1;
    const data = docSnap.data() || {};
    const next = {};
    let changed = false;

    const productId = normalizeProductId(data);
    if (productId !== null && data.productId !== productId) {
      next.productId = productId;
      changed = true;
    }

    if (typeof data.status !== 'string') {
      next.status = 'approved';
      changed = true;
    }

    if (data.productID !== undefined) {
      next.productID = admin.firestore.FieldValue.delete();
      changed = true;
    }

    if (data.product_id !== undefined) {
      next.product_id = admin.firestore.FieldValue.delete();
      changed = true;
    }

    if (!data.createdAt && data.date) {
      next.createdAt = data.date;
      changed = true;
    }

    if (changed) {
      toUpdate += 1;
      console.log(`[${dryRun ? 'DRY' : 'APPLY'}] ${docSnap.id}`, Object.keys(next));
      if (!dryRun) {
        await docSnap.ref.update(next);
      }
    }
  }

  console.log(`Scanned: ${scanned}`);
  console.log(`Needs update: ${toUpdate}`);
  if (dryRun) {
    console.log('Dry run only. Re-run with --apply to write changes.');
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
