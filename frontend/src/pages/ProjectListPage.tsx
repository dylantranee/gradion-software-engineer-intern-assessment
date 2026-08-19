import React, { useState, useEffect } from 'react';
import { ProjectSummary } from '../../../shared/types.js';
import { api } from '../api.js';
import { Link } from '../router.js';
import { StatusPill } from '../components/StatusPill.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { Plus, BookOpen, Clock, Users, BookPlus, AlertCircle } from 'lucide-react';

export const ProjectListPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await api.listProjects();
        setProjects(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-grad-ink tracking-tight">
            Projects
          </h1>
        </div>
        {projects.length > 0 && (
          <Link
            to="/projects/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-colors shadow-sm cursor-pointer no-underline self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New project</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-r-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-r-3 border border-grad-border-2 py-24 text-center w-full flex flex-col items-center justify-center shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-grad-orange border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-medium text-grad-ink-2">Loading your library...</p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State (Full-Width Studio Canvas) */
        <div className="bg-white rounded-r-3 border-2 border-dashed border-grad-line/80 py-20 sm:py-24 px-6 text-center w-full shadow-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-grad-orange-subtle text-grad-orange flex items-center justify-center mb-5 shadow-sm">
            <BookPlus className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-grad-ink mb-2">No projects yet</h2>
          <p className="text-sm text-grad-ink-2 max-w-md mb-8 leading-relaxed">
            Upload a book file or paste text to start generating artwork.
          </p>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-r-2 bg-grad-orange text-white font-bold text-sm hover:bg-grad-orange-hover transition-all shadow-sm no-underline cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New project</span>
          </Link>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white rounded-r-3 border border-grad-border-2 p-6 shadow-card hover:shadow-pop hover:border-grad-orange/40 transition-all flex flex-col justify-between no-underline group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3
                    className="font-extrabold text-lg text-grad-ink group-hover:text-grad-orange transition-colors line-clamp-2 min-h-[3.25rem] leading-snug"
                    title={project.title}
                  >
                    {project.title}
                  </h3>
                  <StatusPill status={project.status} stepState={project.stepState} />
                </div>

                <div className="mb-4">
                  <ProgressBar status={project.status} />
                </div>
              </div>

              <div className="pt-4 border-t border-grad-border-2 flex items-center justify-between text-xs text-grad-ink-3">
                {project.characterCount > 0 || project.chapterCount > 0 ? (
                  <div className="flex items-center gap-3">
                    {project.characterCount > 0 && (
                      <span className="flex items-center gap-1" title="Characters">
                        <Users className="w-3.5 h-3.5 text-grad-ink-2" />
                        <span>
                          {project.characterCount}{' '}
                          {project.characterCount === 1 ? 'character' : 'characters'}
                        </span>
                      </span>
                    )}
                    {project.chapterCount > 0 && (
                      <span className="flex items-center gap-1" title="Chapters">
                        <BookOpen className="w-3.5 h-3.5 text-grad-ink-2" />
                        <span>
                          {project.chapterCount}{' '}
                          {project.chapterCount === 1 ? 'chapter' : 'chapters'}
                        </span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div />
                )}

                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(project.updatedAt)}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
