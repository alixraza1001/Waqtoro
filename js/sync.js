/**
 * WAQTORO — Cloud Sync Module
 * Syncs LocalCart and LocalWishlist to Firestore when logged in.
 */
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let isSyncing = false;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            pullFromCloud(user);
        }
    });

    // Hook into main.js saving logic
    hookIntoLocalStorage();
});

async function pullFromCloud(user) {
    if (isSyncing) return;
    isSyncing = true;
    try {
        const docRef = doc(db, 'user_data', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            
            // Merge or Overwrite local with cloud
            // For simplicity, we'll merge items
            if (cloudData.cart) {
                const localCart = JSON.parse(localStorage.getItem('waqtoro_cart') || '[]');
                const mergedCart = mergeItems(localCart, cloudData.cart);
                localStorage.setItem('waqtoro_cart', JSON.stringify(mergedCart));
                if (window.WaqtoroCart) {
                    window.WaqtoroCart.items = mergedCart;
                    window.WaqtoroCart.updateCount();
                }
            }

            if (cloudData.wishlist) {
                const localWish = JSON.parse(localStorage.getItem('waqtoro_wishlist') || '[]');
                const mergedWish = [...new Set([...localWish, ...cloudData.wishlist])];
                localStorage.setItem('waqtoro_wishlist', JSON.stringify(mergedWish));
                if (window.WaqtoroWishlist) {
                    window.WaqtoroWishlist.items = mergedWish;
                    window.WaqtoroWishlist.updateButtons();
                }
            }
        } else {
            // First time login, push current local to cloud
            await pushToCloud(user);
        }
    } catch (e) {
        console.error("Cloud Pull Error:", e);
    } finally {
        isSyncing = false;
    }
}

async function pushToCloud(user) {
    if (isSyncing || !user) return;
    try {
        const cart = JSON.parse(localStorage.getItem('waqtoro_cart') || '[]');
        const wishlist = JSON.parse(localStorage.getItem('waqtoro_wishlist') || '[]');
        
        await setDoc(doc(db, 'user_data', user.uid), {
            cart,
            wishlist,
            lastSync: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Cloud Push Error:", e);
    }
}

function hookIntoLocalStorage() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        
        if (!isSyncing && (key === 'waqtoro_cart' || key === 'waqtoro_wishlist')) {
            const user = auth.currentUser;
            if (user) {
                // Debounce push
                clearTimeout(window.pushTimeout);
                window.pushTimeout = setTimeout(() => pushToCloud(user), 2000);
            }
        }
    };
}

function mergeItems(local, cloud) {
    const map = new Map();
    cloud.forEach(item => map.set(item.id, item.qty));
    local.forEach(item => {
        const existingQty = map.get(item.id) || 0;
        map.set(item.id, Math.max(existingQty, item.qty));
    });
    return Array.from(map, ([id, qty]) => ({ id, qty }));
}
