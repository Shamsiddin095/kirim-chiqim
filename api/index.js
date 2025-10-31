import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));

let db;

// Mongo ulanish
const client = new MongoClient(process.env.MONGO_URI, { useUnifiedTopology: true });
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("app");
    console.log("✅ MongoDB connected");
  }
}
connectDB();

// === ROUTES ===

// Register
app.post("/register", async (req, res) => {
  try {
    const { username, tel, password } = req.body;
    if (!username || !tel || !password)
      return res.status(400).json({ msg: "All fields required" });

    const existingUser = await db.collection("users").findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "Username exists" });

    const result = await db.collection("users").insertOne({
      username,
      tel,
      password,
      createdAt: new Date()
    });

    res.json({ msg: "User registered", userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection("users").findOne({ username, password });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });
    res.json({ msg: "Login success", userId: user._id, username: user.username });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Check user
app.get("/check-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(400).json({ msg: "User not found" });
    res.json({ username: user.username });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Add transaction
app.post("/trx", async (req, res) => {
  try {
    const { userId, type, amount, category, description } = req.body;
    if (!userId || !type || !amount || !category)
      return res.status(400).json({ msg: "Missing fields" });

    const newTrx = {
      trxId: new ObjectId(),
      type,
      amount: Number(amount),
      category,
      description: description || "",
      date: new Date()
    };

    await db.collection("transactions").updateOne(
      { _id: new ObjectId(userId) },
      { $push: { transactions: newTrx } },
      { upsert: true }
    );

    res.json({ msg: "Transaction added" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update transaction
app.put("/trx/:userId/:trxId", async (req, res) => {
  try {
    const { userId, trxId } = req.params;
    const { type, amount, category, description } = req.body;

    await db.collection("transactions").updateOne(
      { _id: new ObjectId(userId), "transactions.trxId": new ObjectId(trxId) },
      {
        $set: {
          "transactions.$.type": type,
          "transactions.$.amount": Number(amount),
          "transactions.$.category": category,
          "transactions.$.description": description || ""
        }
      }
    );

    res.json({ msg: "Transaction updated" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Delete transaction
app.delete("/trx/:userId/:trxId", async (req, res) => {
  try {
    const { userId, trxId } = req.params;

    await db.collection("transactions").updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { transactions: { trxId: new ObjectId(trxId) } } }
    );

    res.json({ msg: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get transactions
app.get("/trx/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;
    const now = new Date();

    const userTrx = await db.collection("transactions").findOne({ _id: new ObjectId(userId) });
    if (!userTrx || !userTrx.transactions)
      return res.json({ transactions: [], totals: {} });

    let transactions = userTrx.transactions;

    if (period === "day") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      transactions = transactions.filter(t => new Date(t.date) >= start);
    } else if (period === "week") {
      const start = new Date();
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      transactions = transactions.filter(t => new Date(t.date) >= start);
    } else if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      transactions = transactions.filter(t => new Date(t.date) >= start);
    }

    const totals = { income: 0, expense: 0, categories: {} };
    transactions.forEach(t => {
      if (t.type === "income") totals.income += t.amount;
      else totals.expense += t.amount;
      totals.categories[t.category] = (totals.categories[t.category] || 0) + t.amount;
    });

    res.json({ transactions, totals });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// === MUHIM QISM (Vercel uchun eksport) ===
export default app;
