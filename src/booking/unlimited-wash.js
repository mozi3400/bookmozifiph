import { validateContactForm } from './contact.js';
import { api, esc, money } from './shared.js';

export function openUnlimitedWashForm(openDialog, plans) {
  const requestKey = crypto.randomUUID();
  const dialog = openDialog(`<div data-unlimited-wash>
    <h2 id="unlimited-wash-title" tabindex="-1" autofocus>Unlimited Car Wash</h2>
    <p class="bk-muted">Join Halon’s Unlimited Car Spa Club. Introductory rates are limited to 60 slots. Halon will contact you to confirm availability and payment.</p>
    <form>
      <label class="bk-field">Name<input name="name" autocomplete="name" maxlength="120" required></label>
      <div class="bk-grid2">
        <label class="bk-field">Philippine mobile number<input type="tel" name="mobile" autocomplete="tel" placeholder="0917 123 4567" maxlength="30" required></label>
        <label class="bk-field">Number of vehicles<input type="number" name="vehicleCount" min="1" max="2147483647" step="1" inputmode="numeric" required></label>
      </div>
      <fieldset class="bk-resource-field bk-unlimited-plans">
        <legend>Choose a subscription</legend>
        ${plans.map(plan => `<label class="bk-resource-card bk-unlimited-plan">
          <input class="bk-sr" type="radio" name="planId" value="${esc(plan.id)}" required>
          <span><strong>${esc(plan.wheels)} wheels · ${esc(plan.months)} ${plan.months === 1 ? 'month' : 'months'}</strong>
            <span class="bk-unlimited-rate">${money(plan.monthlyCents)}/month${plan.months > 1 ? ` · ${money(plan.monthlyCents * plan.months)} total` : ''}</span>
            ${plan.extras ? `<small>${esc(plan.extras)}</small>` : ''}</span>
        </label>`).join('')}
      </fieldset>
      <p class="bk-muted">Plans include Halon’s Package 1 Premium Wash. Redeem washes Monday to Friday.</p>
      <label class="bk-unlimited-consent"><input type="checkbox" name="consent" required> <span>I agree that Halon may use my name and mobile number to process this request and contact me about it.</span></label>
      <p class="bk-form-error" role="alert"></p>
      <div class="bk-dialog-actions"><button type="submit" class="bk-button bk-button-primary">Send request</button></div>
    </form></div>`);
  dialog.setAttribute('aria-labelledby', 'unlimited-wash-title');
  const form = dialog.querySelector('form');
  const errorMessage = form.querySelector('[role=alert]');
  const submit = form.querySelector('button[type=submit]');
  const close = dialog.querySelector('.bk-close');
  dialog.addEventListener('cancel', event => { if (submit.disabled && form.isConnected) event.preventDefault(); });
  form.onsubmit = async event => {
    event.preventDefault();
    if (submit.disabled || !validateContactForm(form)) return;
    const data = new FormData(form);
    errorMessage.textContent = '';
    submit.disabled = close.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const { reference } = await api('/public/booking/halon/unlimited-wash', 'POST', {
        requestKey, name: data.get('name'), mobile: data.get('mobile'),
        vehicleCount: Number(data.get('vehicleCount')), planId: data.get('planId'), consent: data.has('consent'),
      });
      dialog.querySelector('[data-unlimited-wash]').innerHTML = `
        <h2 id="unlimited-wash-title" tabindex="-1">Request received</h2>
        <p>Halon will contact you to confirm your subscription.</p>
        <p class="bk-muted">Reference ${esc(reference)}</p>`;
      dialog.querySelector('#unlimited-wash-title').focus();
    } catch (error) {
      errorMessage.textContent = error.message;
      submit.focus();
    } finally {
      submit.disabled = close.disabled = false;
      submit.textContent = 'Send request';
    }
  };
}
