import React, { useState } from 'react';
import { ChapterEntity } from '../../../shared/types.js';

interface ChapterCardProps {
  chapter: ChapterEntity;
  projectId: string;
  isGenerating?: boolean;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  projectId,
  isGenerating,
}) => {
  const [imageError, setImageError] = useState(false);
  const illustrationUrl = `/api/projects/${projectId}/assets/${chapter.id}_illustration.png`;

  // Extract chapter identifier / roman numeral (e.g. "Chapter 1" -> "I", "The River Bank" -> "R")
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const matchNum = chapter.name.match(/\b(?:chapter\s*(\d+)|(\d+))\b/i);
  const parsedNum = matchNum ? parseInt(matchNum[1] || matchNum[2], 10) : NaN;
  const watermark =
    !isNaN(parsedNum) && parsedNum > 0 && parsedNum <= 10
      ? romanNumerals[parsedNum - 1]
      : chapter.name.replace(/^(the|a|an|chapter)\s+/i, '').trim().charAt(0).toUpperCase() || '§';



  return (
    <div
      className="group bg-white rounded-r-3 border border-grad-border-2 overflow-hidden shadow-card hover:shadow-pop transition-all flex flex-col"
      data-testid={`chapter-card-${chapter.id}`}
    >
      {/* 16:9 Aspect Ratio Illustration Viewport */}
      <div className="relative aspect-[16/9] bg-grad-paper-2 border-b border-grad-border-2 flex items-center justify-center overflow-hidden">
        {chapter.illustrationReady && !imageError ? (
          <img
            src={illustrationUrl}
            alt={chapter.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            data-testid={`chapter-illustration-${chapter.id}`}
          />
        ) : (
          <div
            className="w-full h-full p-4 flex items-center justify-center select-none"
            data-testid={`chapter-canvas-placeholder-${chapter.id}`}
          >
            <div
              className={`w-full h-full rounded-r-2 border transition-all duration-500 bg-gradient-to-b from-[#fbf9f5] via-[#f7f3ec] to-[#eee8de] flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-6 ${
                isGenerating
                  ? 'border-grad-orange/40 shadow-[inset_0_0_20px_rgba(255,107,0,0.08)]'
                  : 'border-grad-line/30'
              }`}
            >
              {/* Chapter watermark with gentle breathing animation when generating */}
              <span
                className={`font-serif text-8xl font-black select-none pointer-events-none transition-all duration-700 ${
                  isGenerating
                    ? 'text-grad-orange/30 animate-pulse scale-105'
                    : 'text-grad-ink/[0.12] group-hover:scale-105'
                }`}
              >
                {watermark}
              </span>


            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col justify-start">
        <h4 className="font-extrabold text-lg text-grad-ink tracking-tight mb-2 leading-snug">
          {chapter.name}
        </h4>
        <p className="text-sm text-grad-ink-2 leading-relaxed line-clamp-3 m-0">
          {chapter.prompt}
        </p>
      </div>
    </div>
  );
};
