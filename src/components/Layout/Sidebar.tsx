import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Timer,
  FileText,
  Calendar,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type PageId = 'dashboard' | 'estudos' | 'cronograma' | 'pomodoro' | 'anotacoes' | 'agenda';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'estudos' as PageId, label: 'Meus Estudos', icon: GraduationCap },
    { id: 'cronograma' as PageId, label: 'Cronograma', icon: CalendarDays },
    { id: 'pomodoro' as PageId, label: 'Pomodoro', icon: Timer },
    { id: 'anotacoes' as PageId, label: 'Anotações', icon: FileText },
    { id: 'agenda' as PageId, label: 'Agenda', icon: Calendar },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
        <a href="/" className="group flex items-center gap-1.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          <span>revi</span>
          <span className="text-emerald-700 dark:text-emerald-400">sumo</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        </a>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
          v0.2
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
          Meu Espaço
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-emerald-600 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Inspirational Bottom Note */}
      <div className="p-4 mx-3 mb-3 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-slate-200/60 dark:from-slate-800/40 dark:to-emerald-950/20 dark:border-slate-700/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ritmo e Constância</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Pequenos blocos de foco diário constroem a sua aprovação.
        </p>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/50">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};
