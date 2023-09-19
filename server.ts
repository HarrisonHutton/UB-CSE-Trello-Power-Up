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
                return new Response(iconFile)
            default:
                return new Response("Got something else!")
        }
    },
});


console.log(`Listening on http://localhost:${server.port} ...`);