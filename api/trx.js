import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  await client.connect();
  const db = client.db("app");

  if (req.method === "POST") {
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
  } else if (req.method === "GET") {
    const { userId } = req.query;
    const data = await db.collection("transactions").findOne({ _id: new ObjectId(userId) });
    res.json({ transactions: data?.transactions || [] });
  } else {
    res.status(405).json({ msg: "Method not allowed" });
  }
}
