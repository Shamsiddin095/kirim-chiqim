import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "DELETE")
    return res.status(405).json({ msg: "Method not allowed" });

  try {
    await client.connect();
    const db = client.db("app");
    const { userId, trxId } = req.query;

    await db.collection("transactions").updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { transactions: { trxId: new ObjectId(trxId) } } }
    );

    res.json({ msg: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}
