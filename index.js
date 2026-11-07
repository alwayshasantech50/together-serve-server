import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("TogetherServe server is running");
});

const startServer = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    const db = client.db("togetherServeDB");

    console.log(`MongoDB connected: ${db.databaseName}`);

    
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();