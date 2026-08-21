import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  backendPort: Number(process.env.BACKEND_PORT || 3001),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-flash-latest',
  geminiImageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  storageDir: process.env.STORAGE_DIR || './data',
  isProduction: process.env.NODE_ENV === 'production',
};
