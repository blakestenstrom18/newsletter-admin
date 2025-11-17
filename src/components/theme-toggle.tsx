'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const stored = window.localStorage.getItem('theme');
    if (stored === 'dark') {
      root.classList.add('dark');
      setIsDark(true);
    } else if (stored === 'light') {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      // system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        setIsDark(true);
      }
    }
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    if (nextIsDark) {
      root.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  }

  if (!mounted) return null;

  return (
    <Button
      variant="outline"
      size="icon"
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

