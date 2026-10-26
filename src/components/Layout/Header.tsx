import React from 'react';
import { Sun, Moon, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStudy } from '../../context/StudyContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuth();
  const { estudos, selectedEstudo, setSelectedEstudo } = useStudy();
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const initials = user?.nome
    ? user.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AL';

  return (
    <header className="h-16 px-6 border-b border-slate-200/80 bg-white/50 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/50 flex items-center justify-between transition-colors">
      <div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Estudo em foco dropdown */}
        {estudos.length > 0 && (
          <div className="relative flex items-center">
            <div className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700/80 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <select
                value={selectedEstudo?.id || ''}
                onChange={(e) => {
                  const found = estudos.find((item) => item.id === e.target.value);
                  if (found) setSelectedEstudo(found);
                }}
                aria-label="Selecionar estudo em foco"
                className="bg-transparent focus:outline-hidden cursor-pointer pr-4 font-semibold text-slate-800 dark:text-slate-100"
              >
                {estudos.map((estudo) => (
                  <option key={estudo.id} value={estudo.id} className="dark:bg-slate-900">
                    {estudo.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 pointer-events-none -ml-4" />
            </div>
          </div>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Modo Claro' : 'Modo Escuro'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {initials}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
            {user?.nome?.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
};
