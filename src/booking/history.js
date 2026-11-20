// Email is a local lookup label, never an authorization credential.
// Only private capabilities already saved by this browser are sent to the server.
const STORE='book-mozifi-guest-bookings-v1';
const valid=x=>x&&typeof x.reference==='string'&&typeof x.email==='string'&&/^[a-f0-9]{64}$/.test(x.manageKey);
export function rememberedBookings(email){try{const rows=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(rows)?rows.filter(valid).filter(x=>x.email===email.trim().toLowerCase()):[];}catch{return [];}}
export function rememberBooking(booking,manageKey){
 if(!valid({reference:booking.reference,email:booking.email,manageKey}))return false;
 try{const raw=JSON.parse(localStorage.getItem(STORE)||'[]'),rows=Array.isArray(raw)?raw.filter(valid):[];const saved={reference:booking.reference,email:booking.email.trim().toLowerCase(),manageKey};
 localStorage.setItem(STORE,JSON.stringify([...rows.filter(x=>x.reference!==saved.reference),saved].slice(-200)));return true;}catch{return false;}
}
