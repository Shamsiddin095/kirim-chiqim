import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "DELETE")
    return res.status(405).json({ msg: "Method not allowed" });

  const { userId, trxId } = req.query;
  if (!userId || !trxId)
    return res.status(400).json({ msg: "userId yoki trxId kerak" });

  try {
    await client.connect();
    const db = client.db("app");

    const result = await db
      .collection("transactions")
      .deleteOne({ userId: new ObjectId(userId), trxId: new ObjectId(trxId) });

    if (result.deletedCount === 0)
      return res.status(404).json({ msg: "Transaction not found" });

    res.status(200).json({ msg: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Delete transaction error:", err);
    res.status(500).json({ msg: err.message });
  } finally {
    await client.close();
  }
}
