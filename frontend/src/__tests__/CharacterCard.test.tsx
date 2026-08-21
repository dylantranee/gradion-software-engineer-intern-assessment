import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterCard } from '../components/CharacterCard.js';
import { CharacterEntity } from '../../../shared/types.js';

describe('US-4.8 & US-4.11: CharacterCard Component', () => {
  const sampleCharacter: CharacterEntity = {
    id: 'char_1',
    name: 'The Mole',
    prompt: 'A gentle mole with velvety black fur wearing a tweed waistcoat',
    portraitReady: false,
  };

  it('renders character name, prompt, and portrait pending placeholder', () => {
    render(<CharacterCard character={sampleCharacter} projectId="proj_1" />);

    expect(screen.getByText('The Mole')).toBeDefined();
    expect(
      screen.getByText(/A gentle mole with velvety black fur/i)
    ).toBeDefined();
    expect(
      screen.getByTestId('character-canvas-placeholder-char_1')
    ).toBeDefined();
  });

  it('renders image element when portraitReady is true', () => {
    const readyCharacter: CharacterEntity = {
      ...sampleCharacter,
      portraitReady: true,
    };

    render(<CharacterCard character={readyCharacter} projectId="proj_1" />);

    const img = screen.getByTestId('character-portrait-char_1') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain('/api/projects/proj_1/assets/char_1_portrait.png');
  });

  it('BR-PD-CHAR-05: falls back to the placeholder canvas when the portrait image fails to load', () => {
    const readyCharacter: CharacterEntity = {
      ...sampleCharacter,
      portraitReady: true,
    };

    render(<CharacterCard character={readyCharacter} projectId="proj_1" />);

    const img = screen.getByTestId('character-portrait-char_1');
    fireEvent.error(img);

    expect(screen.queryByTestId('character-portrait-char_1')).toBeNull();
    expect(screen.getByTestId('character-canvas-placeholder-char_1')).toBeInTheDocument();
  });
});
