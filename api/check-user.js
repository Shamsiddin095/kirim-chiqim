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
    const { userId } = req.query;

    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(400).json({ msg: "User not found" });

    res.json({ username: user.username });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}
