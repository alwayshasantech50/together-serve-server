import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";


export const createAuth = (db, client) => {
  return betterAuth({
    appName: "TogetherServe",

    baseURL: process.env.BETTER_AUTH_URL,

    secret: process.env.BETTER_AUTH_SECRET,

    database: mongodbAdapter(db, { client }),

    trustedOrigins: [process.env.CLIENT_URL],

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      requireEmailVerification: false,
    },
  });
};