import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config.js';
import {
  IGeminiService,
  CharacterGenerated,
  ChapterGenerated,
  NEGATIVE_PROMPT_INSTRUCTIONS,
} from './types.js';
import { mockGeminiAdapter } from './mockAdapter.js';

export class GeminiClient implements IGeminiService {
  private ai: GoogleGenAI | null = null;
  private textModel: string;
  private imageModel: string;

  constructor(apiKey?: string, textModel?: string, imageModel?: string) {
    const key = apiKey || config.geminiApiKey;
    this.textModel = textModel || config.geminiTextModel || 'gemini-2.5-flash';
    this.imageModel = imageModel || config.geminiImageModel || 'gemini-2.5-flash-image';

    if (key && key.trim() !== '' && key !== 'your_gemini_api_key_here') {
      this.ai = new GoogleGenAI({ apiKey: key });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      throw new Error(
        'Gemini API key is not configured. Please supply a valid GEMINI_API_KEY in your .env file.'
      );
    }
    return this.ai;
  }

  // --- Step 1: Art Style Generator ---
  public async generateStyle(bookText: string, customStyle?: string | null): Promise<string> {
    if (!this.ai) {
      return mockGeminiAdapter.generateStyle(bookText, customStyle);
    }

    const ai = this.getClient();
    let prompt = '';

    if (customStyle && customStyle.trim().length > 0) {
      prompt = `
You are an expert art director and book illustrator.
The user wants to illustrate this book in a specific style: "${customStyle.trim()}".
Analyze the book text excerpt and expand/enrich the user's requested style into a vivid, descriptive visual prompt directive (2-3 sentences) detailing lighting, color palette, brushwork, and linework while strictly honoring their original style choice.

Book excerpt:
${bookText.substring(0, 3000)}
`.trim();
    } else {
      prompt = `
You are an expert art director and book illustrator.
Analyze the following book text and propose a unified, atmospheric, and cohesive illustration art style (e.g. vintage watercolor, classic woodblock, modern gouache, gothic engraving) that best fits the book's narrative tone, period, and mood.
Provide a clear, rich, descriptive art style prompt (2-3 sentences) detailing medium, color palette, lighting, and texture.

Book text:
${bookText.substring(0, 3000)}
`.trim();
    }

    const response = await ai.models.generateContent({
      model: this.textModel,
      contents: prompt,
    });

    const text = response.text?.trim() || 'Classic vintage watercolor storybook style';
    return text;
  }

  // --- Step 2: Character Extraction (Max 2 Adults) ---
  public async generateCharacters(bookText: string, style: string): Promise<CharacterGenerated[]> {
    if (!this.ai) {
      return mockGeminiAdapter.generateCharacters(bookText, style);
    }

    const ai = this.getClient();
    const prompt = `
You are an expert book illustrator and character designer.
Analyze the following book text and identify the top primary ADULT characters in the story (maximum 2 adult characters).
For each character, generate a detailed visual portrait prompt describing their age, distinct physical traits, facial features, clothing, posture, and mood, rendered in the established art style: "${style}".

Book excerpt:
${bookText.substring(0, 4000)}
`.trim();

    const response = await ai.models.generateContent({
      model: this.textModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'List of primary adult characters (max 2)',
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'Full name or title of the character',
              },
              prompt: {
                type: Type.STRING,
                description: 'Detailed visual prompt describing the character portrait and style',
              },
            },
            required: ['name', 'prompt'],
          },
        },
      },
    });

    try {
      const parsed = JSON.parse(response.text || '[]') as CharacterGenerated[];
      // Server-side strict cap: Max 2 characters
      return parsed.slice(0, 2);
    } catch {
      return mockGeminiAdapter.generateCharacters(bookText, style);
    }
  }

  // --- Step 3: Character Portrait Generator (Nano Banana) ---
  public async generatePortrait(
    characterName: string,
    characterPrompt: string,
    style: string
  ): Promise<Buffer> {
    if (!this.ai) {
      return mockGeminiAdapter.generatePortrait(characterName, characterPrompt, style);
    }

    const ai = this.getClient();
    const fullPrompt = `
Solo character portrait of ${characterName}.
${characterPrompt}
Art style: ${style}.

${NEGATIVE_PROMPT_INSTRUCTIONS}
`.trim();

    const response = await ai.models.generateContent({
      model: this.imageModel,
      contents: fullPrompt,
    });

    // Extract binary image buffer from response
    return this.extractImageBuffer(response);
  }

  // --- Step 4: Chapter Extraction (Max 1 Scene) ---
  public async generateChapters(
    bookText: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<ChapterGenerated[]> {
    if (!this.ai) {
      return mockGeminiAdapter.generateChapters(bookText, style, characters);
    }

    const ai = this.getClient();
    const characterContext = characters
      .map((c) => `- ${c.name}: ${c.prompt}`)
      .join('\n');

    const prompt = `
You are an expert book illustrator and scene director.
Analyze the book text and select the single most iconic, visually dramatic chapter scene (exactly 1 chapter scene).
The scene must feature the established characters, maintaining visual consistency with their known descriptions:
${characterContext}

Established Art Style: "${style}"

Book excerpt:
${bookText.substring(0, 4000)}
`.trim();

    const response = await ai.models.generateContent({
      model: this.textModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'List of chapter scenes (max 1)',
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: 'Chapter number and title (e.g. Chapter 1: The River Bank)',
              },
              prompt: {
                type: Type.STRING,
                description: 'Rich scenic illustration prompt describing background, character actions, and atmosphere',
              },
            },
            required: ['name', 'prompt'],
          },
        },
      },
    });

    try {
      const parsed = JSON.parse(response.text || '[]') as ChapterGenerated[];
      // Server-side strict cap: Exactly/Max 1 chapter
      return parsed.slice(0, 1);
    } catch {
      return mockGeminiAdapter.generateChapters(bookText, style, characters);
    }
  }

  // --- Step 5: Chapter Illustration Generator (Nano Banana) ---
  public async generateIllustration(
    chapterName: string,
    chapterPrompt: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<Buffer> {
    if (!this.ai) {
      return mockGeminiAdapter.generateIllustration(chapterName, chapterPrompt, style, characters);
    }

    const ai = this.getClient();
    const characterContext = characters.map((c) => `${c.name}: ${c.prompt}`).join('; ');

    const fullPrompt = `
Full-page book scene illustration for "${chapterName}".
Scene Description: ${chapterPrompt}
Character Visual Continuity: ${characterContext}
Art Style: ${style}

${NEGATIVE_PROMPT_INSTRUCTIONS}
`.trim();

    const response = await ai.models.generateContent({
      model: this.imageModel,
      contents: fullPrompt,
    });

    return this.extractImageBuffer(response);
  }

  // --- Helper to extract binary image data from Gemini multimodal response ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractImageBuffer(response: any): Buffer {
    const candidate = response?.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (parts && parts.length > 0) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
    }

    throw new Error('No image payload returned by Gemini Image Generation API.');
  }
}

// Global Gemini Service Singleton
export const geminiClient = new GeminiClient();
