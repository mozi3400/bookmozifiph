import { enabledGuide, followGuide, recommendations } from './guide-rules.js';
import { changeAnswers, contactGuideView, questionView, serviceCard } from './guide-view.js';
import { mountGuestRewards } from './rewards.js';
import { downloadConfirmation } from './confirmation.js';
import { validateContactForm } from './contact.js';
import { rememberedBookings, rememberBooking } from './history.js';
import {esc,money,today,dayLabel,timeLabel,duration,logo,previewBanner,api,privateKey,preview,servicePrice,bookingAmount,hoursText,businessHours,phoneDisplay} from './shared.js';
const root=document.querySelector('#booking-app');
let guestRemarks='',catalog=null,business=null,step=0,ids=[],resourceId='any',date=today(),slots=[],selectedTime='',loading=false,error='',guest={nickname:'',email:'',mobile:'',birthday:''},saved=null,manageKey='',requestKey=crypto.randomUUID(),key=privateKey(),availabilityVersion=null,availabilityTotal=null,availabilitySequence=0,serviceCategory='';
let guideTrail = [], guidePending = '';
const chosenDetails = new Map(), guidedExtras = new Map();
const names=['Services','Date & time','Your details','Review'];
const selected=()=>ids.map(id=>catalog.services.find(s=>s.id===id)).filter(Boolean);
const total=()=>selected().reduce((n,s)=>n+s.priceCents,0);
const minutes=()=>selected().reduce((n,s)=>n+s.durationMinutes,0);
const compatible=()=>catalog.resources.filter(r=>r.businessId===business?.id&&selected().every(s=>s.itemKind==='product'||s.resourceIds.includes(r.id)));
function header(){return `${previewBanner()}<header class="bk-header bk-shell">${logo()}<button class="bk-link" data-action="manage">Manage booking &amp; access to loyalty points</button></header>`;}
function summary(){return `<aside class="bk-summary"><h3 class="bk-summary-heading">${esc(business.name)}</h3><div class="bk-summary-items">${selected().map(s=>`<div class="bk-summary-line"><span>${esc(s.name)}<br><span class="bk-muted">${s.itemKind==='product'?'1 item':'Duration: '+duration(s.durationMinutes)}</span></span><span>${servicePrice(s)}</span></div>`).join('')}${selectedTime?`<p class="bk-muted" style="margin:20px 0 0;font-size:.875rem">${dayLabel(selectedTime)} · ${timeLabel(selectedTime)} · ${duration(minutes())}</p>`:''}</div><div class="bk-total"><span>Total</span><span>${bookingAmount(total(),selected())}</span></div><p class="bk-muted" style="font-size:.8125rem;margin-bottom:0">Pay on site</p></aside>`;}
function render(){
 if(!catalog){root.innerHTML=`${header()}<main class="bk-shell"><p class="${error?'bk-error':'bk-loading'}" role="${error?'alert':'status'}">${esc(error||'Getting things ready…')}</p>${error?'<button class="bk-button" data-action="reload">Retry</button>':''}</main>`;bind();return;}
 if(saved){renderSaved();return;}
 if(!business){root.innerHTML=`${header()}<main class="bk-shell bk-home bk-enter"><h1>Make time for<br>something good.</h1><div class="bk-home-intro"><p class="bk-muted">Book your appointment below</p><p class="bk-payment-note">We accept QRPH (Gcash, Maya) and Debit/Credit Cards Payment</p></div>${error?`<p class="bk-error" role="alert">${esc(error)}</p>`:''}${['laugh-tale','halon','hayfa'].map(id=>catalog.businesses.find(b=>b.id===id)).filter(Boolean).map(b=>`<article class="bk-business-row"><button class="bk-business" data-business="${esc(b.id)}" ${b.published?'':'disabled'}><div><h2>${esc(b.name)}</h2>${b.published?'':'<span class="bk-soon">Online booking coming soon</span>'}</div><span class="bk-chevron" aria-hidden="true"></span></button><div class="bk-business-links">${b.facebookUrl?`<a href="${esc(b.facebookUrl)}" target="_blank" rel="noopener noreferrer">Facebook</a>`:''}${b.mapsUrl?`<a href="${esc(b.mapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps</a>`:''}${b.phone?`<a href="tel:${esc(b.phone)}">${esc(phoneDisplay(b.phone))}</a>`:''}<button class="bk-link" data-action="hours" data-hours-business="${esc(b.id)}">Operating hours</button></div><p class="bk-hours-summary">${esc(businessHours(b))}</p></article>`).join('')}</main>`;bind();return;}
 const view = step === 0 ? servicesView() : {
   html: [null, timeView, guestView, reviewView][step](),
   action: 'continue', label: step === 3 ? 'Confirm booking' : 'Continue', disabled: step === 1 && !selectedTime,
 };
 root.innerHTML = `${header()}<main class="bk-shell bk-flow bk-stage-${step}">
   <button class="bk-link bk-back" data-action="back">Back</button>
   <h1 class="bk-title">${esc(business.name)}</h1>
   <p class="bk-muted" style="font-size:.875rem">${esc(business.address)}</p>
   <nav class="bk-steps" aria-label="Booking steps">${names.map((name, i) => `<button class="bk-step" data-step="${i}" ${i > step ? 'disabled' : ''} ${i === step ? 'aria-current="step"' : ''}>${name}</button>`).join('')}</nav>
   <div class="bk-layout bk-enter"><section class="bk-panel">
     <h2>${['Choose your services', 'Find your moment', 'A few details', 'One last look'][step]}</h2>
     ${error ? `<p class="bk-error" role="alert">${esc(error)}</p>` : ''}${view.html}
   </section>${summary()}</div>
   <div class="bk-mobile-action bk-actions"><div class="bk-mobile-only"><small>Duration: ${duration(minutes())}</small><strong>${bookingAmount(total(), selected())}</strong></div>
     <button class="bk-button bk-button-primary" data-action="${view.action}" ${loading || view.disabled ? 'disabled' : ''}>${loading ? 'Please wait…' : view.label}</button>
   </div></main>`;
 bind();
}

function guideNextLabel(question, chosen) {
  const answer = question?.answers.find(item => item.id === chosen);
  return answer && answer.next.type !== 'question' ? 'See recommendations' : 'Next question';
}

function servicesView() {
  const definition = enabledGuide(business.serviceGuide);
  const items = catalog.services.filter(service => service.businessId === business.id);
  const services = items.filter(service => service.itemKind !== 'product');
  const categories = [...new Set(services.map(service => service.category))];
  const requested = serviceCategory || (definition ? 'guide' : 'all');
  const guided = requested === 'guide' && definition;
  const activeCategory = categories.find(category => 'category:' + category === requested);
  const mode = guided ? 'guide' : activeCategory ? 'category:' + activeCategory : 'all';
  const options = [...(definition ? [['guide', 'Help me suggest']] : []), ['all', 'All services'],
    ...categories.map(category => ['category:' + category, category])];
  const menu = `<label class="bk-field bk-service-category">Category<select id="service-category">
    ${options.map(([value, label]) => `<option value="${esc(value)}" ${value === mode ? 'selected' : ''}>${esc(label)}</option>`).join('')}
  </select></label>`;
  let html, visibleItems;
  const view = { action: 'continue', label: 'Continue', disabled: !ids.length };
  const cards = (entries, extra = false) => entries.map(service => serviceCard(service, ids.includes(service.id), extra)).join('');
  if (guided) {
    const path = followGuide(definition, guideTrail);
    const resources = catalog.resources.filter(resource => resource.businessId === business.id);
    visibleItems = [];
    if (path.type === 'question') {
      html = questionView(path.question, guidePending, path.used > 0);
      Object.assign(view, { action: 'guide-next', label: guideNextLabel(path.question, guidePending), disabled: !path.question.answers.some(answer => answer.id === guidePending) });
    } else if (path.type === 'contact') {
      html = contactGuideView(business);
      Object.assign(view, { action: 'browse-all', label: 'Browse all services', disabled: false });
    } else {
      const { mainServices, addOns } = recommendations(definition, path, items, resources, ids);
      visibleItems = [...mainServices, ...addOns];
      const matches = mainServices.length > 0;
      html = `<h3 class="bk-guide-heading" id="guide-heading" tabindex="-1">${matches ? 'Recommended services' : 'No matching services'}</h3>
        ${matches ? '' : '<p class="bk-muted">Try different answers or browse the full catalog.</p>'}${changeAnswers}
        ${cards(mainServices)}${addOns.length ? `<h3 class="bk-category">Optional add-ons</h3>${cards(addOns, true)}` : ''}`;
      if (!matches) Object.assign(view, { action: 'browse-all', label: 'Browse all services', disabled: false });
    }
  } else {
    const manual = activeCategory ? services.filter(service => service.category === activeCategory) : services;
    const products = items.filter(service => service.itemKind === 'product');
    visibleItems = [...manual, ...products];
    const groups = activeCategory ? [activeCategory] : categories;
    html = groups.map(category => `<h3 class="bk-category">${esc(category)}</h3>${cards(manual.filter(service => service.category === category))}`).join('');
    if (!manual.length) html = '<p class="bk-muted">No services are available in this category.</p>';
    if (products.length) html += `<h3 class="bk-category">Add products to your visit <span class="bk-muted">Optional</span></h3>
      <p class="bk-muted" style="font-size:.875rem">Reserve one of each selected item. Collect and pay on site.</p>${cards(products)}`;
  }
  const visibleIds = new Set(visibleItems.map(service => service.id));
  const hiddenChoices = ids.filter(id => !visibleIds.has(id));
  const retained = hiddenChoices.length ? `<section class="bk-guide-retained" aria-labelledby="guide-retained-title">
    <h3 id="guide-retained-title">Selected for this visit</h3>
    ${hiddenChoices.map(id => {
      const current = items.find(service => service.id === id);
      const name = current?.name || chosenDetails.get(id) || 'Unavailable item';
      return `<div class="bk-guide-retained-row"><span>${esc(name)}${current ? '' : ' · Unavailable'}</span>
        <button type="button" class="bk-link" data-remove-service="${esc(id)}" aria-label="Remove ${esc(name)}">Remove</button></div>`;
    }).join('')}</section>` : '';
  return { ...view, html: `${guided ? '' : '<p class="bk-muted">Select one or more services for the same visit.</p>'}${menu}${retained}${html}` };
}

function renderGuide() {
  error = '';
  render();
  root.querySelector('#guide-heading')?.focus();
}

function bindServiceGuide() {
  const definition = enabledGuide(business?.serviceGuide);
  const path = followGuide(definition, guideTrail);
  const next = root.querySelector('[data-action=guide-next]');
  root.querySelectorAll('[name=guide-answer]').forEach(input => input.onchange = () => {
    guidePending = input.value;
    next.textContent = guideNextLabel(path.question, guidePending);
    next.disabled = false;
  });
  root.querySelector('[data-guide-back]')?.addEventListener('click', () => {
    guideTrail = guideTrail.slice(0, path.used);
    guidePending = guideTrail.pop() || '';
    renderGuide();
  });
  next?.addEventListener('click', () => {
    if (!path.question?.answers.some(answer => answer.id === guidePending)) return;
    guideTrail = [...guideTrail.slice(0, path.used), guidePending];
    guidePending = '';
    renderGuide();
  });
  root.querySelector('[data-action=browse-all]')?.addEventListener('click', () => {
    serviceCategory = 'all';
    render();
    root.querySelector('#service-category')?.focus();
  });
  root.querySelectorAll('input[name=service]').forEach(input => input.onchange = () => {
    if (input.checked) {
      if (!ids.includes(input.value)) ids.push(input.value);
      chosenDetails.set(input.value, catalog.services.find(service => service.id === input.value)?.name);
      if (input.hasAttribute('data-guide-extra')) guidedExtras.set(input.value, path.serviceIds);
    } else removeService(input.value);
    selectedTime = '';
    error = '';
    render();
    root.querySelector(`input[name=service][value="${CSS.escape(input.value)}"]`)?.focus({ preventScroll: true });
  });
  root.querySelectorAll('[data-remove-service]').forEach(button => button.onclick = () => {
    removeService(button.dataset.removeService);
    selectedTime = '';
    error = '';
    render();
    (root.querySelector('[data-remove-service]') || root.querySelector('#service-category'))?.focus({ preventScroll: true });
  });
}

function removeService(id) {
  ids = ids.filter(chosen => chosen !== id);
  guidedExtras.delete(id);
  chosenDetails.delete(id);
}

function resetServiceSelection() {
  ids = [];
  chosenDetails.clear();
  guidedExtras.clear();
  serviceCategory = '';
  guideTrail = [];
  guidePending = '';
  resourceId = 'any';
  selectedTime = '';
}

function selectionProblem() {
  const items = selected();
  if (items.length !== ids.length) return 'Remove unavailable items from your selection before continuing.';
  if (!items.some(item => item.itemKind !== 'product')) return 'Choose an appointment service before adding products.';
  const requiredMain = items.find(item => {
    const allowedMain = guidedExtras.get(item.id);
    return item.addonFor?.length && !item.addonFor.some(id => ids.includes(id)) ||
      allowedMain && !allowedMain.some(id => ids.includes(id));
  });
  if (requiredMain) return `Choose a compatible main service for ${requiredMain.name}, or remove the add-on.`;
  const included = enabledGuide(business.serviceGuide)?.includedAddOns ?? [];
  const duplicate = items.find(item => guidedExtras.has(item.id) &&
    included.some(rule => ids.includes(rule.mainServiceId) && rule.addOnIds.includes(item.id)));
  if (duplicate) return `${duplicate.name} is already included. Remove the separate add-on to continue.`;
  if (!compatible().length) return 'These services need different bays or professionals. Please book them separately.';
  return '';
}
function timeView(){return `<fieldset class="bk-resource-field"><legend>${business.id==='halon'?'Bay':'Professional'}</legend><div class="bk-resource-options">${[{id:'any',name:'Any available'},...compatible()].map(r=>`<label class="bk-resource-card"><input class="bk-sr" type="radio" name="resource-choice" value="${esc(r.id)}" ${resourceId===r.id?'checked':''}><span>${esc(r.name)}</span></label>`).join('')}</div></fieldset><label class="bk-field bk-service-category">Date<input id="booking-date" type="date" min="${today()}" max="${new Date(Date.now()+business.horizonDays*86400000).toISOString().slice(0,10)}" value="${date}"></label><h3>${dayLabel(date)}</h3>${loading?'<p class="bk-loading" role="status">Finding available times…</p>':`<div class="bk-times">${slots.map(s=>`<button class="bk-time" data-time="${s.startsAt}" aria-pressed="${selectedTime===s.startsAt}">${timeLabel(s.startsAt)}</button>`).join('')}</div>${!slots.length?'<p class="bk-notice">No times available on this date. Try another date or choose Any available.</p>':''}`}${error?'<button class="bk-button" data-action="retry-times">Retry availability</button>':''}`;}
function guestView(){return `<form id="guest-form"><label class="bk-field">Nickname<input name="nickname" value="${esc(guest.nickname)}" required maxlength="60" autocomplete="nickname"></label><label class="bk-field">Email address<input name="email" type="email" value="${esc(guest.email)}" required maxlength="254" autocomplete="email"></label><div class="bk-grid2"><label class="bk-field">Mobile <span>Optional</span><input name="mobile" type="tel" value="${esc(guest.mobile)}" maxlength="30" autocomplete="tel" inputmode="tel" placeholder="09XX XXX XXXX"></label><label class="bk-field">Birthday <span>Optional</span><input name="birthday" type="date" value="${esc(guest.birthday)}" max="${today()}" autocomplete="bday"></label></div><p class="bk-muted" style="font-size:.875rem">Your details help our team manage your appointment and visit history. No account needed.</p></form>`;}
function reviewView(){return `<p class="bk-muted">Everything look good? Your time will be reserved immediately.</p><div class="bk-detail"><span>When</span><span>${dayLabel(selectedTime)}<br>${timeLabel(selectedTime)} · ${duration(minutes())}</span></div><div class="bk-detail"><span>${business.id==='halon'?'Bay':'Professional'}</span><span>${esc(catalog.resources.find(r=>r.id===resourceId)?.name||'Any available')}</span></div><div class="bk-detail"><span>Guest</span><span>${esc(guest.nickname)}<br>${esc(guest.email)}${guest.mobile?'<br>'+esc(guest.mobile):''}</span></div>${selected().map(s=>`<div class="bk-detail"><span>${esc(s.name)}</span><span>${servicePrice(s)}</span></div>`).join('')}<div class="bk-total"><span>Total</span><span>${bookingAmount(total(),selected())}</span></div><label class="bk-field bk-guest-remarks">Remarks <span>Optional</span><textarea id="guest-remarks" name="guestRemarks" rows="3" maxlength="5000" placeholder="Any special instructions for your appointment?" aria-describedby="guest-remarks-help" ${loading?'disabled':''}>${esc(guestRemarks)}</textarea><small id="guest-remarks-help" class="bk-muted">Up to 5,000 characters. Shared with the team handling your booking.</small></label><p class="bk-notice">No online payment. Use your email in Manage booking to find visits saved in this browser. We won’t send an email or text.</p>`;}
function remember(){const form=root.querySelector('#guest-form');if(form)guest={...guest,...Object.fromEntries(new FormData(form))};}
function bind(){
 const remarks=root.querySelector('#guest-remarks');if(remarks)remarks.oninput=()=>{guestRemarks=remarks.value;};
 root.querySelectorAll('[data-business]').forEach(b=>b.onclick=()=>{business=catalog.businesses.find(x=>x.id===b.dataset.business);resetServiceSelection();step=0;error='';render();});
 root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{remember();step=Number(b.dataset.step);error='';render();if(step===1)loadTimes();});
 bindServiceGuide();
 root.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{selectedTime=b.dataset.time;render();});
 const category=root.querySelector('#service-category');if(category)category.onchange=()=>{serviceCategory=category.value;error='';render();root.querySelector('#service-category')?.focus({preventScroll:true});};const d=root.querySelector('#booking-date'),r=root.querySelector('#resource');if(d)d.onchange=()=>{if(!d.value)return;date=d.value;selectedTime='';loadTimes();};root.querySelectorAll('[name=resource-choice]').forEach(input=>input.onchange=()=>{resourceId=input.value;selectedTime='';loadTimes(true);});
 root.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{const a=b.dataset.action;if(a==='hours')return hoursDialog(catalog.businesses.find(x=>x.id===b.dataset.hoursBusiness));if(a==='reload')return init();if(a==='manage')return manageDialog();if(a==='retry-times')return loadTimes();if(a==='download-confirmation'){b.disabled=true;const label=b.textContent;b.textContent='Preparing JPEG…';try{await downloadConfirmation(saved,business,catalog.resources.find(r=>r.id===saved.resourceId));}catch(e){const message=document.createElement('p');message.className='bk-error';message.setAttribute('role','alert');message.textContent=e.message;b.closest('.bk-success').append(message);}finally{b.disabled=false;b.textContent=label;}return;}if(a==='copy-link'){try{await navigator.clipboard.writeText(manageLink());b.textContent='Copied';}catch{b.textContent='Select and copy the link below';}return;}if(a==='new'){guestRemarks='';saved=null;business=null;step=0;resetServiceSelection();requestKey=crypto.randomUUID();key=privateKey();history.replaceState(null,'',location.pathname);render();return;}if(a==='back'){remember();if(step)step--;else business=null;error='';render();return;}if(a==='continue')return advance();});
}
async function loadTimes(focusResource = false) {
  const sequence = ++availabilitySequence;
  const businessId = business.id;
  const isCurrent = () => sequence === availabilitySequence && step === 1 && business?.id === businessId;
  loading = true; error = ''; render();
  try {
    const refreshed = await api('/public/booking/catalog');
    if (!isCurrent()) return;
    catalog = refreshed;
    business = catalog.businesses.find(item => item.id === businessId);
    if (!business?.published) {
      business = null; step = 0;
      error = 'This business is no longer accepting bookings online.';
      return;
    }
    if (selected().length !== ids.length) {
      step = 0;
      error = 'Some selected items are no longer available. Remove them before continuing.';
      return;
    }
    const result = await api('/public/booking/availability', 'POST', { businessId, serviceIds: ids, resourceId, date });
    if (!isCurrent()) return;
    slots = result.slots.filter(slot => new Date(slot.startsAt).getUTCMinutes() === 0);
    availabilityVersion = result.catalogVersion;
    availabilityTotal = result.totalCents;
  } catch (problem) {
    if (isCurrent()) { error = problem.message; slots = []; }
  } finally {
    if (sequence === availabilitySequence) {
      loading = false; render();
      if (focusResource && step === 1) root.querySelector('[name=resource-choice]:checked')?.focus({ preventScroll: true });
    }
  }
}
async function advance(){
 if(loading)return;error='';
 if (step === 0) {
   if (!ids.length) return;
   error = selectionProblem();
   if (error) { render(); root.querySelector('.bk-error')?.scrollIntoView({ block: 'center' }); return; }
   resourceId = 'any'; selectedTime = ''; step = 1;
   return loadTimes();
 }
 if(step===1){if(!selectedTime)return;step=2;render();return;}
 if(step===2){const form=root.querySelector('#guest-form');if(!validateContactForm(form))return;remember();step=3;render();return;}
 loading=true;render();try{const result=await api('/public/booking/reserve','POST',{businessId:business.id,serviceIds:ids,resourceId,startsAt:selectedTime,...guest,guestRemarks,requestKey,manageKey:key,catalogVersion:availabilityVersion,totalCents:availabilityTotal});saved=result.booking;manageKey=result.manageKey;history.replaceState(null,'',manageLink());render();window.scrollTo({top:0,behavior:'instant'});}catch(e){error=e.message;}finally{loading=false;render();}
}
function manageLink(){return `${location.origin}${location.pathname}#manage=${encodeURIComponent(saved.reference)}&key=${manageKey}`;}
function renderSaved(){
 const historySaved=rememberBooking(saved,manageKey);
 business=catalog.businesses.find(b=>b.id===saved.businessId);root.innerHTML=`${header()}<main class="bk-shell"><section class="bk-success bk-enter"><div class="bk-confirmation" aria-hidden="true">✓</div><h1>${saved.status==='confirmed'?'You’re booked.':saved.status==='cancelled'?'Booking cancelled.':'Your booking.'}</h1><p class="bk-muted">${esc(business?.name||'')}<br>Reference ${esc(saved.reference)}</p><div class="bk-detail"><span>Date & time</span><span>${dayLabel(saved.startsAt)}<br>${timeLabel(saved.startsAt)}</span></div><div class="bk-detail"><span>${business?.id==='halon'?'Bay':'Professional'}</span><span>${esc(catalog.resources.find(r=>r.id===saved.resourceId)?.name||'Assigned resource')}</span></div>${business?.phone?`<div class="bk-detail"><span>Contact business</span><span><a href="tel:${esc(business.phone)}">${esc(phoneDisplay(business.phone))}</a></span></div>`:''}<div class="bk-detail"><span>Guest</span><span>${esc(saved.nickname)}</span></div>${saved.items.map(i=>`<div class="bk-detail"><span>${esc(i.name)}</span><span>${servicePrice(i)}</span></div>`).join('')}<div class="bk-total"><span>Total</span><span>${bookingAmount(saved.totalCents,saved.items)}</span></div><p class="bk-muted">Status: ${esc(saved.status.replace('_',' '))}</p><div class="bk-notice"><strong>${historySaved?'Saved in this browser.':'Bookmark this booking page.'}</strong><p style="margin:8px 0 12px">${historySaved?'Enter your email in Manage booking to see your active bookings and history here. On another device, use the browser you booked with.':'Your browser could not save booking history. Bookmark this page to return to this appointment.'}</p><div class="bk-confirmation-actions"><button class="bk-button" data-action="manage">Manage my bookings</button><button class="bk-button" data-action="download-confirmation">Download confirmation (JPEG)</button></div></div>${saved.status==='confirmed'?'<div class="bk-actions"><button class="bk-button" id="reschedule">Reschedule</button><button class="bk-button bk-button-danger" id="cancel-booking">Cancel booking</button></div>':''}<div class="bk-actions"><button class="bk-link" data-action="new">Book another visit</button></div></section></main>`;bind();const cancel=root.querySelector('#cancel-booking'),reschedule=root.querySelector('#reschedule');if(cancel)cancel.onclick=cancelDialog;if(reschedule)reschedule.onclick=rescheduleDialog;
}
function openDialog(html){document.querySelector('.bk-dialog')?.remove();const d=document.createElement('dialog');d.className='bk-dialog';d.innerHTML=`<button class="bk-close" aria-label="Close">×</button>${html}<p class="bk-form-error" role="alert"></p>`;document.body.append(d);d.querySelector('.bk-close').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();return d;}
function dialogError(d,e){d.querySelector('.bk-form-error').textContent=e.message;}
function manageDialog(){
 const d=openDialog('<h2>Bookings & rewards</h2><p class="bk-muted">Enter your nickname and email for your points. Booking history still uses bookings saved in this browser.</p><div id="guest-rewards"></div><div id="guest-history" aria-live="polite"></div>');
 const target=d.querySelector('#guest-rewards');mountGuestRewards(target,{nickname:saved?.nickname||guest.nickname,email:saved?.email||guest.email});
 target.addEventListener('rewards-identity',async e=>{const email=e.detail.email.trim().toLowerCase(),accesses=rememberedBookings(email),list=d.querySelector('#guest-history');list.innerHTML='<p class="bk-loading">Finding your bookings…</p>';try{
 const {bookings}=accesses.length?await api('/public/booking/history','POST',{email,accesses:accesses.map(({reference,manageKey})=>({reference,manageKey}))}):{bookings:[]};if(!d.isConnected)return;
 const active=bookings.filter(x=>x.status==='confirmed'&&+new Date(x.startsAt)>=Date.now()),historical=bookings.filter(x=>!active.includes(x));
 const section=(title,rows)=>`<h3>${title} (${rows.length})</h3>${rows.length?rows.map(x=>`<button type="button" class="bk-history-record" data-reference="${esc(x.reference)}"><strong>${esc(catalog.businesses.find(b=>b.id===x.businessId)?.name||'Booking')}</strong><span>${dayLabel(x.startsAt)} · ${timeLabel(x.startsAt)} · ${esc(x.status)}</span><span>${x.items.map(i=>esc(i.name)).join(' · ')}</span><span>${bookingAmount(x.totalCents,x.items)} · ${esc(x.reference)}</span></button>`).join(''):'<p class="bk-muted">No '+title.toLowerCase()+'.</p>'}`;
 list.innerHTML=section('Active bookings',active)+section('Booking history',historical);list.querySelectorAll('[data-reference]').forEach(b=>b.onclick=()=>{const x=bookings.find(x=>x.reference===b.dataset.reference),access=accesses.find(a=>a.reference===x.reference);saved=x;manageKey=access.manageKey;d.close();history.replaceState(null,'',manageLink());render();window.scrollTo({top:0,behavior:'instant'});});
 }catch(e){list.innerHTML='<p class="bk-error">'+esc(e.message)+'</p>';}});
}
function cancelDialog(){const d=openDialog('<h2>Cancel this booking?</h2><p>Your reserved time will be released for someone else.</p><button class="bk-button bk-button-danger" id="confirm-cancel">Yes, cancel booking</button>');d.querySelector('#confirm-cancel').onclick=async e=>{e.currentTarget.disabled=true;try{const result=await api('/public/booking/manage/update','POST',{reference:saved.reference,manageKey,action:'cancel',version:saved.version});saved=result.booking;d.close();render();}catch(e){dialogError(d,e);d.querySelector('#confirm-cancel').disabled=false;}};}
function rescheduleDialog(){const d=openDialog(`<h2>Choose a new time</h2><label class="bk-field">Date<input id="new-date" type="date" min="${today()}" value="${localDate(saved.startsAt)}"></label><div id="new-times"></div><div class="bk-dialog-actions"><button class="bk-button bk-button-primary" id="save-time" disabled>Confirm new time</button></div>`);let time='';const load=async()=>{d.querySelector('#new-times').innerHTML='<p class="bk-loading" role="status">Finding times…</p>';d.querySelector('#save-time').disabled=true;try{const result=await api('/public/booking/manage/availability','POST',{reference:saved.reference,manageKey,date:d.querySelector('#new-date').value,resourceId:saved.resourceId});if(!d.isConnected)return;d.querySelector('#new-times').innerHTML=`<div class="bk-times">${result.slots.filter(s=>new Date(s.startsAt).getUTCMinutes()===0).map(s=>`<button class="bk-time" data-new="${s.startsAt}" aria-pressed="false">${timeLabel(s.startsAt)}</button>`).join('')}</div>${!result.slots.length?'<p>No times available. Try another date.</p>':''}`;d.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{time=b.dataset.new;d.querySelectorAll('[data-new]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));d.querySelector('#save-time').disabled=false;});}catch(e){dialogError(d,e);d.querySelector('#new-times').innerHTML='';}};d.querySelector('#new-date').onchange=load;d.querySelector('#save-time').onclick=async e=>{e.currentTarget.disabled=true;try{const result=await api('/public/booking/manage/update','POST',{reference:saved.reference,manageKey,action:'reschedule',startsAt:time,resourceId:saved.resourceId,version:saved.version});saved=result.booking;d.close();render();}catch(e){dialogError(d,e);d.querySelector('#save-time').disabled=false;}};load();}
function localDate(v){return new Date(+new Date(v)+28800000).toISOString().slice(0,10);}
async function init(){error='';render();try{catalog=await api('/public/booking/catalog');const params=new URLSearchParams(location.hash.slice(1));if(params.has('manage')){const result=await api('/public/booking/manage','POST',{reference:params.get('manage'),manageKey:params.get('key')});saved=result.booking;manageKey=params.get('key');}render();}catch(e){error=e.message;render();}}
init();

function hoursDialog(b){if(!b)return;openDialog(`<h2>${esc(b.name)}</h2><p class="bk-muted">Operating hours</p>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,i)=>`<div class="bk-detail"><span>${day}</span><span>${esc(hoursText(b.hours[i]||[]))}</span></div>`).join('')}`);}
