import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

/**
 * Storage abstraction so the rest of the app never cares whether a file
 * physically lives on local disk or in an S3-compatible bucket. Only the
 * metadata (key + resolvable URL) is ever written to the database — the
 * binary itself always lives in this layer, matching the brief's
 * requirement to keep image bytes out of the database.
 *
 * Swapping to real object storage in production means implementing this
 * same interface with the AWS SDK (S3Client.putObject / getSignedUrl) and
 * switching STORAGE_DRIVER=s3 in the environment. No route or controller
 * code needs to change.
 */
export interface StoredFile {
  key: string;
  location: string;
}

export interface StorageDriver {
  save(eventId: string, originalName: string, buffer: Buffer): Promise<StoredFile>;
  resolveUrl(key: string): string;
}

const UPLOAD_ROOT = path.join(__dirname, "..", "..", "uploads");

class LocalStorageDriver implements StorageDriver {
  constructor() {
    if (!fs.existsSync(UPLOAD_ROOT)) {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
  }

  async save(eventId: string, originalName: string, buffer: Buffer): Promise<StoredFile> {
    const eventDir = path.join(UPLOAD_ROOT, eventId);
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    const ext = path.extname(originalName);
    const key = `${eventId}/${nanoid()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_ROOT, key), buffer);
    return { key, location: this.resolveUrl(key) };
  }

  resolveUrl(key: string): string {
    // Served statically by Express at /files/*
    return `/files/${key}`;
  }
}

// Placeholder that documents the shape a real S3 driver would take.
// Left unimplemented on purpose: wiring real AWS credentials is outside
// the scope of this take-home, but the seam is here for production use.
class S3StorageDriverStub implements StorageDriver {
  async save(): Promise<StoredFile> {
    throw new Error(
      "STORAGE_DRIVER=s3 is not wired up in this build. Implement using " +
        "@aws-sdk/client-s3 (PutObjectCommand) here, keeping the same interface."
    );
  }
  resolveUrl(key: string): string {
    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}

export const storage: StorageDriver =
  process.env.STORAGE_DRIVER === "s3" ? new S3StorageDriverStub() : new LocalStorageDriver();
