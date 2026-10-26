# Revisumo — Web App do Aluno

Aplicação web do aluno construída em **React 19 + Vite + TypeScript + Tailwind CSS**.

---

## Recursos Implementados

- **Dashboard:** Visão do dia, métricas de foco, roteiro diário e widget Pomodoro integrado.
- **Meus Estudos:** Gestão de concursos/vestibulares, disciplinas com pesos (1 a 100), tópicos e importação de edital em PDF com IA (Google Gemini).
- **Cronograma Semanal:** Mapeamento de janelas semanais de disponibilidade e gerador de cronograma inteligente com revisões espaçadas (1, 7 e 30 dias).
- **Relógio Pomodoro:** Temporizador com anel de progresso, fases de foco e pausas configuráveis, recuperável após recarregar a tela, histórico paginado.
- **Caderno de Anotações:** Editor e leitor de notas filtradas por matéria e conteúdo.
- **Agenda Temporal:** Visualizações em Mês (42 dias), Semana (com divisão de eventos pela meia-noite e side-by-side de sobreposições) e Pipeline Kanban por status.
- **Tema Claro / Escuro:** Alternância instantânea com persistência local.

---

## Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor Vite na porta 3000
npm run dev
```

Acesse em seu navegador:
**http://localhost:3000**

As chamadas para `/api/*` são roteadas automaticamente via proxy reverso do Vite para a API na porta `3333`.

---

## Testes

```bash
npm test
```
