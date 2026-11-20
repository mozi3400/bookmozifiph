import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createApp} from '../server/app.mjs';
async function start(server){await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;}
async function stop(server){await new Promise(r=>server.close(r));}
test('serves production guest assets and never staff or finance files',async()=>{
 const server=createApp();const base=await start(server);
 try{
  const home=await fetch(base);assert.equal(home.status,200);const html=await home.text();assert.ok(html.includes('/booking/public.js'));assert.ok(!html.includes('data-preview="true"'));
  assert.equal((await fetch(base+'/booking/public.js')).status,200);
  assert.equal((await fetch(base+'/assets/LibreCaslonText-Variable.ttf')).status,200);
  for(const path of ['/booking/admin.html','/booking/admin.js','/booking/catalog.json','/.env','/server/app.mjs','/api/state','/api/login','/api/bookings/state','/api/loyalty/state','/api/loyalty/checkout'])assert.equal((await fetch(base+path)).status,404,path);
  assert.equal((await fetch(base+'/health')).status,200);
 }finally{await stop(server);}
});
test('forwards public requests once, preserves origin and drops sensitive request/response headers',async()=>{
 const calls=[];const upstream=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push({url:req.url,headers:req.headers,body});res.writeHead(req.method==='POST'?409:200,{'Content-Type':'application/json','Set-Cookie':'staff=must-not-pass'});res.end(JSON.stringify({error:'Slot is unavailable.'}));});
 const backend=await start(upstream);const app=createApp({PAY_BACKEND_URL:backend,PUBLIC_URL:'https://book.mozifi.ph'});const base=await start(app);
 try{
  const response=await fetch(base+'/api/public/booking/reserve',{method:'POST',headers:{Origin:'https://book.mozifi.ph','Content-Type':'application/json',Cookie:'staff=secret',Authorization:'Bearer secret'},body:JSON.stringify({businessId:'halon',requestKey:'unique-id'})});
  assert.equal(response.status,409);assert.equal(response.headers.get('set-cookie'),null);assert.equal((await response.json()).error,'Slot is unavailable.');assert.equal(calls.length,1);assert.equal(calls[0].headers.cookie,undefined);assert.equal(calls[0].headers.authorization,undefined);assert.equal(calls[0].headers.origin,'https://book.mozifi.ph');assert.equal(JSON.parse(calls[0].body).requestKey,'unique-id');
  await fetch(base+'/api/public/booking/catalog');assert.equal(calls.length,2);
  const post=(path,body='{}',headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
  assert.equal((await post('/api/public/booking/reserve','{}',{Origin:'https://evil.example'})).status,403);
  assert.equal((await post('/api/public/booking/catalog')).status,405);
  assert.equal((await post('/api/public/booking/reserve','not json')).status,400);
  assert.equal((await post('/api/public/booking/reserve','"'+'x'.repeat(65536)+'"')).status,413);
  assert.equal((await post('/api/public/booking/unknown')).status,404);
  assert.equal(calls.length,2);
 }finally{await stop(app);await stop(upstream);}
});
test('backend errors are visible and unsafe production configuration fails closed',async()=>{
 assert.throws(()=>createApp({NODE_ENV:'production',PAY_BACKEND_URL:'http://localhost'}),/HTTPS/);
 assert.throws(()=>createApp({PAY_BACKEND_URL:'https://name:password@example.com'}),/without credentials/);
 const upstream=createServer((_req,res)=>{res.writeHead(302,{Location:'https://example.com'});res.end();});const backend=await start(upstream);const app=createApp({PAY_BACKEND_URL:backend});const base=await start(app);
 try{const response=await fetch(base+'/api/public/booking/catalog');assert.equal(response.status,502);assert.match((await response.json()).error,/unavailable/);}finally{await stop(app);await stop(upstream);}
});
