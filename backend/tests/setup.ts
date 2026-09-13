import "dotenv/config";
import { randomUUID } from "crypto";
import { createApp } from "../src/app";

export const app = createApp();

/** A fresh, guaranteed-unique email per test run so tests never collide
 *  with each other or with data left over from a previous run. */
export function uniqueEmail(label: string) {
  return `${label}-${randomUUID()}@test.com`;
}
