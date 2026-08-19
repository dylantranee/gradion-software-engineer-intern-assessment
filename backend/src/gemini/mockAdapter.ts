import {
  IGeminiService,
  CharacterGenerated,
  ChapterGenerated,
  NEGATIVE_PROMPT_INSTRUCTIONS,
} from './types.js';

// Valid 1x1 transparent/colored PNG base64 buffer for deterministic offline testing
const DUMMY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export class MockGeminiAdapter implements IGeminiService {
  public async generateStyle(bookText: string, customStyle?: string | null): Promise<string> {
    if (customStyle && customStyle.trim().length > 0) {
      return `Enriched Art Style: ${customStyle.trim()} with fine gouache brushstrokes, dramatic atmospheric lighting, and hand-inked linework.`;
    }
    return 'Classic vintage storybook watercolor with delicate pen-and-ink contour lines, warm sepia undertones, and gentle textural grain.';
  }

  public async generateCharacters(bookText: string, style: string): Promise<CharacterGenerated[]> {
    // Return mock characters - note the hard cap of 2 adult characters
    return [
      {
        name: 'The Mole',
        prompt: `Portrait of an adult anthropomorphic Mole wearing a velvet corduroy smoking jacket and wire-rim spectacles, gentle earthy demeanor, in the style of ${style}.`,
      },
      {
        name: 'The Water Rat',
        prompt: `Portrait of an adult anthropomorphic Water Rat in a striped navy fisherman jersey and tweed cap, confident nautical posture, in the style of ${style}.`,
      },
    ];
  }

  public async generatePortrait(
    characterName: string,
    characterPrompt: string,
    style: string
  ): Promise<Buffer> {
    // Verifies negative instructions presence
    const fullPrompt = `${characterPrompt} Style: ${style}. ${NEGATIVE_PROMPT_INSTRUCTIONS}`;
    if (!fullPrompt.includes('NEGATIVE CONSTRAINTS')) {
      throw new Error('Missing negative constraints in prompt');
    }
    return DUMMY_PNG_BUFFER;
  }

  public async generateChapters(
    bookText: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<ChapterGenerated[]> {
    const charNames = characters.map((c) => c.name).join(' and ');
    return [
      {
        name: 'Chapter 1: The River Bank',
        prompt: `Scene of ${charNames} meeting beside a sun-dappled bubbling river with weeping willows and a small wooden rowboat, rendered in ${style}.`,
      },
    ];
  }

  public async generateIllustration(
    chapterName: string,
    chapterPrompt: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<Buffer> {
    const fullPrompt = `${chapterPrompt} Style: ${style}. ${NEGATIVE_PROMPT_INSTRUCTIONS}`;
    if (!fullPrompt.includes('NEGATIVE CONSTRAINTS')) {
      throw new Error('Missing negative constraints in prompt');
    }
    return DUMMY_PNG_BUFFER;
  }
}

export const mockGeminiAdapter = new MockGeminiAdapter();
