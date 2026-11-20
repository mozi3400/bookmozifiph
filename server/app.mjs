import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const routes=new Map([
 ['/api/public/booking/catalog','GET'],
 ['/api/public/booking/loyalty/status','GET'],
 ['/api/public/booking/loyalty/enroll','POST'],
 ['/api/public/booking/loyalty/lookup','POST'],
 ...['availability','reserve','history','manage','manage/availability','manage/update'].map(p=>['/api/public/booking/'+p,'POST'])
]);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
export function createApp(env=process.env){
 const backend=new URL(env.PAY_BACKEND_URL||'https://pay.mozifi.ph');
 const publicOrigin=new URL(env.PUBLIC_URL||'https://book.mozifi.ph').origin;
 if(!['http:','https:'].includes(backend.protocol)||backend.username||backend.password||backend.search||backend.hash||backend.pathname!=='/')throw new Error('PAY_BACKEND_URL must be an HTTP(S) origin without credentials.');
 if(env.NODE_ENV==='production'&&(backend.protocol!=='https:'||!publicOrigin.startsWith('https:')))throw new Error('Production requires HTTPS URLs.');
 const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
 return createServer(async(req,res)=>{
  const json=(status,error)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error}));};
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname==='/health'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok\n');return;}
   if(url.pathname.startsWith('/api/')){
    if(!routes.has(url.pathname)||url.search)return json(404,'Route not found.');
    if(req.method!==routes.get(url.pathname))return json(405,'Method not allowed.');
    if(req.headers.origin&&req.headers.origin!==publicOrigin)return json(403,'Request origin is not allowed.');
    let body;
    if(req.method==='POST'){
     if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(415,'Use application/json.');
     const chunks=[];let size=0;
     for await(const chunk of req){size+=chunk.length;if(size>65536)return json(413,'Request is too large.');chunks.push(chunk);}
     body=Buffer.concat(chunks);try{JSON.parse(body.toString());}catch{return json(400,'Invalid JSON.');}
    }
    // Only public booking requests cross this boundary. Never forward staff cookies or authorization.
    const response=await fetch(new URL(url.pathname,backend),{method:req.method,redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json',...(req.headers.origin?{Origin:req.headers.origin}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body}:{})});
    if(!response.headers.get('content-type')?.includes('application/json'))return json(502,'Booking service is unavailable. Please try again.');
    res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   if(!['GET','HEAD'].includes(req.method))return json(405,'Method not allowed.');
   const pathname=decodeURIComponent(url.pathname);const file=resolve(root,'.'+(pathname==='/'||pathname==='/book'?'/index.html':pathname));
   if(!file.startsWith(root+sep)||!mime[extname(file)])return json(404,'Not found.');
   const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){if(error.code==='ENOENT'||error.code==='ENOTDIR')return json(404,'Not found.');json(502,'Booking service is unavailable. Please try again.');}
 });
}
