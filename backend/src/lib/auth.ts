import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "insecure-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

export interface TokenPayload {
  userId: string;
  role: "ADMIN" | "MEMBER";
}

export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, 10);
}

export async function compareValue(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/** Generates a 6-digit numeric PIN, e.g. "482917". */
export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
