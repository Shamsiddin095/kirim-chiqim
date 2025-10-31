import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ msg: "Method not allowed" });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ msg: "userId kerak" });

  try {
    await client.connect();
    const db = client.db("app");
    const transactions = await db
      .collection("transactions")
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1 })
      .toArray();

    // umumiy summa
    const totals = {
      income: transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      expense: transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
    };

    res.status(200).json({ transactions, totals });
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ msg: err.message });
  } finally {
    await client.close();
  }
}
