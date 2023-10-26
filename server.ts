import { handleGetBoard } from "./handlers/getboard";

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        switch (path) {
            case '/getBoard':
                await handleGetBoard(req);
            case '/bigBrotherIcon':
                const iconFile = Bun.file('assets/bigBrotherIcon.png');
                return new Response(iconFile);
            case '/index.html':
                const indexFile = Bun.file('frontend/html/index.html');
                return new Response(indexFile);
            case '/client.js':
                const clientFile = Bun.file('frontend/js/client.js');
                return new Response(clientFile);
            case '/settings.html':
                const settingsFile = Bun.file('frontend/html/settings.html');
                return new Response(settingsFile);
            case 'settings.css':
                const settingsCSS = Bun.file('frontend/css/settings.css');
                return new Response(settingsCSS);
            default:
                return new Response("Got something else!")
        }
    },
});


console.log(`Listening on http://localhost:${server.port} ...`);