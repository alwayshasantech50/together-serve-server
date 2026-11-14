export const validateEvent = (event) => {
  const requiredFields = [
    "title",
    "description",
    "eventType",
    "thumbnail",
    "location",
    "eventDate",
  ];


  for (const field of requiredFields) {
    if (
      typeof event[field] !== "string" ||
      !event[field].trim()
    ) {
      return "Please complete all event fields.";
    }
  }


  const eventTypes = [
    "Cleanup",
    "Plantation",
    "Donation",
    "Education",
    "Health",
    "Other",
  ];

  
  if (!eventTypes.includes(event.eventType)) {
    return "Please select a valid event type.";
  }

  try {
    const imageURL = new URL(event.thumbnail);

    if (
      imageURL.protocol !== "http:" &&
      imageURL.protocol !== "https:"
    ) {
      return "Please enter an HTTP or HTTPS image URL.";
    }
  } catch {
    return "Please enter a valid image URL.";
  }

  const eventDate = new Date(event.eventDate);

  if (
    Number.isNaN(eventDate.getTime()) ||
    eventDate <= new Date()
  ) {
    return "Event date must be in the future.";
  }

  return "";
};