const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
if(!userId) window.location.href = "login.html";

const usernameEl = document.getElementById("username");
const trxList = document.getElementById("trxList");
const formContainer = document.getElementById("trxFormContainer");
const formTitle = document.getElementById("formTitle");
const trxForm = document.getElementById("trxForm");
const filterPeriod = document.getElementById("filterPeriod");
const incomeBar = document.querySelector(".incomeBar");
const expenseBar = document.querySelector(".expenseBar");

let trxType = "";
let trxChartIncome, trxChartExpense;
let editingTrxId = null; // tahrirlash uchun global o‘zgaruvchi

// === Foydalanuvchini tekshirish ===
async function checkUser() {
const res = await fetch(`/api/check-user?userId=${userId}`);

  const result = await res.json();
  if (!res.ok) window.location.href = "login.html";
  else usernameEl.innerText = result.username;
}
checkUser();

// === Logout ===
document.getElementById("btnLogout").addEventListener("click", () => window.location.href = "login.html");

// === Formni ochish ===
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

// === Tranzaksiya yuborish (yangi yoki tahrirlash) ===
trxForm.addEventListener("submit", async e => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(trxForm));
  data.type = trxType;
  data.userId = userId;

  if (editingTrxId) {
    // Tahrirlash rejimi
    await fetch(`/api/trx-update?userId=${userId}&trxId=${editingTrxId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

    editingTrxId = null; // reset
  } else {
    // Yangi qo‘shish rejimi
   await fetch("/api/trx-add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});

  }

  trxForm.reset();
  formContainer.style.display = "none";
  loadTransactions();
});

// === Tranzaksiyalarni yuklash ===
async function loadTransactions() {
  const period = filterPeriod.value;
  const res = await fetch(`/api/trx-get?userId=${userId}${period ? `&period=${period}` : ""}`);

  const data = await res.json();

  const trxs = data.transactions;
  const totals = data.totals;

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
       
        <button class="editBtn" data-id="${trx._id}">✏️</button>
        <button class="delBtn" data-id="${trx._id}">🗑️</button>
      </div>
    `;
    trxList.appendChild(li);

    // === Edit ===
    li.querySelector(".editBtn").addEventListener("click", () => {
      trxType = trx.type;
      editingTrxId = trx._id;
      formTitle.innerText = "Tranzaksiyani tahrirlash";
      formContainer.style.display = "block";
      trxForm.amount.value = trx.amount;
      trxForm.category.value = trx.category;
      trxForm.description.value = trx.description;
    });

    // === Delete ===
    li.querySelector(".delBtn").addEventListener("click", async () => {
      if (confirm("Haqiqatan ham o‘chirmoqchimisiz?")) {
     await fetch(`/api/trx-delete?userId=${userId}&trxId=${trx._id}`, { method: "DELETE" });

        loadTransactions();
      }
    });
  });

  // === Progress barlar ===
  const totalAmount = totals.income + totals.expense || 1;
  const incomePercent = Math.min(100, (totals.income / totalAmount) * 100);
  const expensePercent = Math.min(100, (totals.expense / totalAmount) * 100);

  // Income bar
  incomeBar.style.width = incomePercent + "%";
  incomeBar.style.backgroundColor = "#4caf50";
  incomeBar.querySelector(".progressLabel").innerText = `Kirim: ${totals.income} so‘m`;

  // Expense bar
  expenseBar.style.width = expensePercent + "%";
  expenseBar.style.backgroundColor = "#f44336";
  expenseBar.querySelector(".progressLabel").innerText = `Chi­qim: ${totals.expense} so‘m`;

  // === Diagrammalar ===
  const incomeData = trxs.filter(t => t.type === "income");
  const expenseData = trxs.filter(t => t.type === "expense");

  const incomeCategories = {};
  const expenseCategories = {};

  incomeData.forEach(t => {
    incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
  });
  expenseData.forEach(t => {
    expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
  });

  const colors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#8BC34A','#FF5722'];

  // Income chart
  const ctxIncome = document.getElementById('trxChartIncome').getContext('2d');
  if (trxChartIncome) trxChartIncome.destroy();
  trxChartIncome = new Chart(ctxIncome, {
    type: 'pie',
    data: {
      labels: Object.keys(incomeCategories).map(k => `${k} ${incomeCategories[k]} so‘m`),
      datasets: [{
        data: Object.values(incomeCategories),
        backgroundColor: colors.slice(0, Object.keys(incomeCategories).length)
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ctx.label } }
      }
    }
  });

  // Expense chart
  const ctxExpense = document.getElementById('trxChartExpense').getContext('2d');
  if (trxChartExpense) trxChartExpense.destroy();
  trxChartExpense = new Chart(ctxExpense, {
    type: 'pie',
    data: {
      labels: Object.keys(expenseCategories).map(k => `${k} ${expenseCategories[k]} so‘m`),
      datasets: [{
        data: Object.values(expenseCategories),
        backgroundColor: colors.slice(0, Object.keys(expenseCategories).length)
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => ctx.label } }
      }
    }
  });
}

filterPeriod.addEventListener("change", loadTransactions);
loadTransactions();
