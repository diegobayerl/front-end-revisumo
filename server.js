import express from 'express';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT) || 3000;
const backendUrl = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:3333');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Proxy transparente para o back-end na porta 3333
app.use('/api', (clientReq, clientRes) => {
  const isHttps = backendUrl.protocol === 'https:';
  const transport = isHttps ? https : http;

  const targetPath = backendUrl.pathname.replace(/\/$/, '') + '/api' + clientReq.url;
  const headers = { ...clientReq.headers };
  headers.host = backendUrl.host;
  headers['x-forwarded-for'] = clientReq.ip;
  headers['x-forwarded-proto'] = clientReq.protocol;

  const proxyReq = transport.request(
    {
      protocol: backendUrl.protocol,
      hostname: backendUrl.hostname,
      port: backendUrl.port || (isHttps ? 443 : 80),
      method: clientReq.method,
      path: targetPath,
      headers: headers,
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Falha na comunicação com o back-end:', err.message);
    if (!clientRes.headersSent) {
      clientRes.status(502).json({
        error: 'Back-end não encontrado em ' + backendUrl.origin + '. Inicie o serviço da porta 3333.',
      });
    }
  });

  clientReq.pipe(proxyReq, { end: true });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'site', 'index.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.json({ status: 'ok', port, backendUrl: backendUrl.origin }));
app.use(express.static(__dirname));

app.listen(port, '0.0.0.0', () => {
  console.log(`Front-end Revisumo ativo em: http://localhost:${port}`);
  console.log(`Conectado ao back-end em: ${backendUrl.origin}`);
});
