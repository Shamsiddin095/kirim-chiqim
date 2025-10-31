import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ msg: "Method Not Allowed" });
  }

  const { userId, trxId } = req.query;
  const updateData = req.body;

  if (!userId || !trxId) {
    return res.status(400).json({ error: "userId yoki trxId yo‘q" });
  }

  try {
    await client.connect();
    const db = client.db("app");
    const users = db.collection("transactions");

    const result = await users.updateOne(
      { _id: new ObjectId(userId), "transactions.trxId": trxId },
      {
        $set: {
          "transactions.$.amount": Number(updateData.amount),
          "transactions.$.category": updateData.category,
          "transactions.$.description": updateData.description,
          "transactions.$.type": updateData.type,
          "transactions.$.date": new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction updated" });
  } catch (err) {
    console.error("Update xato:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    await client.close();
  }
}
