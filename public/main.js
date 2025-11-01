import { saveTransactionOffline } from "./db.js";
import { syncWithServer } from "./sync.js";

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
if (!userId) window.location.href = "login.html";

const usernameEl = document.getElementById("username");
const trxList = document.getElementById("trxList");
const formContainer = document.getElementById("trxFormContainer");
const formTitle = document.getElementById("formTitle");
const trxForm = document.getElementById("trxForm");
const filterPeriod = document.getElementById("filterPeriod");
const incomeBar = document.querySelector(".incomeBar");
const expenseBar = document.querySelector(".expenseBar");

let trxType = "";

let editingTrxId = null;

async function checkUser() {
  try {
    const res = await fetch(`/api/check-user?userId=${userId}`);
    if (!res.ok) throw new Error("Foydalanuvchi topilmadi");
    const result = await res.json();
    usernameEl.innerText = result.username || "Foydalanuvchi";
  } catch (err) {
    console.error("checkUser xatosi:", err);
    window.location.href = "login.html";
  }
}
checkUser();

document.getElementById("btnLogout").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "login.html";
});

document.getElementById("btnAddIncome").addEventListener("click", () => {
  trxType = "income";
  editingTrxId = null;
  formTitle.innerText = "Kirim qo‘shish";
  trxForm.reset();
  formContainer.style.display = "block";
});

document.getElementById("btnAddExpense").addEventListener("click", () => {
  trxType = "expense";
  editingTrxId = null;
  formTitle.innerText = "Chi­qim qo‘shish";
  trxForm.reset();
  formContainer.style.display = "block";
});

trxForm.addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(trxForm));
  data.type = trxType;
  data.userId = userId;

  try {
    if (navigator.onLine) {
      if (editingTrxId) {
        await fetch(`/api/trx-update?userId=${userId}&trxId=${editingTrxId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        editingTrxId = null;
      } else {
        await fetch("/api/trx-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }
    } else {
      await saveTransactionOffline({
        ...data,
        trxId: crypto.randomUUID(),
        date: new Date().toISOString(),
        synced: false
      });
      alert("Internet yo‘q, tranzaksiya vaqtincha saqlandi 💾");
    }

    trxForm.reset();
    formContainer.style.display = "none";
    await loadTransactions();
  } catch (err) {
    console.error("Yuborish xatosi:", err);
  }
});

async function loadTransactions() {
  try {
    if (!navigator.onLine) {
      console.warn("Offline holatda, faqat saqlanganlar ko‘rsatiladi.");
      return;
    }

    const period = filterPeriod.value;
    const res = await fetch(`/api/trx-get?userId=${userId}${period ? `&period=${period}` : ""}`);
    if (!res.ok) throw new Error("Tranzaksiya topilmadi");

    const data = await res.json();
    const trxs = data.transactions || [];
    const totals = data.totals || { income: 0, expense: 0 };

    trxList.innerHTML = "";

    trxs.forEach(trx => {
      const date = new Date(trx.date);
      const formattedDate = date.toLocaleString("uz-UZ", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });

      const li = document.createElement("li");
      li.classList.add(trx.type);
      li.innerHTML = `
        <div class="trx-info">
          <span class="trx-date">${formattedDate}</span>
          <span class="trx-amount">${trx.type === "income" ? "Kirim" : "Chi­qim"}: ${trx.amount} so‘m</span>
          <span class="trx-category">${trx.category} – ${trx.description || ""}</span>
        </div>
        <div class="trx-actions">
         <button class="editBtn" data-id="${trx.trxId}">✏️</button>
          <button class="delBtn" data-id="${trx.trxId}">🗑️</button>
        </div>
      `;
      trxList.appendChild(li);

      li.querySelector(".editBtn").addEventListener("click", () => {
        trxType = trx.type;
        editingTrxId = trx.trxId;
        formTitle.innerText = "Tranzaksiyani tahrirlash";
        formContainer.style.display = "block";
        trxForm.amount.value = trx.amount;
        trxForm.category.value = trx.category;
        trxForm.description.value = trx.description;
      });

      li.querySelector(".delBtn").addEventListener("click", async (e) => {
        const trxId = e.target.getAttribute("data-id");
        if (!trxId) return alert("Tranzaksiya ID topilmadi!");

        if (confirm("Haqiqatan ham o‘chirmoqchimisiz?")) {
          await fetch(`/api/trx-delete?userId=${userId}&trxId=${trxId}`, { method: "DELETE" });
          await loadTransactions();
        }
      });
    });

    const totalIncome = totals?.income || 0;
    const totalExpense = totals?.expense || 0;
    const totalAmount = totalIncome + totalExpense || 1;

    const incomePercent = Math.min(100, (totalIncome / totalAmount) * 100);
    const expensePercent = Math.min(100, (totalExpense / totalAmount) * 100);

    incomeBar.style.width = incomePercent + "%";
    incomeBar.style.backgroundColor = "#4caf50";
    incomeBar.querySelector(".progressLabel").innerText = `Kirim: ${totalIncome} so‘m`;

    expenseBar.style.width = expensePercent + "%";
    expenseBar.style.backgroundColor = "#f44336";
    expenseBar.querySelector(".progressLabel").innerText = `Chi­qim: ${totalExpense} so‘m`;

  } catch (err) {
    console.error("loadTransactions xatosi:", err);
  }
}

filterPeriod.addEventListener("change", loadTransactions);
loadTransactions();
syncWithServer(userId);
