import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { toNodeHandler } from "better-auth/node";
import { createAuth } from "./auth.js";
import { verifyJWT } from "./verifyJWT.js";


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.get("/", (req, res) => {
    res.send("TogetherServe server is running");
});

const startServer = async () => {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);

        await client.connect();

        const db = client.db("togetherServeDB");

        console.log(`MongoDB connected: ${db.databaseName}`);


        const auth = createAuth(db, client);


        app.all("/api/auth/*splat", toNodeHandler(auth));


        app.use(express.json());

        app.get("/api/private-test", verifyJWT, (request, response) => {
            response.send({
                message: "JWT verified successfully!",
                email: request.user.email,
            });
        });

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();