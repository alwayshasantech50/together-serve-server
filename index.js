import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { toNodeHandler } from "better-auth/node";
import { createAuth } from "./auth.js";
import { verifyJWT } from "./verifyJWT.js";
import { validateEvent } from "./validateEvent.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.get("/", (_req, res) => {
    res.send("TogetherServe server is running");
});

const startServer = async () => {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);

        await client.connect();

        const db = client.db("togetherServeDB");
        const eventsCollection = db.collection("events");

        console.log(`MongoDB connected: ${db.databaseName}`);

        const auth = createAuth(db, client);

        app.all("/api/auth/*splat", toNodeHandler(auth));

        // Keep the JSON middleware after the BetterAuth route.
        app.use(express.json());

        app.get("/api/private-test", verifyJWT, (req, res) => {
            res.send({
                message: "JWT verified successfully!",
                email: req.user.email,
            });
        });

        app.post("/api/events", verifyJWT, async (req, res) => {
            try {
                const event = req.body || {};

                const errorMessage = validateEvent(event);

                if (errorMessage) {
                    return res.status(400).send({
                        message: errorMessage,
                    });
                }

                const creatorId = req.user.sub;
                const creatorEmail = req.user.email;

                if (
                    typeof creatorId !== "string" ||
                    typeof creatorEmail !== "string"
                ) {
                    return res.status(401).send({
                        message: "Unable to identify the event creator.",
                    });
                }

                const newEvent = {
                    title: event.title.trim(),
                    description: event.description.trim(),
                    eventType: event.eventType,
                    thumbnail: event.thumbnail.trim(),
                    location: event.location.trim(),
                    eventDate: new Date(event.eventDate),
                    creatorId,
                    creatorEmail,
                    createdAt: new Date(),
                };

                const result = await eventsCollection.insertOne(newEvent);

                res.status(201).send({
                    message: "Event created successfully!",
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error("Create event failed:", error.message);

                res.status(500).send({
                    message: "Unable to create the event. Please try again.",
                });
            }
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