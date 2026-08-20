import React, { useState, useRef } from 'react';
import { api } from '../api.js';
import { Link, useRouter } from '../router.js';
import { UploadCloud, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';

const SAMPLE_TEXT = `The Mole had been working very hard all the morning, spring-cleaning his little home. First with brooms, then with dusters; then on ladders and steps and chairs, with a brush and a pail of whitewash; till he had dust in his throat and eyes, and splashes of whitewash all over his black fur, and an aching back and weary arms. Spring was moving in the air above and in the earth below and around him, penetrating even his dark and lowly little house with its spirit of divine discontent and longing.

It was small wonder, then, that he suddenly flung down his brush on the floor, said "Bother!" and "O blow!" and also "Hang spring-cleaning!" and bolted out of the house without even waiting to put on his coat.

He scraped and scratched and scrabbled and scrooged, and then he scrooged again and scrabbled and scratched and scraped, working busily with his little paws and muttering to himself, "Up we go! Up we go!" till at last, pop! his snout came out into the sunlight, and he found himself rolling in the warm grass of a great meadow.

It was the best day of his life. He jumped for joy and ran across the meadow till he reached the hedge on the further side. Passing through, he found himself standing by the edge of a full-fed river. Never in his life had he seen a river before—this sleek, sinuous, full-bodied animal, chasing and chuckling, gripping things with a gurgle and leaving them with a laugh.

As he sat on the grass and looked across the river, a dark hole in the bank opposite, just above the water's edge, caught his eye. Something bright and small seemed to twinkle down in the heart of it, vanished, then twinkled again like a tiny star. But it could hardly be a star in such an unlikely place; and it was too glittering and small for a glow-worm. Then, as he looked, it winked at him, and so declared itself to be an eye; and a small face began gradually to grow up round it, like a frame round a picture.

A brown little face, with whiskers. A grave round face, with the same twinkle in its eye that had first attracted his notice. Small neat ears and thick silky hair. It was the Water Rat!`;

interface FieldErrors {
  title?: string;
  bookText?: string;
}

export const NewProjectPage: React.FC = () => {
  const { navigate } = useRouter();
  const [title, setTitle] = useState('');
  const [bookText, setBookText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = bookText.trim().length > 0 ? bookText.trim().split(/\s+/).length : 0;

  const validate = (): boolean => {
    const errors: FieldErrors = {};

    if (!title.trim()) {
      errors.title = 'Please provide a book title.';
    }

    if (!bookText.trim()) {
      errors.bookText = 'Please provide book text.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (fieldErrors.title) {
      setFieldErrors((prev) => ({ ...prev, title: undefined }));
    }
  };

  const handleBookTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBookText(e.target.value);
    if (fieldErrors.bookText) {
      setFieldErrors((prev) => ({ ...prev, bookText: undefined }));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setServerError('File exceeds 5MB limit. Please upload a smaller text file.');
      return;
    }

    setFileName(file.name);
    setServerError(null);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      setFieldErrors((prev) => ({ ...prev, title: undefined }));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBookText(content || '');
      setFieldErrors((prev) => ({ ...prev, bookText: undefined }));
    };
    reader.readAsText(file);
  };

  const handleUseSample = () => {
    setTitle('The Wind in the Willows');
    setBookText(SAMPLE_TEXT);
    setFileName(null);
    setServerError(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const project = await api.createProject(title.trim(), bookText.trim());
      navigate(`/projects/${project.id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-grad-ink-2 hover:text-grad-orange transition-colors mb-3.5 no-underline cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Projects</span>
      </Link>

      <div className="bg-white rounded-r-3 border border-grad-border-2 p-6 sm:p-8 shadow-card">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-grad-ink tracking-tight m-0">New project</h1>
        </div>

        {serverError && (
          <div className="p-3.5 rounded-r-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="f-title" className="block text-sm font-semibold text-grad-ink mb-1.5">
              Book title <span className="text-grad-orange">*</span>
            </label>
            <input
              id="f-title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. The Wind in the Willows"
              className={`w-full px-3.5 py-2.5 rounded-r-2 border bg-white text-sm text-grad-ink focus:outline-none transition-all font-sans ${
                fieldErrors.title
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                  : 'border-grad-line/60 focus:ring-2 focus:ring-grad-orange/20 focus:border-grad-orange'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.title}</span>
              </p>
            )}
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-sm font-semibold text-grad-ink mb-1.5">
              Upload book file (.txt)
            </label>

            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`gd-dropzone rounded-r-3 py-3.5 px-4 text-center cursor-pointer flex items-center justify-center gap-3 group select-none ${
                isDragging ? 'active-drag' : ''
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <UploadCloud
                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                  isDragging ? 'text-grad-orange animate-bounce' : 'text-grad-ink-3 group-hover:text-grad-orange'
                }`}
              />
              <p
                className={`text-xs font-medium transition-colors m-0 ${
                  isDragging ? 'text-grad-orange font-bold' : 'text-grad-ink group-hover:text-grad-orange'
                }`}
              >
                {isDragging ? (
                  'Release to upload .txt file'
                ) : fileName ? (
                  <span className="font-bold text-grad-orange">{fileName}</span>
                ) : (
                  'Drop .txt file here or click to browse'
                )}
              </p>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <label htmlFor="f-booktext" className="block text-sm font-semibold text-grad-ink">
                  Book text <span className="text-grad-orange">*</span>
                </label>
                {wordCount > 0 && (
                  <span className="text-xs text-grad-ink-3 font-medium">
                    ({wordCount.toLocaleString()} words)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleUseSample}
                className="text-xs font-bold text-grad-orange bg-grad-orange-subtle hover:bg-[#ffe6d4] hover:text-grad-orange-hover border border-grad-orange/25 hover:border-grad-orange/50 flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-pill transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try sample text</span>
              </button>
            </div>
            <textarea
              id="f-booktext"
              rows={6}
              value={bookText}
              onChange={handleBookTextChange}
              placeholder="Paste a chapter or story text to begin..."
              className={`w-full px-3.5 py-2.5 rounded-r-2 border bg-white text-sm leading-relaxed text-grad-ink font-sans resize-none overflow-y-auto focus:outline-none transition-all ${
                fieldErrors.bookText
                  ? 'border-red-400 focus:ring-2 focus:ring-red-200 focus:border-red-500'
                  : 'border-grad-line/60 focus:ring-2 focus:ring-grad-orange/20 focus:border-grad-orange'
              }`}
            />
            {fieldErrors.bookText && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span>{fieldErrors.bookText}</span>
              </p>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Link
              to="/projects"
              className="px-4 py-2.5 rounded-r-2 border border-grad-line/60 text-grad-ink-2 font-bold text-xs hover:bg-grad-paper transition-colors no-underline flex items-center cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-r-2 bg-grad-orange text-white font-bold text-xs hover:bg-grad-orange-hover transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
