const { createServer: createHttpsServer } = require('https');
const { createServer: createHttpServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'cert-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

const port = 3000;
const httpPort = 3001; // HTTP fallback port

app.prepare().then(() => {
  // Create HTTPS server
  const httpsServer = createHttpsServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  
  // Create HTTP server as fallback
  const httpServer = createHttpServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });
  
  // Start HTTPS server
  httpsServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> HTTPS server ready on https://localhost:${port}`);
  });
  
  // Start HTTP server as fallback for socket.io connections
  httpServer.listen(httpPort, (err) => {
    if (err) throw err;
    console.log(`> HTTP fallback server ready on http://localhost:${httpPort}`);
  });
});