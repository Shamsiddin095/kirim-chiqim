import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "PUT")
    return res.status(405).json({ msg: "Method not allowed" });

  const { userId, trxId } = req.query;
  const updateData = req.body;

  if (!userId || !trxId)
    return res.status(400).json({ msg: "userId yoki trxId kerak" });

  try {
    await client.connect();
    const db = client.db("app");
    const result = await db.collection("transactions").updateOne(
      { userId: new ObjectId(userId), trxId: new ObjectId(trxId) },
      {
        $set: {
          type: updateData.type,
          amount: Number(updateData.amount),
          category: updateData.category,
          description: updateData.description || "",
          date: new Date()
        }
      }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ msg: "Transaction not found" });

    res.status(200).json({ msg: "Transaction updated" });
  } catch (err) {
    console.error("Update transaction error:", err);
    res.status(500).json({ msg: err.message });
  } finally {
    await client.close();
  }
}
