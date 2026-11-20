const invalid=(field,message)=>{throw Object.assign(new Error(message),{field,status:400});};
export function normalizeEmail(value){
 if(typeof value!=='string')invalid('email','Enter a valid email address.');
 const email=value.trim().toLowerCase(),parts=email.split('@');
 if(email.length>254||parts.length!==2)invalid('email','Enter a valid email address.');
 const [local,domain]=parts,labels=domain.split('.');
 if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)||labels.length<2||labels.some(label=>! /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))||! /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(labels.at(-1)))invalid('email','Enter a valid email address, such as name@example.com.');
 return email;
}
export function normalizeMobile(value=''){
 if(typeof value!=='string')invalid('mobile','Enter a valid Philippine mobile number.');
 const raw=value.trim();if(!raw)return '';
 if(raw.length>30||! /^[+\d\s()-]+$/.test(raw))invalid('mobile','Use a Philippine mobile number such as 0917 123 4567 or +63 917 123 4567.');
 const compact=raw.replace(/[\s()-]/g,'');
 if(/^09\d{9}$/.test(compact))return '+63'+compact.slice(1);
 if(/^\+?639\d{9}$/.test(compact))return '+'+compact.replace(/^\+/,'');
 invalid('mobile','Use a Philippine mobile number such as 0917 123 4567 or +63 917 123 4567.');
}
export function validateContactForm(form){
 const email=form.elements.namedItem('email'),mobile=form.elements.namedItem('mobile');
 for(const input of [email,mobile])if(input){input.setCustomValidity('');input.oninput=()=>input.setCustomValidity('');}
 try{const e=email?normalizeEmail(email.value):null,m=mobile?normalizeMobile(mobile.value):null;if(email)email.value=e;if(mobile)mobile.value=m;return form.reportValidity();}
 catch(error){const input=form.elements.namedItem(error.field);input?.setCustomValidity(error.message);input?.reportValidity();return false;}
}
