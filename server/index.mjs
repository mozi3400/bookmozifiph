import {createApp} from './app.mjs';
const server=createApp();
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Book Mozifi is ready.'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
