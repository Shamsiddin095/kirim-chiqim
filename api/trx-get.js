import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ msg: "Method not allowed" });

  try {
    await client.connect();
    const db = client.db("app");
    const { userId, period } = req.query;
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
}
