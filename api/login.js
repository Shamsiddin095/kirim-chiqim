import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ msg: "Method not allowed" });

  const { username, password } = req.body;

  try {
    await client.connect();
    const db = client.db("app");

    const user = await db.collection("users").findOne({ username, password });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    res.json({ msg: "Login success", userId: user._id, username: user.username });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}
