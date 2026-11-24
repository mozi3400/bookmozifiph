import { api, dayLabel, duration, esc, money, privateKey, timeLabel, today } from './shared.js';

const focusNames = { nails:'Nails & foot care', lashes:'Lashes & nails', rest:'Massage & relaxation', skin:'Facial care', body:'Body care', both:'Skin & body' };
const guideButton = (key, value, label) => `<button type="button" class="bk-package-pick" data-pack-${key}="${esc(value)}">${esc(label)}</button>`;
export function packageContents(offer) {
  const counts = new Map();
  for (const visit of offer.visits) for (const choices of visit) {
    const label = choices.length > 1 ? 'RF · '+choices.map(s => s.name).join(' or ') : choices[0]?.name || 'Unavailable service';
    counts.set(label,(counts.get(label) || 0)+1);
  }
  return [...counts].map(([label,count]) => (count > 1 ? count+' × ' : '')+label).join(' · ');
}

export function packageGuide(offers, kind, focus, current, ids) {
  const back = '<button type="button" class="bk-link" data-pack-back>Previous question</button>';
  if (!kind) return `<h3 class="bk-guide-heading">What would you like to book?</h3><div class="bk-package-choices">
    ${guideButton('kind','one','One-visit combo')}${guideButton('kind','monthly','Monthly plan')}${guideButton('kind','individual','Individual services')}</div>`;
  const candidates = offers.filter(o => kind === 'monthly' ? o.months > 0 : !o.months);
  if (!focus) return `<h3 class="bk-guide-heading">What would you like to focus on?</h3><div class="bk-package-choices">
    ${[...new Set(candidates.map(o=>o.focus))].map(f=>guideButton('focus',f,focusNames[f] || f)).join('')}${guideButton('focus','all','See all options')}</div>${back}`;
  const options = candidates.filter(o => focus === 'all' || (focus === 'relax' ? o.focus !== 'nails' : o.focus === focus));
  return `<h3 class="bk-guide-heading">${kind==='monthly'?'Choose your monthly plan':'Choose your combo'}</h3>
    <p class="bk-muted">${kind==='monthly'?'One visit per month. Book the first online and prepay the full plan at Hayfa. ':''}One CAKAO coffee of your choice at every attended visit.</p>
    ${options.map(o=>`<button class="bk-package-card" type="button" data-pack-offer="${esc(o.id)}" aria-pressed="${o.id===current?.id}">
      <span><strong>${esc(o.name)}${o.months?' · '+o.months+' months':''}</strong><b>${money(o.priceCents)}</b></span>
      <small>${esc(packageContents(o))}</small><small>${o.months?o.months+' visits · ':''}${duration(o.durationMinutes)}${o.months?' total':''} · Regular ${money(o.regularCents)} · Save ${money(o.regularCents-o.priceCents)}</small></button>`).join('')}
    ${current?.focus==='body'?'<p class="bk-muted">Your practitioner will confirm RF suitability and timing before payment.</p>':''}
    ${current?.months?`<p>First visit · ${esc(current.visits[0].map((group,i)=>group.find(s=>s.id===ids[i])?.name||group[0].name).join(' + '))}</p>`:''}
    ${back}`;
}

export const packageHeading = p => esc(p.name)+(p.months?' · '+p.months+' months':'');
export const confirmationTerms = p => p ? `<div class="bk-notice"><strong>${packageHeading(p)}</strong><p>Visit ${p.visit} of ${p.visits}. One CAKAO coffee of your choice is included at this visit.</p></div>` : '';
export function balanceView(s) {
  return `<p><strong>${packageHeading(s)}</strong></p><p>${s.paid?'Paid':'Awaiting payment'} · ${money(s.priceCents)} · ${s.used} of ${s.total} visits attended · ${s.remaining} remaining</p>
  ${s.reserved?`<p>Reserved visit · ${esc(s.reserved)}</p>`:''}${s.nextChoices?.length?'<button type="button" class="bk-button" data-package-next>Book included visit</button>':''}`;
}

// Both Pay and Book reserve included visits through the normal resource and slot checks.
export function nextVisitDialog(openDialog, status, access, resources, onBooked, services = []) {
  const staff = Boolean(access.bookingId);
  const path = staff ? '/bookings/hayfa/visit' : '/public/booking/hayfa/visit';
  const choices = status.nextChoices;
  const dateMin = [today(),status.earliestDate].sort().at(-1);
  const d = openDialog(`<h2>Book included visit ${status.nextVisit}</h2><p>${packageHeading(status)} · ${money(0)} due</p>
    <form data-included-form>${choices.map((group,i)=>`<label class="bk-field">Included service<select name="item${i}">${group.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${duration(s.durationMinutes)}</option>`).join('')}</select></label>`).join('')}
    <label class="bk-field">Professional<select name="resource"></select></label>
    <label class="bk-field">Date<input name="date" type="date" min="${dateMin}" value="${dateMin}" required></label>
    <button class="bk-button">Find available times</button></form><div data-included-times></div>
    <div class="bk-dialog-actions"><button class="bk-button bk-button-primary" data-included-confirm disabled>Confirm included visit</button></div>`);
  const f=d.querySelector('form'), times=d.querySelector('[data-included-times]'), confirm=d.querySelector('[data-included-confirm]');
  const requestKey=crypto.randomUUID(), newKey=privateKey();
  let selected='',quote=null, sequence=0;
  const values=()=>({...access,resourceId:f.elements.resource.value,date:f.elements.date.value,
    serviceIds:choices.map((_,i)=>f.elements['item'+i].value)});
  function populateResources() {
    const previous=f.elements.resource.value, ids=values().serviceIds;
    const eligible=resources.filter(r=>r.businessId==='hayfa' && r.active && ids.every(id=>services.find(s=>s.id===id)?.resourceIds.includes(r.id)));
    f.elements.resource.innerHTML='<option value="any">Any available</option>'+eligible.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    if(eligible.some(r=>r.id===previous))f.elements.resource.value=previous;
  }
  populateResources();
  const error = message => {d.querySelector('.bk-form-error').textContent=message;};
  f.onchange=e=>{if(e.target.name.startsWith('item'))populateResources();sequence++;selected='';quote=null;confirm.disabled=true;times.textContent='';error('');};
  f.onsubmit=async e=>{
    e.preventDefault();const current=++sequence;selected='';quote=null;confirm.disabled=true;error('');times.textContent='Finding times…';
    try {const result=await api(path,'POST',{...values(),action:'availability'});if(current!==sequence)return;quote=result;
      times.innerHTML=result.slots.length?`<div class="bk-times">${result.slots.map(s=>`<button class="bk-time" data-slot="${esc(s.startsAt)}" aria-pressed="false">${timeLabel(s.startsAt)}</button>`).join('')}</div>`:'<p>No slots available. Choose another day.</p>';
      times.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{selected=b.dataset.slot;confirm.disabled=false;times.querySelectorAll('[data-slot]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
    }catch(e){if(current===sequence){times.textContent='';error(e.message);}}
  };
  confirm.onclick=async()=>{
    if(!selected||!quote)return;confirm.disabled=true;f.inert=true;times.inert=true;error('');
    try{const result=await api(path,'POST',{...values(),action:'reserve',requestKey,newKey,startsAt:selected,catalogVersion:quote.catalogVersion});
      d.close();await onBooked(result);
    }catch(e){error(e.message);confirm.disabled=false;f.inert=false;times.inert=false;}
  };
}
