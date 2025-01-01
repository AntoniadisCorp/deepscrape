import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { existsSync, readFileSync } from 'node:fs';
import { SyncAIapis } from 'api';


// The Express app is exported so that it can be used by serverless Functions.
function serveapp(): express.Application {
  const server: express.Application = express()

  const packageJson = existsSync(join(process.cwd(), 'proxy.conf.json')) ?
    JSON.parse(readFileSync(join(process.cwd(), 'proxy.conf.json'), 'utf-8')) :
    {}


  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);
  server.set('trust proxy', true)



  server.use(express.urlencoded({ limit: '3mb', extended: false }));
  server.use(express.json({ limit: '3mb' })) // To pars

  const airouter = new SyncAIapis()

  server.use('/', airouter.router)

  // *PWA Service Worker (if running in production)
  server.use((req, res, next) => {
    if (req.url.includes('ngsw')) {
      res.setHeader('Service-Worker-Allowed', '/')
    }
    next()
  })

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }))

  // All regular routes use the Angular engine **
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const host = process.env['HOST'] || 'localhost';
  // Start up the Node server
  const server = serveapp();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://${host}:${port}`);
    return host
  });
  // server.on('upgrade', proxyAnthropic.upgrade); // <-- subscribe to http 'upgrade'
}


if (process.env['PRODUCTION'] === 'false') {
  run()
}
// export const app:express.Application  = serveapp()
