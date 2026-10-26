# Revisumo — Front-end

Aplicação web do Revisumo: espaço de estudos do aluno, cronograma, ciclo Pomodoro, anotações e landing page.

---

## Requisitos

- Node.js 24+
- Back-end do Revisumo rodando na porta 3333

---

## Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie a aplicação na porta **3000**:
   ```bash
   npm run dev
   ```

3. Abra no navegador:
   - **Site/Landing page:** `http://localhost:3000`
   - **Espaço do aluno (Workspace):** `http://localhost:3000/app`

---

## Estrutura

```text
front-end/
├── index.html        # Painel de estudos do aluno
├── workspace.js      # Lógica da interface, cronograma e Pomodoro
├── workspace.css     # Estilos visuais do painel
├── server.js         # Servidor HTTP Express com proxy para :3333
├── lib/              # Módulos JS (calendário, regras de domínio, editores)
├── site/             # Landing page institucional e comercial
└── test/             # Testes automatizados das regras de interface
```
