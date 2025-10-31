// === /api/trx-update ===
import { MongoClient, ObjectId } from "mongodb";
const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).send("Method Not Allowed");

  const { userId, trxId } = req.query;
  const updateData = req.body;

  try {
    await client.connect();
    const db = client.db("finance");
    const users = db.collection("users");

    // foydalanuvchini topamiz
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    // massiv ichidagi bitta tranzaksiyani yangilaymiz
    await users.updateOne(
      { _id: new ObjectId(userId), "transactions._id": new ObjectId(trxId) },
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

    res.status(200).json({ message: "Transaction updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    await client.close();
  }
}
