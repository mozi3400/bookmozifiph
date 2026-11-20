import {cp,mkdir,rm} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(new URL('../src/booking/',import.meta.url),new URL('booking/',dist),{recursive:true});
await cp(new URL('../src/booking/index.html',import.meta.url),new URL('index.html',dist));
await cp(new URL('../src/assets/',import.meta.url),new URL('assets/',dist),{recursive:true});

await mkdir(new URL('booking/vendor/',dist),{recursive:true});
await cp(new URL('../node_modules/qrcode-generator/dist/qrcode.mjs',import.meta.url),new URL('booking/vendor/qrcode.mjs',dist));
