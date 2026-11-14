import { ObjectId } from "mongodb";
import { verifyJWT } from "./verifyJWT.js";
import { validateEvent } from "./validateEvent.js";

export const addManageEventRoutes = (app, db) => {
    const eventsCollection = db.collection("events");

    
    
    app.get("/api/manage-events", verifyJWT, async (req, res) => {
        try {
            const events = await eventsCollection
                .find({ creatorId: req.user.sub })
                .sort({ eventDate: 1 })
                .toArray();

            res.set("Cache-Control", "no-store");
            res.send(events);
        } catch (error) {
            console.error("Load managed events failed:", error.message);

            res.status(500).send({
                message: "Unable to load your events.",
            });
        }
    });

    
    
    app.get("/api/manage-events/:id", verifyJWT, async (req, res) => {
        try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid event ID.",
                });
            }

            const event = await eventsCollection.findOne({
                _id: new ObjectId(id),
                creatorId: req.user.sub,
            });

            if (!event) {
                return res.status(404).send({
                    message: "Event not found or you do not own it.",
                });
            }

            res.set("Cache-Control", "no-store");
            res.send(event);
        } catch (error) {
            console.error("Load event for editing failed:", error.message);

            res.status(500).send({
                message: "Unable to load this event.",
            });
        }
    });

    
    
    app.put("/api/events/:id", verifyJWT, async (req, res) => {
        try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid event ID.",
                });
            }

            const event = req.body || {};
            const errorMessage = validateEvent(event);

            if (errorMessage) {
                return res.status(400).send({
                    message: errorMessage,
                });
            }

            const result = await eventsCollection.updateOne(
                {
                    _id: new ObjectId(id),
                    creatorId: req.user.sub,
                },
                {
                    $set: {
                        title: event.title.trim(),
                        description: event.description.trim(),
                        eventType: event.eventType,
                        thumbnail: event.thumbnail.trim(),
                        location: event.location.trim(),
                        eventDate: new Date(event.eventDate),
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).send({
                    message: "Event not found or you do not own it.",
                });
            }

            res.send({
                message: "Event updated successfully!",
            });
        } catch (error) {
            console.error("Update event failed:", error.message);

            res.status(500).send({
                message: "Unable to update the event.",
            });
        }
    });

    
    
    app.delete("/api/events/:id", verifyJWT, async (req, res) => {
        try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
                return res.status(400).send({
                    message: "Invalid event ID.",
                });
            }

            const eventId = new ObjectId(id);

            const result = await eventsCollection.deleteOne({
                _id: eventId,
                creatorId: req.user.sub,
            });

            if (result.deletedCount === 0) {
                return res.status(404).send({
                    message: "Event not found or you do not own it.",
                });
            }

            
            
            await db.collection("joinedEvents").deleteMany({ eventId });

            res.send({
                message: "Event deleted successfully!",
            });
        } catch (error) {
            console.error("Delete event failed:", error.message);

            res.status(500).send({
                message: "Unable to delete the event.",
            });
        }
    });
};