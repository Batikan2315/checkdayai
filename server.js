const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Next.js uygulamasını oluştur
const app = next({ 
  dev, 
  hostname, 
  port,
  // Özel derleme seçenekleri 
  conf: {
    // Browser-only bağımlılıkları hariç tut
    serverRuntimeConfig: {
      excludeFromServerBundle: [
        'socket.io-client',
        'engine.io-client',
        'socket.io-parser',
        'engine.io-parser',
        'debug',
        'ws',
        'component-emitter',
        'xmlhttprequest-ssl',
        'backo2',
        'isomorphic-ws',
        'base64-arraybuffer',
        'parseqs',
        'yeast',
        'blob',
        'has-cors'
      ]
    },
    // Derlemede webpack uyarılarını sustur
    webpack: (config, { dev, isServer }) => {
      if (isServer) {
        // Tarayıcı modüllerini dışarıda tut
        config.externals = [
          ...(Array.isArray(config.externals) ? config.externals : []),
          function(context, request, callback) {
            // socket.io ve ilgili modülleri dışarıda tut
            if (/socket\.io/.test(request) || 
                /engine\.io/.test(request) || 
                /debug/.test(request) ||
                /ws/.test(request) ||
                /component-emitter/.test(request) ||
                /backo2/.test(request) ||
                /parseqs/.test(request) ||
                /isomorphic-ws/.test(request) ||
                /base64-arraybuffer/.test(request) ||
                /yeast/.test(request) ||
                /has-cors/.test(request) ||
                /blob/.test(request) ||
                /xmlhttprequest-ssl/.test(request)) {
              console.log(`🔄 Server tarafında hariç tutulan modül: ${request}`);
              return callback(null, 'commonjs ' + request);
            }
            callback();
          }
        ];
      }
      
      // Modül çözümleme sorunları için
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          "fs": false,
          "path": false,
          "os": false,
          "net": false,
          "tls": false,
          "dns": false
        }
      };
      
      return config;
    }
  }
});

// Servis istekleri için hazırlan
const handle = app.getRequestHandler();

// Performans izleme
const startTime = Date.now();
let requestCount = 0;
let errorCount = 0;

// Sunucuyu oluştur
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    requestCount++;
    
    // İstek yaşam döngüsünü takip et ve hataları yakala
    try {
      handle(req, res, parsedUrl);
    } catch (err) {
      errorCount++;
      console.error('Sunucu hatası:', err);
      res.statusCode = 500;
      res.end('İç sunucu hatası');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Uygulamayı şu adreste hazır: http://${hostname}:${port}`);
    
    // Her 5 dakikada bir performans raporu
    setInterval(() => {
      const uptime = Math.floor((Date.now() - startTime) / 1000 / 60);
      console.log(`📊 Performans: ${uptime} dk çalışma, ${requestCount} istek, ${errorCount} hata`);
    }, 300000);
  });
});