import { duration, esc, phoneDisplay, servicePrice } from './shared.js';

export function questionView(question, checkedId, canGoBack) {
  return `<fieldset class="bk-guide-question">
    <legend id="guide-heading" tabindex="-1">${esc(question.text)}</legend>
    <div class="bk-guide-answers">${question.answers.map(answer => `<label class="bk-guide-answer">
      <input class="bk-sr" type="radio" name="guide-answer" value="${esc(answer.id)}" ${answer.id === checkedId ? 'checked' : ''}>
      <span>${esc(answer.label)}</span><span class="bk-guide-check" aria-hidden="true">✓</span>
    </label>`).join('')}</div>
  </fieldset>${canGoBack ? '<button type="button" class="bk-link bk-guide-back" data-guide-back>Previous question</button>' : ''}`;
}

export const changeAnswers = '<button type="button" class="bk-link bk-guide-back" data-guide-back>Change answers</button>';

export function contactGuideView(business) {
  return `<h3 class="bk-guide-heading" id="guide-heading" tabindex="-1">Contact ${esc(business.id === 'hayfa' ? 'Hayfa' : business.name)}</h3>
    <p class="bk-muted">The team can help you choose a service and arrange your visit.</p>
    ${business.phone ? `<a class="bk-button bk-guide-contact" href="tel:${esc(business.phone)}">Call ${esc(phoneDisplay(business.phone))}</a>` : ''}
    ${changeAnswers}`;
}

export function serviceCard(service, checked, extra = false) {
  const product = service.itemKind === 'product';
  return `<label class="bk-service">
    <input type="checkbox" name="service" value="${esc(service.id)}" ${checked ? 'checked' : ''} ${extra ? 'data-guide-extra' : ''}>
    <span class="bk-service-name"><strong>${esc(service.name)}</strong>
      <small>${product ? '1 item · No extra appointment time' : duration(service.durationMinutes)}</small>
      ${service.description && checked ? `<small class="bk-service-description">${esc(service.description)}</small>` : ''}
    </span>
    <span class="bk-service-price">${esc(servicePrice(service))}</span>
  </label>`;
}
