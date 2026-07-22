import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export type JwtPayload = {
  userId: string;
  organizationId: string;
  role: string;
  isMaster?: boolean;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
