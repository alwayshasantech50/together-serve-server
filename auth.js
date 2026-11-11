import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";


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

        socialProviders: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
        },

        plugins: [jwt()],

        hooks: {
            before: createAuthMiddleware(async (context) => {

                if (context.path !== "/sign-up/email") {
                    return;
                }

                const password = context.body?.password;

                if (typeof password !== "string") {
                    throw new APIError("BAD_REQUEST", {
                        message: "Please enter a password.",
                    });
                }

                if (password.length < 6) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Password must have at least 6 characters.",
                    });
                }

                if (!/[A-Z]/.test(password)) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Password must contain an uppercase letter.",
                    });
                }

                if (!/[a-z]/.test(password)) {
                    throw new APIError("BAD_REQUEST", {
                        message: "Password must contain a lowercase letter.",
                    });
                }
            }),
        },
    });
};