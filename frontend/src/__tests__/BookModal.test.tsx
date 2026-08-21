import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookModal } from '../components/BookModal.js';

describe('US-4.9 & US-4.11: BookModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BookModal
        isOpen={false}
        onClose={() => {}}
        title="Test Book"
        bookText="Sample text"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title, text, and handles close button click', () => {
    const handleClose = vi.fn();
    render(
      <BookModal
        isOpen={true}
        onClose={handleClose}
        title="The Wind in the Willows"
        bookText="The Mole had been working very hard all the morning..."
      />
    );

    expect(screen.getByText('The Wind in the Willows')).toBeDefined();
    expect(
      screen.getByText(/The Mole had been working very hard/i)
    ).toBeDefined();

    const closeBtn = screen.getByTestId('book-modal-close-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <BookModal
        isOpen={true}
        onClose={handleClose}
        title="The Wind in the Willows"
        bookText="Sample text..."
      />
    );

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('BR-PD-MODAL-03: closes when the backdrop (outside the dialog) is clicked', () => {
    const handleClose = vi.fn();
    render(
      <BookModal
        isOpen={true}
        onClose={handleClose}
        title="The Wind in the Willows"
        bookText="Sample text..."
      />
    );

    fireEvent.click(screen.getByTestId('book-modal-backdrop'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('BR-PD-MODAL-03: clicking inside the dialog does not close the modal', () => {
    const handleClose = vi.fn();
    render(
      <BookModal
        isOpen={true}
        onClose={handleClose}
        title="The Wind in the Willows"
        bookText="Sample text..."
      />
    );

    fireEvent.click(screen.getByTestId('book-modal-dialog'));
    expect(handleClose).not.toHaveBeenCalled();
  });
});
