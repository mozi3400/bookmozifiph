import {money,dayLabel,timeLabel,duration,servicePrice,bookingAmount,phoneDisplay} from './shared.js';
export async function downloadConfirmation(booking,business,resource){
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=5000;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Your browser could not prepare the confirmation.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);const left=80,right=1120,width=1040;let y=90;
 const font=(size,bold=false,serif=false)=>{ctx.font=`${bold?'600':'400'} ${size}px ${serif?'Caslon, Georgia':'Arial, sans-serif'}`;ctx.fillStyle='#191919';ctx.textBaseline='top';};
 const wrap=(value,maxWidth)=>{const lines=[];for(const para of String(value).split('\n')){let line='';for(const word of para.split(/\s+/)){if(ctx.measureText(line+' '+word).width>maxWidth&&line){lines.push(line);line='';}if(ctx.measureText(word).width>maxWidth){for(const letter of word){if(ctx.measureText(line+letter).width>maxWidth){lines.push(line);line='';}line+=letter;}}else line+=(line?' ':'')+word;}lines.push(line);}return lines;};
 const draw=(value,x,maxWidth,size=28,bold=false,serif=false)=>{font(size,bold,serif);const lines=wrap(value,maxWidth);for(const [i,line]of lines.entries())ctx.fillText(line,x,y+i*size*1.45);y+=lines.length*size*1.45;};
 const line=()=>{ctx.strokeStyle='#dedede';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();};
 font(36,true,true);ctx.fillText('bad ideas ventures',left,y);ctx.fillStyle='#ce2828';ctx.beginPath();ctx.arc(left+ctx.measureText('bad ').width+5,y+5,3,0,Math.PI*2);ctx.fill();y+=90;
 draw('Booking confirmation',left,width,54,false,true);y+=18;draw(business?.name||'Bad Ideas Ventures',left,width,36,false,true);y+=20;
 font(25);ctx.fillStyle='#666';ctx.fillText('Reference '+booking.reference,left,y);y+=60;line();y+=34;
 const detail=(label,value)=>{font(25);ctx.fillStyle='#666';ctx.fillText(label,left,y);font(28);const lines=wrap(value,690);for(const [i,l]of lines.entries())ctx.fillText(l,left+330,y+i*40);y+=Math.max(40,lines.length*40)+24;};
 detail('Date',dayLabel(booking.startsAt));detail('Time',timeLabel(booking.startsAt)+' · Philippine time');detail(business?.id==='halon'?'Bay':'Professional',resource?.name||'Assigned resource');if(business?.phone)detail('Business contact',phoneDisplay(business.phone));detail('Guest',booking.nickname);detail('Status',booking.status.replace('_',' '));line();y+=34;
 if(booking.package){const p=booking.package;detail('Package',p.name+(p.months?' · '+p.months+' months':''));detail('Included visit',p.visit+' of '+p.visits+' · One CAKAO coffee');}
 draw('Services',left,width,30,true);y+=16;
 for(const item of booking.items){font(29);const names=wrap(item.name,770),startY=y;for(const [i,name]of names.entries())ctx.fillText(name,left,startY+i*42);font(29);const amount=servicePrice(item);ctx.fillText(amount,right-ctx.measureText(amount).width,startY);y+=names.length*42+8;font(24);ctx.fillStyle='#666';ctx.fillText(item.itemKind==='product'?'1 item':duration(item.durationMinutes),left,y);y+=58;}
 line();y+=32;font(36,true);ctx.fillText('Total',left,y);const amount=bookingAmount(booking.totalCents,booking.items);ctx.fillText(amount,right-ctx.measureText(amount).width,y);y+=80;draw(booking.package && !booking.totalCents?'Included prepaid visit':'Pay on site',left,width,28);y+=28;line();y+=30;draw('To manage this booking, enter your email in Manage booking using the browser where you booked.',left,width,24);y+=45;
 const output=document.createElement('canvas');output.width=canvas.width;output.height=Math.ceil(y+60);output.getContext('2d').drawImage(canvas,0,0);
 const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('JPEG download could not be prepared.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`booking-${booking.reference}.jpg`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
