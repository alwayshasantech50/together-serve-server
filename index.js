import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { toNodeHandler } from "better-auth/node";
import { createAuth } from "./auth.js";
import { verifyJWT } from "./verifyJWT.js";
import { validateEvent } from "./validateEvent.js";
import { addJoinRoutes } from "./joinRoutes.js";
import { addManageEventRoutes } from "./manageEventRoutes.js";

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

        app.use(express.json());

        await addJoinRoutes(app, db);

        addManageEventRoutes(app, db);


        app.get("/api/private-test", verifyJWT, (req, res) => {
            res.send({
                message: "JWT verified successfully!",
                email: req.user.email,
            });
        });



        app.get("/api/events", async (req, res) => {
            try {
                let query = eventsCollection
                    .find({
                        eventDate: { $gt: new Date() },
                    })
                    .project({
                        creatorId: 0,
                        creatorEmail: 0,
                    })
                    .sort({ eventDate: 1 });


                if (req.query.limit === "6") {
                    query = query.limit(6);
                }

                const events = await query.toArray();

                res.set("Cache-Control", "no-store");
                res.send(events);
            } catch (error) {
                console.error("Fetch events failed:", error.message);

                res.status(500).send({
                    message: "Unable to load events. Please try again.",
                });
            }
        });


        app.get("/api/events/:id", async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid event ID.",
                    });
                }

                const event = await eventsCollection.findOne(
                    { _id: new ObjectId(id) },
                    {
                        projection: {
                            creatorId: 0,
                            creatorEmail: 0,
                        },
                    }
                );

                if (!event) {
                    return res.status(404).send({
                        message: "Event not found.",
                    });
                }

                res.set("Cache-Control", "no-store");
                res.send(event);
            } catch (error) {
                console.error("Fetch event failed:", error.message);

                res.status(500).send({
                    message: "Unable to load this event.",
                });
            }
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