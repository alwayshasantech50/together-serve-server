import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";



const publicKeys = createRemoteJWKSet(
  new URL(`${process.env.BETTER_AUTH_URL}/api/auth/jwks`)
);

export const verifyJWT = async (request, response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return response.status(401).send({
      message: "Please provide a login token.",
    });
  }

  
  
  const token = authorization.slice(7);

  try {
    const { payload } = await jwtVerify(token, publicKeys, {
      issuer: process.env.BETTER_AUTH_URL,
      audience: process.env.BETTER_AUTH_URL,
      algorithms: ["EdDSA"],
      requiredClaims: ["exp", "sub"],
    });

    
    
    request.user = payload;

    next();
  } catch {
    return response.status(401).send({
      message: "Your token is invalid or expired. Please login again.",
    });
  }
};