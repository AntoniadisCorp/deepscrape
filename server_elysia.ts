import { isMainModule } from '@angular/ssr/node';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
// import bootstrap from './src/main.server';
import { existsSync, readFileSync } from 'node:fs';
// import { SyncAIapis } from 'api';
import Elysia from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';


// The Express app is exported so that it can be used by serverless Functions.
function serveapp(): Elysia {
    const server = new Elysia()
    const angularAppEngine = new AngularAppEngine()

    const packageJson = existsSync(join(process.cwd(), 'proxy.conf.json')) ?
        JSON.parse(readFileSync(join(process.cwd(), 'proxy.conf.json'), 'utf-8')) :
        {}

    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html')

    server.use(staticPlugin({
        prefix: '',
        assets: browserDistFolder,
        alwaysStatic: true,
        maxAge: 3600,
        indexHTML: true,
        enableDecodeURI: true,
    }));


    // server.set('view engine', 'html');
    // server.set('views', browserDistFolder);
    // server.set('trust proxy', true)



    // server.use(express.urlencoded({ limit: '3mb', extended: false }));
    // server.use(express.json({ limit: '3mb' })) // To pars

    // const airouter = new SyncAIapis()

    // server.use('/', airouter.router)

    // *PWA Service Worker (if running in production)
    // server.use((req: any, res: any, next: any) => {
    //     if (req.url.includes('ngsw')) {
    //         res.setHeader('Service-Worker-Allowed', '/')
    //     }
    //     next()
    // })

    // Example Express Rest API endpoints
    // server.get('/api/**', (req, res) => { });
    // Serve static files from /browser
    // server.get('*.*', express.static(browserDistFolder, {
    //     maxAge: '1y',
    //     index: 'index.html',
    // }))

    // All regular routes use the Angular engine **
    server.get('/*', async (c) => {
        const res = await angularAppEngine.handle(c.request, { server: 'elysia' });
        return res || undefined;
    });

    console.warn('Elysia server started')

    return server;
}

function run(): void {
    const port = process.env['PORT'] || 4000;
    const host = process.env['HOST'] || 'localhost';
    // Start up the Node server
    const server = serveapp()
    if (isMainModule(import.meta.url)) {
        const port = process.env['PORT'] || 4000;

        server.listen(port, () => {
            console.log(`Elysia server listening on http://${host}:${port}`);
        });
    }
    // server.on('upgrade', proxyAnthropic.upgrade); // <-- subscribe to http 'upgrade'
}


if (process.env['PRODUCTION'] === 'false') {
    run()
}
// export const app:express.Application  = serveapp()
// export const app = createRequestHandler(serveapp().fetch)
