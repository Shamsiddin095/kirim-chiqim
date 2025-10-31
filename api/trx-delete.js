import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "DELETE")
    return res.status(405).json({ msg: "Method not allowed" });

  try {
    await client.connect();
    const db = client.db("finance");
    const users = db.collection("users");
    const { userId, trxId } = req.query;

    if (!userId || !trxId) {
      return res.status(400).json({ msg: "userId yoki trxId yo‘q" });
    }

    // trxId bilan o‘chirish
    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { transactions: { trxId: trxId } } } // ObjectId emas, string shaklida
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ msg: "Tranzaksiya topilmadi" });
    }

    res.json({ msg: "Transaction deleted" });
  } catch (err) {
    console.error("Delete xato:", err);
    res.status(500).json({ msg: err.message });
  } finally {
    await client.close();
  }
}
