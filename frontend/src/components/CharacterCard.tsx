import React, { useState } from 'react';
import { CharacterEntity } from '../../../shared/types.js';

interface CharacterCardProps {
  character: CharacterEntity;
  projectId: string;
  isGenerating?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  projectId,
  isGenerating,
}) => {
  const [imageError, setImageError] = useState(false);
  const portraitUrl = `/api/projects/${projectId}/assets/${character.id}_portrait.png`;

  // Extract literary monogram (e.g., "The Mole" -> "M", "Rat" -> "R")
  const initial =
    character.name
      .replace(/^(the|a|an|mr\.?|mrs\.?|dr\.?)\s+/i, '')
      .trim()
      .charAt(0)
      .toUpperCase() ||
    character.name.charAt(0).toUpperCase() ||
    'C';



  return (
    <div
      className="group bg-white rounded-r-3 border border-grad-border-2 overflow-hidden shadow-card hover:shadow-pop transition-all flex flex-col"
      data-testid={`character-card-${character.id}`}
    >
      {/* 3:4 Aspect Ratio Image Area */}
      <div className="relative aspect-[3/4] bg-grad-paper-2 border-b border-grad-border-2 flex items-center justify-center overflow-hidden">
        {character.portraitReady && !imageError ? (
          <img
            src={portraitUrl}
            alt={character.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            data-testid={`character-portrait-${character.id}`}
          />
        ) : (
          <div
            className="w-full h-full p-4 flex items-center justify-center select-none"
            data-testid={`character-canvas-placeholder-${character.id}`}
          >
            <div
              className={`w-full h-full rounded-r-2 border transition-all duration-500 bg-gradient-to-b from-[#fbf9f5] via-[#f7f3ec] to-[#eee8de] flex flex-col items-center justify-center relative overflow-hidden shadow-inner p-6 ${
                isGenerating
                  ? 'border-grad-orange/40 shadow-[inset_0_0_20px_rgba(255,107,0,0.08)]'
                  : 'border-grad-line/30'
              }`}
            >
              {/* Monogram with gentle breathing animation when generating */}
              <span
                className={`font-serif text-8xl font-black select-none pointer-events-none transition-all duration-700 ${
                  isGenerating
                    ? 'text-grad-orange/30 animate-pulse scale-105'
                    : 'text-grad-ink/[0.12] group-hover:scale-105'
                }`}
              >
                {initial}
              </span>


            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col justify-start">
        <h4 className="font-extrabold text-lg text-grad-ink tracking-tight mb-2 leading-snug">
          {character.name}
        </h4>
        <p className="text-sm text-grad-ink-2 line-clamp-3 leading-relaxed m-0">
          {character.prompt}
        </p>
      </div>
    </div>
  );
};
