import crypto from 'crypto';
import { readBackupArchive } from './storage';
import { validateBackupArchive } from './restore';

export class BackupVerificationError extends Error {
  constructor(message = 'The stored backup archive failed verification.') {
    super(message);
    this.name = 'BackupVerificationError';
  }
}

export type ArchiveVerification = {
  sha256: string;
  fileCount: number;
  recordCount: number;
  fileName: string;
};

export function sha256Of(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Opens the ZIP, validates every checksum and the manifest, and compares the archive digest. */
export async function verifyArchiveBuffer(buffer: Buffer, expectedSha256?: string): Promise<ArchiveVerification> {
  const sha256 = sha256Of(buffer);
  if (expectedSha256 && sha256 !== expectedSha256) {
    throw new BackupVerificationError('The archive checksum does not match the generated backup.');
  }
  let validated;
  try {
    validated = await validateBackupArchive(buffer);
  } catch (error) {
    throw new BackupVerificationError(
      error instanceof Error ? `Archive verification failed: ${error.message}` : 'The archive could not be validated.',
    );
  }
  return {
    sha256,
    fileCount: validated.manifest.fileCount,
    recordCount: Object.values(validated.manifest.recordCounts).reduce((sum, count) => sum + count, 0),
    fileName: '',
  };
}

/**
 * Re-downloads the archive from durable storage and verifies it. A backup is
 * only marked successful after this passes.
 */
export async function verifyStoredBackup(id: string, fileName: string, expectedSha256?: string): Promise<ArchiveVerification> {
  let buffer: Buffer;
  try {
    buffer = await readBackupArchive(id, fileName);
  } catch (error) {
    throw new BackupVerificationError(
      error instanceof Error ? `The stored archive could not be read back: ${error.message}` : 'The stored archive could not be read back.',
    );
  }
  if (!buffer.length) throw new BackupVerificationError('The stored archive is empty.');
  const result = await verifyArchiveBuffer(buffer, expectedSha256);
  return { ...result, fileName };
}
