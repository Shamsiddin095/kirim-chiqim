import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "PUT")
    return res.status(405).json({ msg: "Method not allowed" });

  try {
    await client.connect();
    const db = client.db("app");
    const { userId, trxId } = req.query;
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
}
