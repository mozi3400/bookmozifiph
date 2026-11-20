export const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=v=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:2}).format(Number(v)/100);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const dayLabel=v=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',weekday:'short'}).format(new Date(v.length===10?v+'T12:00:00+08:00':v));
export const timeLabel=v=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',hour:'numeric',minute:'2-digit'}).format(new Date(v));
export const duration=v=>v>=60?`${Math.floor(v/60)}h${v%60?' '+v%60+'m':''}`:`${v} min`;
export const logo=()=>`<a class="bk-wordmark" href="https://badideas.mozifi.ph/" aria-label="Bad Ideas Ventures"><span class="bk-logo-word">bad</span><span class="bk-logo-word"><span class="bk-letter-i">ı<span></span></span>deas</span><span class="bk-logo-word">ventures</span></a>`;
export const preview=document.documentElement.dataset.preview==='true';
export async function api(path,method='GET',body){
 if(preview){const {demoAPI}=await import('./demo.js');return demoAPI(path,method,body);}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch('/api'+path,{method,credentials:'same-origin',signal:controller.signal,headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');return result;}
 catch(error){if(error.name==='AbortError')throw new Error('The connection took too long. Please try again.');throw error;}finally{clearTimeout(timer);}
}
export function privateKey(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function previewBanner(){return '';}

export function servicePrice(s){return s.priceType==='quote'?'Price on request':`${s.priceType==='starts_at'?'From ':''}${money(s.priceCents)}${s.priceType==='per_unit'?' / '+(s.unitLabel||'unit'):''}`;}
export function bookingAmount(total,items=[]){if(items.some(s=>s.priceType==='quote'))return total?'From '+money(total):'To be confirmed';return (items.some(s=>['starts_at','per_unit'].includes(s.priceType))?'From ':'')+money(total);}
export function hoursText(ranges=[]){const clock=m=>{const h=Math.floor(m/60)%24;return `${h%12||12}${m%60?':'+String(m%60).padStart(2,'0'):''} ${h<12?'AM':'PM'}`;};if(ranges.length===2&&ranges[0][0]===0&&ranges[1][1]===1440)return `${clock(ranges[1][0])}–${clock(ranges[0][1])} (next day)`;return ranges.length?ranges.map(([a,b])=>clock(a)+'–'+clock(b)).join(', '):'Closed';}
export function businessHours(b){const days=Array.from({length:7},(_,i)=>JSON.stringify(b.hours[i]||[]));return new Set(days).size===1?hoursText(b.hours[0]||[])+' daily':'View weekly hours';}

export function phoneDisplay(value=''){const local=value.startsWith('+63')?'0'+value.slice(3):value;return /^09\d{9}$/.test(local)?local.slice(0,4)+' '+local.slice(4,7)+' '+local.slice(7):local;}
