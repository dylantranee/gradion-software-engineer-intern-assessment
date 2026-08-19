export interface CharacterGenerated {
  name: string;
  prompt: string;
}

export interface ChapterGenerated {
  name: string;
  prompt: string;
}

export interface IGeminiService {
  generateStyle(bookText: string, customStyle?: string | null): Promise<string>;
  generateCharacters(bookText: string, style: string): Promise<CharacterGenerated[]>;
  generatePortrait(characterName: string, characterPrompt: string, style: string): Promise<Buffer>;
  generateChapters(
    bookText: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<ChapterGenerated[]>;
  generateIllustration(
    chapterName: string,
    chapterPrompt: string,
    style: string,
    characters: Array<{ name: string; prompt: string }>
  ): Promise<Buffer>;
}

export const NEGATIVE_PROMPT_INSTRUCTIONS = `
NEGATIVE CONSTRAINTS (STRICT):
- There must be NO text, NO labels, NO typography, NO signatures, nor titles in the artwork.
- It should NOT look like a book cover, poster, comic strip, or UI mockup.
- It must be a full bleed illustration with NO white borders, NO margins, NO frames, and NO multiple panels/collages.
- Maintain consistent atmospheric lighting and a family-friendly aesthetic.
`.trim();
