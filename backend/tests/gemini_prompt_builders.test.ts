import { describe, it, expect } from 'vitest';
import { sanitizeStyleText, promptBuilders, NEGATIVE_PROMPT_INSTRUCTIONS } from '../src/gemini/types.js';

describe('sanitizeStyleText: strips markdown artifacts from the free-form STYLE response', () => {
  it('strips a same-line "**Style Prompt:**" label', () => {
    const input =
      '**Style Prompt:** Illustrated in a whimsical Edwardian storybook style with an ethereal magical-realism twist, rendered in rich, layered gouache and fine dip-pen crosshatch ink. The color palette contrasts traditional earthy woodland tones of moss green, rich sepia, and burrow-brown with unexpected, vibrant pops of molten honey-gold, bioluminescent chartreuse, and deep twilight cyan.';

    const result = sanitizeStyleText(input);

    expect(result).not.toContain('**');
    expect(result).not.toMatch(/^Style Prompt/i);
    expect(result.startsWith('Illustrated in a whimsical Edwardian storybook style')).toBe(true);
  });

  it('strips a label on its own line followed by a blank line', () => {
    const input =
      '**Style Prompt:**\n\nRendered in a handcrafted needle-felted wool and polymer clay stop-motion miniature aesthetic, rich with fuzzy tactile fibers.';

    const result = sanitizeStyleText(input);

    expect(result).toBe(
      'Rendered in a handcrafted needle-felted wool and polymer clay stop-motion miniature aesthetic, rich with fuzzy tactile fibers.'
    );
  });

  it('strips mid-sentence bold markers even without a leading label', () => {
    expect(sanitizeStyleText('Style: warm sepia tones with **bold** highlights mid-sentence.')).toBe(
      'warm sepia tones with bold highlights mid-sentence.'
    );
  });

  it('leaves already-clean text untouched', () => {
    const clean =
      'Rendered in a tactile blend of layered gouache and fine scratchboard etching, featuring rich paper grain.';
    expect(sanitizeStyleText(clean)).toBe(clean);
  });
});

describe('promptBuilders: pure prompt-text construction', () => {
  it('BR: portrait and illustration prompts always include the negative-prompt instructions', () => {
    expect(promptBuilders.portrait('Mole', 'A gentle mole.', 'watercolor')).toContain(
      NEGATIVE_PROMPT_INSTRUCTIONS
    );
    expect(promptBuilders.illustration('Chapter 1', 'A river scene.', 'watercolor')).toContain(
      NEGATIVE_PROMPT_INSTRUCTIONS
    );
    expect(promptBuilders.imageChainPriming('watercolor')).toContain(NEGATIVE_PROMPT_INSTRUCTIONS);
  });

  it('style() honors a user-supplied custom style and instructs the model to reply with only the directive', () => {
    const prompt = promptBuilders.style('Studio Ghibli anime');
    expect(prompt).toContain('Studio Ghibli anime');
    expect(prompt).toMatch(/reply with only/i);
  });

  it('style() with no custom style asks Gemini to propose one', () => {
    expect(promptBuilders.style(undefined)).toMatch(/define an art style/i);
  });
});
