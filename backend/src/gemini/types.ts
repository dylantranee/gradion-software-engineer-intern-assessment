export interface CharacterGenerated {
  name: string;
  prompt: string;
}

export interface ChapterGenerated {
  name: string;
  prompt: string;
}

/**
 * Every generation call chains off a `previousInteractionId` (the notebook's
 * `previous_interaction_id`) instead of re-sending the book text or prior
 * results — the model already has that context from earlier turns in the
 * same conversation. Each call returns the new interaction id so the caller
 * can persist it as the next call's chain head.
 */
export interface IGeminiService {
  /** Uploads the book text once via the File API and starts the text conversation with it attached as context. */
  primeBook(bookText: string): Promise<{ fileUri: string; interactionId: string }>;

  generateStyle(
    previousInteractionId: string,
    customStyle?: string | null
  ): Promise<{ style: string; interactionId: string }>;

  generateCharacters(
    previousInteractionId: string
  ): Promise<{ characters: CharacterGenerated[]; interactionId: string }>;

  /**
   * `previousInteractionId` is undefined only for the very first portrait of
   * a project — that call also primes the image conversation with the style
   * and negative-prompt rules. Every later portrait/illustration call chains
   * off the id returned here.
   */
  generatePortrait(
    previousInteractionId: string | undefined,
    characterName: string,
    characterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }>;

  generateChapters(
    previousInteractionId: string
  ): Promise<{ chapters: ChapterGenerated[]; interactionId: string }>;

  /**
   * Chains off the same image conversation as the portraits, so the model
   * can refer back to them for character consistency. `previousInteractionId`
   * is undefined if no portrait was ever generated for this project (e.g. an
   * API-only caller that skipped PORTRAITS) — that call primes the image
   * chain itself, same as `generatePortrait` does.
   */
  generateIllustration(
    previousInteractionId: string | undefined,
    chapterName: string,
    chapterPrompt: string,
    style: string
  ): Promise<{ image: Buffer; interactionId: string }>;
}

export const NEGATIVE_PROMPT_INSTRUCTIONS = `
NEGATIVE CONSTRAINTS (STRICT):
- There must be NO text, NO labels, NO typography, NO signatures, nor titles in the artwork.
- It should NOT look like a book cover, poster, comic strip, or UI mockup.
- It must be a full bleed illustration with NO white borders, NO margins, NO frames, and NO multiple panels/collages.
- Maintain consistent atmospheric lighting and a family-friendly aesthetic.
`.trim();

const CHARACTER_CHAPTER_JSON_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      prompt: { type: 'string' },
    },
    required: ['name', 'prompt'],
  },
} as const;

/** Pure, unit-testable prompt/config builders — kept out of the class so they can be asserted on without touching the network. */
export const promptBuilders = {
  bookPriming(): string {
    return "Here's a book, to illustrate. Don't say anything for now, instructions will follow.";
  },

  style(customStyle?: string | null): string {
    if (customStyle && customStyle.trim().length > 0) {
      return `The art style will be: "${customStyle.trim()}". Expand it into a vivid, descriptive visual directive (2-3 sentences) covering lighting, color palette, brushwork, and linework, while strictly honoring the user's original style choice. Reply with only that directive.`;
    }
    return "Can you define an art style that would fit the story, with a twist? Just give us the prompt for the art style that will be added to future prompts (2-3 sentences covering medium, color palette, lighting, and texture).";
  },

  characters(): string {
    return 'Can you describe the main characters (only the adults, maximum 2) and prepare a prompt describing them with as much detail as possible (use the descriptions from the book) so an image model can generate portraits of them? Each prompt should be at least 50 words.';
  },

  chapters(): string {
    return 'Now, for the single most iconic, visually dramatic chapter scene in the book, give me a prompt to illustrate what happens in it (exactly 1 scene). It should be a single image, not a multi-tiled page. Be very descriptive, especially of the characters, and reuse their established descriptions and names if they appear.';
  },

  imageChainPriming(style: string): string {
    return `
You are going to generate illustration images for this book.
The style we want you to follow is: ${style}

${NEGATIVE_PROMPT_INSTRUCTIONS}
`.trim();
  },

  portrait(characterName: string, characterPrompt: string, style: string): string {
    return `
Create an illustration for ${characterName} following this description: ${characterPrompt}
Art style: ${style}.

${NEGATIVE_PROMPT_INSTRUCTIONS}
`.trim();
  },

  illustration(chapterName: string, chapterPrompt: string, style: string): string {
    return `
Starting from now, we're illustrating the book's chapter scene. Refer back to the previously generated character portraits in this conversation to keep the characters visually consistent, but feel free to change their positions.
Create an illustration for ${chapterName} following this description: ${chapterPrompt}
Art style: ${style}.

${NEGATIVE_PROMPT_INSTRUCTIONS}
`.trim();
  },

  structuredJsonResponseFormat() {
    return {
      type: 'text' as const,
      mime_type: 'application/json',
      schema: CHARACTER_CHAPTER_JSON_SCHEMA,
    };
  },
};
