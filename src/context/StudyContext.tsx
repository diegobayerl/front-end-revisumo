import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Estudo, Disciplina, Conteudo, Atividade, PomodoroSession } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface StudyContextType {
  estudos: Estudo[];
  selectedEstudo: Estudo | null;
  setSelectedEstudo: (estudo: Estudo | null) => void;
  disciplinas: Disciplina[];
  conteudos: Conteudo[];
  atividades: Atividade[];
  activePomodoro: PomodoroSession | null;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  refreshPomodoro: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType>({} as StudyContextType);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [estudos, setEstudos] = useState<Estudo[]>([]);
  const [selectedEstudo, setSelectedEstudo] = useState<Estudo | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [activePomodoro, setActivePomodoro] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPomodoro = useCallback(async () => {
    if (!user) return;
    try {
      const active = await api.pomodoro.getActive();
      setActivePomodoro(active);
    } catch {
      setActivePomodoro(null);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allEstudos = await api.estudos.list();
      setEstudos(allEstudos);

      let current = selectedEstudo;
      if (!current || !allEstudos.some((e) => e.id === current?.id)) {
        current = allEstudos[0] || null;
        setSelectedEstudo(current);
      }

      const [allDisciplinas, allConteudos, allAtividades] = await Promise.all([
        api.disciplinas.list(),
        api.conteudos.list(),
        api.atividades.list(),
      ]);

      setDisciplinas(allDisciplinas);
      setConteudos(allConteudos);
      setAtividades(allAtividades);
      await refreshPomodoro();
    } catch (err) {
      console.error('Falha ao sincronizar dados de estudos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedEstudo, refreshPomodoro]);

  useEffect(() => {
    if (user) {
      refreshData();
    } else {
      setEstudos([]);
      setSelectedEstudo(null);
      setDisciplinas([]);
      setConteudos([]);
      setAtividades([]);
      setActivePomodoro(null);
    }
  }, [user]);

  // Polling ativo do pomodoro a cada 5s quando usuário estiver logado
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      refreshPomodoro();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, refreshPomodoro]);

  return (
    <StudyContext.Provider
      value={{
        estudos,
        selectedEstudo,
        setSelectedEstudo,
        disciplinas,
        conteudos,
        atividades,
        activePomodoro,
        isLoading,
        refreshData,
        refreshPomodoro,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => useContext(StudyContext);
