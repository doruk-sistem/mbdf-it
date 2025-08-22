import { createHash } from 'crypto';

/**
 * Calculate SHA-256 hash of a string or buffer
 */
export function calculateHash(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate SHA-256 hash of a file buffer
 */
export function calculateFileHash(fileBuffer: Buffer): string {
  return calculateHash(fileBuffer);
}

/**
 * Verify hash integrity
 */
export function verifyHash(data: string | Buffer, expectedHash: string): boolean {
  const actualHash = calculateHash(data);
  return actualHash === expectedHash;
}

/**
 * Generate timestamp-based hash for unique identifiers
 */
export function generateTimestampHash(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 9);
  return calculateHash(`${timestamp}_${random}`);
}

/**
 * Generate submission hash for KKS integrity
 */
export function generateSubmissionHash(submissionData: any): string {
  const dataString = JSON.stringify(submissionData, Object.keys(submissionData).sort());
  return calculateHash(dataString);
}