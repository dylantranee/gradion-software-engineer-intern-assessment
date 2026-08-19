import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  pathname: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType>({
  pathname: window.location.pathname,
  navigate: () => {},
});

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
  }, []);

  return (
    <RouterContext.Provider value={{ pathname, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter(): RouterContextType {
  return useContext(RouterContext);
}

export const Link: React.FC<{
  to: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}> = ({ to, className = '', children, title, 'aria-label': ariaLabel, 'data-testid': testId }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let browser handle new tab or meta keys
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </a>
  );
};
