import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ msg: "Method not allowed" });

  const { username, tel, password } = req.body;
  if (!username || !tel || !password)
    return res.status(400).json({ msg: "All fields required" });

  try {
    await client.connect();
    const db = client.db("app");

    const existing = await db.collection("users").findOne({ username });
    if (existing) return res.status(400).json({ msg: "Username exists" });

    const result = await db.collection("users").insertOne({
      username,
      tel,
      password,
      createdAt: new Date()
    });

    res.json({ msg: "User registered", userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}
