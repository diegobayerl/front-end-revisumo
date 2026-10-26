import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/Auth/AuthScreen';
import { Sidebar, PageId } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { ActivePomodoroBar } from './components/Layout/ActivePomodoroBar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { EstudosView } from './components/Estudos/EstudosView';
import { CronogramaView } from './components/Cronograma/CronogramaView';
import { PomodoroView } from './components/Pomodoro/PomodoroView';
import { AnotacoesView } from './components/Anotacoes/AnotacoesView';
import { AgendaView } from './components/Agenda/AgendaView';

// Modals
import { EditalModal } from './components/Modals/EditalModal';
import { ScheduleAIModal } from './components/Modals/ScheduleAIModal';
import { QuickScheduleModal } from './components/Modals/QuickScheduleModal';
import { ActivityModal } from './components/Modals/ActivityModal';
import { NewStudyModal } from './components/Modals/NewStudyModal';

import { Atividade } from './types';
import { api } from './services/api';
import { useStudy } from './context/StudyContext';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { refreshPomodoro } = useStudy();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // Modals state
  const [isEditalModalOpen, setIsEditalModalOpen] = useState(false);
  const [isScheduleAIModalOpen, setIsScheduleAIModalOpen] = useState(false);
  const [isQuickScheduleOpen, setIsQuickScheduleOpen] = useState(false);
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Atividade | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const handleStartPomodoroForActivity = async (act: Atividade) => {
    try {
      await api.pomodoro.start({
        item_cronograma_id: act.id,
        disciplina_id: act.disciplina_id,
        conteudo_id: act.conteudo_id,
        fase: 'foco',
      });
      await refreshPomodoro();
      setCurrentPage('pomodoro');
    } catch (err: any) {
      alert(err.message || 'Já existe uma sessão de Pomodoro ativa.');
      setCurrentPage('pomodoro');
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return { title: 'Visão Geral & Foco', subtitle: 'Acompanhe seu roteiro diário e métricas' };
      case 'estudos':
        return { title: 'Meus Estudos', subtitle: 'Objetivos, matérias e conteúdos programáticos' };
      case 'cronograma':
        return { title: 'Cronograma Semanal', subtitle: 'Disponibilidade e distribuição inteligente' };
      case 'pomodoro':
        return { title: 'Pomodoro de Foco', subtitle: 'Temporizador contínuo e histórico de estudos' };
      case 'anotacoes':
        return { title: 'Caderno de Anotações', subtitle: 'Resumos e apontamentos vinculados aos conteúdos' };
      case 'agenda':
        return { title: 'Agenda e Linha do Tempo', subtitle: 'Visualizações por mês, semana e pipeline' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />

        {/* Top Active Pomodoro Bar */}
        <ActivePomodoroBar onOpenTimer={() => setCurrentPage('pomodoro')} />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentPage}
              onOpenActivity={setSelectedActivity}
              onStartPomodoroForActivity={handleStartPomodoroForActivity}
              onOpenQuickSchedule={() => setIsQuickScheduleOpen(true)}
            />
          )}

          {currentPage === 'estudos' && (
            <EstudosView
              onOpenEditalModal={() => setIsEditalModalOpen(true)}
              onOpenNewStudyModal={() => setIsNewStudyModalOpen(true)}
            />
          )}

          {currentPage === 'cronograma' && (
            <CronogramaView
              onOpenScheduleAIModal={() => setIsScheduleAIModalOpen(true)}
              onOpenQuickSchedule={() => setIsQuickScheduleOpen(true)}
            />
          )}

          {currentPage === 'pomodoro' && <PomodoroView />}

          {currentPage === 'anotacoes' && <AnotacoesView />}

          {currentPage === 'agenda' && (
            <AgendaView onOpenActivity={setSelectedActivity} />
          )}
        </main>
      </div>

      {/* Modals */}
      <EditalModal
        isOpen={isEditalModalOpen}
        onClose={() => setIsEditalModalOpen(false)}
      />

      <ScheduleAIModal
        isOpen={isScheduleAIModalOpen}
        onClose={() => setIsScheduleAIModalOpen(false)}
      />

      <QuickScheduleModal
        isOpen={isQuickScheduleOpen}
        onClose={() => setIsQuickScheduleOpen(false)}
      />

      <NewStudyModal
        isOpen={isNewStudyModalOpen}
        onClose={() => setIsNewStudyModalOpen(false)}
      />

      <ActivityModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onStartPomodoro={handleStartPomodoroForActivity}
      />
    </div>
  );
};
