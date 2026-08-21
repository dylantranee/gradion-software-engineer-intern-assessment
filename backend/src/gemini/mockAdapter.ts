import { IGeminiService, CharacterGenerated, ChapterGenerated } from './types.js';

// Valid 1x1 transparent/colored PNG base64 buffer for deterministic offline testing
const DUMMY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Deterministic offline fixtures, shaped like the real GeminiClient's chained
 * Interactions API — every call still returns a fresh `interactionId` so the
 * orchestrator's chain-persistence logic exercises the same code path in
 * tests as it does against the real API.
 */
export class MockGeminiAdapter implements IGeminiService {
  private counter = 0;

  private nextInteractionId(prefix: string): string {
    this.counter += 1;
    return `mock_${prefix}_${this.counter}`;
  }

  public async primeBook(bookText: string): Promise<{ fileUri: string; interactionId: string }> {
    return {
      fileUri: `mock://files/book_${this.counter + 1}`,
      interactionId: this.nextInteractionId('book'),
    };
  }

  public async generateStyle(
    previousInteractionId: string,
    customStyle?: string | null
  ): Promise<{ style: string; interactionId: string }> {
    const style =
      customStyle && customStyle.trim().length > 0
        ? `Enriched Art Style: ${customStyle.trim()} with fine gouache brushstrokes, dramatic atmospheric lighting, and hand-inked linework.`
        : 'Classic vintage storybook watercolor with delicate pen-and-ink contour lines, warm sepia undertones, and gentle textural grain.';

    return { style, interactionId: this.nextInteractionId('style') };
  }

  public async generateCharacters(
    previousInteractionId: string
  ): Promise<{ characters: CharacterGenerated[]; interactionId: string }> {
    const characters: CharacterGenerated[] = [
      {
        name: 'The Mole',
        prompt:
          'Portrait of an adult anthropomorphic Mole wearing a velvet corduroy smoking jacket and wire-rim spectacles, gentle earthy demeanor.',
      },
      {
        name: 'The Water Rat',
        prompt:
          'Portrait of an adult anthropomorphic Water Rat in a striped navy fisherman jersey and tweed cap, confident nautical posture.',
      },
    ];

    return { characters, interactionId: this.nextInteractionId('characters') };
  }

  public async generatePortrait(
    previousInteractionId: string | undefined,
    characterName: string,
    characterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }> {
    return { image: DUMMY_PNG_BUFFER, interactionId: this.nextInteractionId('portrait') };
  }

  public async generateChapters(
    previousInteractionId: string
  ): Promise<{ chapters: ChapterGenerated[]; interactionId: string }> {
    const chapters: ChapterGenerated[] = [
      {
        name: 'Chapter 1: The River Bank',
        prompt:
          'Scene of The Mole and The Water Rat meeting beside a sun-dappled bubbling river with weeping willows and a small wooden rowboat.',
      },
    ];

    return { chapters, interactionId: this.nextInteractionId('chapters') };
  }

  public async generateIllustration(
    previousInteractionId: string | undefined,
    chapterName: string,
    chapterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }> {
    return { image: DUMMY_PNG_BUFFER, interactionId: this.nextInteractionId('illustration') };
  }
}

export const mockGeminiAdapter = new MockGeminiAdapter();
