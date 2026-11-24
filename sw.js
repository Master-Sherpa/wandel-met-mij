// Service worker voor meldingen (WMM). Wordt als echt bestand geserveerd, niet via een blob-URL.
self.addEventListener('notificationclick',e=>{e.notification.close();clients.openWindow('/');});self.addEventListener('message',e=>{if(e.data&&e.data.type==='SCHEDULE'){const{ms,title,body}=e.data;setTimeout(()=>{self.registration.showNotification(title,{body});},ms);}});
