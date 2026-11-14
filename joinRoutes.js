import { ObjectId } from "mongodb";
import { verifyJWT } from "./verifyJWT.js";

export const addJoinRoutes = async (app, db) => {
    const eventsCollection = db.collection("events");
    const joinedCollection = db.collection("joinedEvents");



    await joinedCollection.createIndex(
        { eventId: 1, userId: 1 },
        { unique: true }
    );



    app.post("/api/events/:id/join", verifyJWT, async (req, res) => {
        try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid event ID.",
                });
            }

            const eventId = new ObjectId(id);

            const event = await eventsCollection.findOne({
                _id: eventId,
            });

            if (!event) {
                return res.status(404).send({
                    message: "Event not found.",
                });
            }

            if (event.eventDate <= new Date()) {
                return res.status(400).send({
                    message: "This event has already started.",
                });
            }

            const registration = {
                eventId,
                userId: req.user.sub,
                userEmail: req.user.email,
                joinedAt: new Date(),
            };

            await joinedCollection.insertOne(registration);

            res.status(201).send({
                message: "You joined the event successfully!",
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).send({
                    message: "You have already joined this event.",
                });
            }

            console.error("Join event failed:", error.message);

            res.status(500).send({
                message: "Unable to join the event.",
            });
        }
    });



    app.get(
        "/api/events/:id/join-status",
        verifyJWT,
        async (req, res) => {
            try {
                const id = req.params.id;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        message: "Invalid event ID.",
                    });
                }

                const registration = await joinedCollection.findOne({
                    eventId: new ObjectId(id),
                    userId: req.user.sub,
                });

                res.set("Cache-Control", "no-store");

                res.send({
                    joined: registration !== null,
                });
            } catch (error) {
                console.error("Check join status failed:", error.message);

                res.status(500).send({
                    message: "Unable to check your participation.",
                });
            }
        }
    );



    app.get("/api/joined-events", verifyJWT, async (req, res) => {
        try {
            const registrations = await joinedCollection
                .find({ userId: req.user.sub })
                .toArray();

            const eventIds = registrations.map(
                (registration) => registration.eventId
            );

            const events = await eventsCollection
                .find({
                    _id: { $in: eventIds },
                })
                .project({
                    creatorId: 0,
                    creatorEmail: 0,
                })
                .sort({ eventDate: 1 })
                .toArray();

            res.set("Cache-Control", "no-store");
            res.send(events);
        } catch (error) {
            console.error("Fetch joined events failed:", error.message);

            res.status(500).send({
                message: "Unable to load your joined events.",
            });
        }
    });
};