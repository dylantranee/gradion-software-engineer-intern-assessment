import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { IGeminiService, CharacterGenerated, ChapterGenerated, promptBuilders } from './types.js';
import { mockGeminiAdapter } from './mockAdapter.js';

/**
 * Talks to Gemini via the Interactions API (`ai.interactions.create`), the
 * conversation-chaining mechanism the reference notebook uses: the book text
 * is uploaded once via the File API and every step chains off the previous
 * step's `interactionId` instead of re-sending the book or prior results.
 * See docs/DECISIONS.md for why this replaced the earlier per-step
 * `generateContent` calls that resent a truncated copy of the book text
 * on every STYLE/CHARACTERS/CHAPTERS call.
 */
export class GeminiClient implements IGeminiService {
  private ai: GoogleGenAI | null = null;
  private textModel: string;
  private imageModel: string;

  constructor(apiKey?: string, textModel?: string, imageModel?: string) {
    const key = apiKey || config.geminiApiKey;
    this.textModel = textModel || config.geminiTextModel || 'gemini-flash-latest';
    this.imageModel = imageModel || config.geminiImageModel || 'gemini-2.5-flash-image';

    if (key && key.trim() !== '' && key !== 'your_gemini_api_key_here') {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
      } catch {
        this.ai = null;
      }
    }
  }

  private fallback<T>(method: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[GeminiClient] ${method} failed, falling back to mock adapter: ${message}`);
  }

  // --- Upload the book once and start the text conversation with it attached ---
  public async primeBook(bookText: string): Promise<{ fileUri: string; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.primeBook(bookText);
    }

    try {
      const file = await this.ai.files.upload({
        file: new Blob([bookText], { type: 'text/plain' }),
        config: { mimeType: 'text/plain', displayName: 'book.txt' },
      });

      if (!file.uri) {
        throw new Error('Gemini File API upload did not return a file URI.');
      }

      const bookInteraction = await this.ai.interactions.create({
        model: this.textModel,
        input: [
          { type: 'text', text: promptBuilders.bookPriming() },
          { type: 'document', uri: file.uri, mime_type: file.mimeType },
        ],
      });

      return { fileUri: file.uri, interactionId: bookInteraction.id };
    } catch (err) {
      this.fallback('primeBook', err);
      return mockGeminiAdapter.primeBook(bookText);
    }
  }

  // --- Step 1: Style — chains off the book-priming interaction ---
  public async generateStyle(
    previousInteractionId: string,
    customStyle?: string | null
  ): Promise<{ style: string; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.generateStyle(previousInteractionId, customStyle);
    }

    try {
      const interaction = await this.ai.interactions.create({
        model: this.textModel,
        input: promptBuilders.style(customStyle),
        previous_interaction_id: previousInteractionId,
      });

      return {
        style: interaction.output_text?.trim() || 'Classic vintage watercolor storybook style',
        interactionId: interaction.id,
      };
    } catch (err) {
      this.fallback('generateStyle', err);
      return mockGeminiAdapter.generateStyle(previousInteractionId, customStyle);
    }
  }

  // --- Step 2: Character Extraction (Max 2 Adults) — chains off the style interaction ---
  public async generateCharacters(
    previousInteractionId: string
  ): Promise<{ characters: CharacterGenerated[]; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.generateCharacters(previousInteractionId);
    }

    try {
      const interaction = await this.ai.interactions.create({
        model: this.textModel,
        input: promptBuilders.characters(),
        previous_interaction_id: previousInteractionId,
        response_format: promptBuilders.structuredJsonResponseFormat(),
      });

      const parsed = JSON.parse(interaction.output_text || '[]') as CharacterGenerated[];
      return { characters: parsed.slice(0, 2), interactionId: interaction.id };
    } catch (err) {
      this.fallback('generateCharacters', err);
      return mockGeminiAdapter.generateCharacters(previousInteractionId);
    }
  }

  // --- Step 3: Character Portrait Generator (Nano Banana) ---
  public async generatePortrait(
    previousInteractionId: string | undefined,
    characterName: string,
    characterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.generatePortrait(previousInteractionId, characterName, characterPrompt, style);
    }

    try {
      let chainId = previousInteractionId;
      if (!chainId) {
        // First portrait of the project: prime the image conversation with the style + negative-prompt rules.
        const priming = await this.ai.interactions.create({
          model: this.imageModel,
          input: promptBuilders.imageChainPriming(style),
        });
        chainId = priming.id;
      }

      const interaction = await this.ai.interactions.create({
        model: this.imageModel,
        input: promptBuilders.portrait(characterName, characterPrompt, style),
        previous_interaction_id: chainId,
      });

      return { image: this.extractImageBuffer(interaction), interactionId: interaction.id };
    } catch (err) {
      this.fallback('generatePortrait', err);
      return mockGeminiAdapter.generatePortrait(previousInteractionId, characterName, characterPrompt, style);
    }
  }

  // --- Step 4: Chapter Extraction (Max 1 Scene) — chains off the characters interaction ---
  public async generateChapters(
    previousInteractionId: string
  ): Promise<{ chapters: ChapterGenerated[]; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.generateChapters(previousInteractionId);
    }

    try {
      const interaction = await this.ai.interactions.create({
        model: this.textModel,
        input: promptBuilders.chapters(),
        previous_interaction_id: previousInteractionId,
        response_format: promptBuilders.structuredJsonResponseFormat(),
      });

      const parsed = JSON.parse(interaction.output_text || '[]') as ChapterGenerated[];
      return { chapters: parsed.slice(0, 1), interactionId: interaction.id };
    } catch (err) {
      this.fallback('generateChapters', err);
      return mockGeminiAdapter.generateChapters(previousInteractionId);
    }
  }

  // --- Step 5: Chapter Illustration Generator — continues the portraits' image chain ---
  public async generateIllustration(
    previousInteractionId: string | undefined,
    chapterName: string,
    chapterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }> {
    if (!this.ai) {
      return mockGeminiAdapter.generateIllustration(previousInteractionId, chapterName, chapterPrompt, style);
    }

    try {
      let chainId = previousInteractionId;
      if (!chainId) {
        // No portrait was ever generated for this project (e.g. ILLUSTRATIONS run without
        // PORTRAITS first) — prime the image conversation ourselves, same as generatePortrait.
        const priming = await this.ai.interactions.create({
          model: this.imageModel,
          input: promptBuilders.imageChainPriming(style),
        });
        chainId = priming.id;
      }

      const interaction = await this.ai.interactions.create({
        model: this.imageModel,
        input: promptBuilders.illustration(chapterName, chapterPrompt, style),
        previous_interaction_id: chainId,
      });

      return { image: this.extractImageBuffer(interaction), interactionId: interaction.id };
    } catch (err) {
      this.fallback('generateIllustration', err);
      return mockGeminiAdapter.generateIllustration(previousInteractionId, chapterName, chapterPrompt, style);
    }
  }

  private extractImageBuffer(interaction: { output_image?: { data?: string } | undefined }): Buffer {
    const data = interaction.output_image?.data;
    if (!data) {
      throw new Error('No image payload returned by Gemini Image Generation API.');
    }
    return Buffer.from(data, 'base64');
  }
}

export const geminiClient = new GeminiClient();
