// sync.js
import { getOfflineTransactions, clearOfflineTransactions } from "./db.js";

export async function syncWithServer(userId) {
  if (!navigator.onLine) return;
  const offlineTrxs = await getOfflineTransactions();
  if (offlineTrxs.length === 0) return;

  console.log("Sinxronlash boshlandi:", offlineTrxs);

  for (const trx of offlineTrxs) {
    try {
      await fetch("/api/trx-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trx)
      });
    } catch (err) {
      console.error("Sinxronlashda xato:", err);
    }
  }

  await clearOfflineTransactions();
  console.log("Sinxronlash tugadi ✅");
}

window.addEventListener("online", () => {
  const userId = new URLSearchParams(window.location.search).get("userId");
  if (userId) syncWithServer(userId);
});
