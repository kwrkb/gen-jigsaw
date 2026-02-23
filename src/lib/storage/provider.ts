export interface StorageProvider {
  /**
   * Upload a file and return the public URL or path to access it.
   */
  upload(buffer: Buffer, filename: string): Promise<string>;
}
