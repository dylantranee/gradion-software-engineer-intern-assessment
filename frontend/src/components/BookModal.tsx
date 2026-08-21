import React, { useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  bookText: string;
}

export const BookModal: React.FC<BookModalProps> = ({
  isOpen,
  onClose,
  title,
  bookText,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const wordCount = bookText.trim().split(/\s+/).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-grad-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      data-testid="book-modal-backdrop"
    >
      <div
        className="bg-white rounded-r-3 border border-grad-border-2 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-pop overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-modal-title"
        data-testid="book-modal-dialog"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-grad-border-2 flex items-center justify-between bg-grad-paper-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-r-2 bg-grad-orange-subtle text-grad-orange flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 id="book-modal-title" className="font-extrabold text-base text-grad-ink line-clamp-1 m-0">
                {title}
              </h3>
              <p className="text-xs text-grad-ink-3 m-0 mt-0.5">
                {wordCount.toLocaleString()} words
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-r-1 text-grad-ink-3 hover:text-grad-ink hover:bg-grad-paper transition-colors cursor-pointer bg-transparent border-none"
            aria-label="Close modal"
            data-testid="book-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable Manuscript) */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
          <div className="prose max-w-none text-grad-ink-body text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
            {bookText}
          </div>
        </div>
      </div>
    </div>
  );
};
