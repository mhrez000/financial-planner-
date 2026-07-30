/**
 * Receipt/file storage behind one interface. Local disk now; the S3/R2
 * implementation (pre-signed URLs, SSE encryption) swaps in for production
 * without touching call sites. Keys are namespaced per user so a bad key can
 * never cross account boundaries.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredFile {
  bytes: Buffer;
  contentType: string;
}

export interface FileStorage {
  put(key: string, file: StoredFile): Promise<void>;
  get(key: string): Promise<StoredFile | null>;
}

const ROOT = path.join(process.cwd(), "var", "receipts");

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_TYPE).map(([t, e]) => [e, t]));

export const ALLOWED_RECEIPT_TYPES = Object.keys(EXT_BY_TYPE);
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** key format: <userId>/<txnId>.<ext> — validated to prevent traversal. */
function safePath(key: string): string {
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(key)) {
    throw new Error("Invalid storage key");
  }
  return path.join(ROOT, key);
}

export function receiptKeyFor(userId: string, txnId: string, contentType: string): string | null {
  const ext = EXT_BY_TYPE[contentType];
  return ext ? `${userId}/${txnId}.${ext}` : null;
}

class LocalDiskStorage implements FileStorage {
  async put(key: string, file: StoredFile): Promise<void> {
    const target = safePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.bytes);
  }

  async get(key: string): Promise<StoredFile | null> {
    try {
      const bytes = await readFile(safePath(key));
      const ext = key.split(".").pop() ?? "";
      return { bytes, contentType: TYPE_BY_EXT[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }
}

export const storage: FileStorage = new LocalDiskStorage();
