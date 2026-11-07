const appPattern = 'http://127.0.0.1:24917/*';
function isMeetingUrl(url) {
  try { const u=new URL(url); return u.hostname==='meet.google.com' && /^\/(?:meet\/)?[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(u.pathname); }
  catch (_) { return false; }
}
async function notifyApps(type, meetingTabId) {
  const apps=await chrome.tabs.query({url:appPattern});
  let delivered=0;
  for(const tab of apps) { try { await chrome.tabs.sendMessage(tab.id,{type,meetingTabId}); delivered++; } catch (_) {} }
  return delivered;
}
async function notifyEnd(meetingTabId) { await notifyApps('meeting-ended',meetingTabId); }
async function joined(tab) {
  if (!tab?.id || !isMeetingUrl(tab.url)) return false;
  try { return (await chrome.tabs.sendMessage(tab.id,{type:'saamba-meeting-state'}))?.joined === true; }
  catch (_) { return false; }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.tab?.id && sender.url?.startsWith('http://127.0.0.1:24917/') && message.type === 'request-tab-capture') {
    (async()=>{
      try {
        if(!Number.isInteger(message.meetingTabId)) throw Error('Invalid meeting');
        const target=await chrome.tabs.get(message.meetingTabId);
        if(!await joined(target)) throw Error('Join the meeting before recording');
        const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:target.id,consumerTabId:sender.tab.id});
        await chrome.tabs.sendMessage(sender.tab.id,{type:'start-tab-capture',streamId,meetingTabId:target.id,title:target.title || ''});
        respond({ok:true});
      } catch (_) { respond({ok:false}); }
    })();
    return true;
  }
  if (sender.tab?.id && sender.url?.startsWith('http://127.0.0.1:24917/') && message.type === 'recording-status') {
    if(Number.isInteger(message.meetingTabId) && typeof message.recording==='boolean') chrome.tabs.sendMessage(message.meetingTabId,{type:'recording-status',recording:message.recording}).catch(()=>{});
    return;
  }
  if (sender.tab?.id && sender.url?.startsWith('https://meet.google.com/') && message.type==='meet-control') {
    if(message.action==='stop') { notifyApps('stop-recording',sender.tab.id).then(count=>respond({ok:count>0})).catch(()=>respond({ok:false})); return true; }
    if(message.action==='start') { startFromMeet(sender.tab).then(ok=>respond({ok})); return true; }
  }
  if (!sender.tab?.id) return;
  if (sender.url?.startsWith('https://meet.google.com/')) {
    if (message.type === 'joined-meeting') notifyApps('meeting-detected',sender.tab.id).catch(()=>{});
    if (message.type === 'meeting-ended') notifyEnd(sender.tab.id).catch(()=>{});
  } else if (sender.url?.startsWith('http://127.0.0.1:24917/') && message.type === 'saamba-ready') {
    chrome.tabs.query({url:'https://meet.google.com/*'}).then(tabs=> {
      for(const tab of tabs) if(tab.id && isMeetingUrl(tab.url)) chrome.tabs.sendMessage(sender.tab.id,{type:'meeting-detected',meetingTabId:tab.id}).catch(()=>{});
    }).catch(()=>{});
  }
});
chrome.tabs.onRemoved.addListener(tabId => { notifyEnd(tabId).catch(()=>{}); });
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (!change.url) return;
  if(isMeetingUrl(change.url)) notifyApps('meeting-detected',tabId).catch(()=>{});
  else notifyEnd(tabId).catch(()=>{});
});

// The extension action is the explicit user gesture required by tabCapture.
async function startFromMeet(tab) {
  if (!await joined(tab)) {
    if(tab?.id) await chrome.tabs.sendMessage(tab.id,{type:'capture-start-error',reason:'meeting'}).catch(()=>{});
    return false;
  }
  let stage='app';
  try {
    let apps = await chrome.tabs.query({url: appPattern});
    let app = apps.find(t => new URL(t.url).searchParams.get('meetTab') === String(tab.id)) || apps[0];
    if (!app) app = await chrome.tabs.create({url:`http://127.0.0.1:24917/?meeting=detected&meetTab=${tab.id}`, active:false});
    // Wait for the bridge before obtaining a short-lived stream ID.
    let ready = false;
    for (let i=0; i<30 && !ready; i++) {
      try { await chrome.tabs.sendMessage(app.id, {type:'saamba-ping'}); ready=true; }
      catch (_) { await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    if (!ready) throw Error('Open Saamba before recording.');
    stage='capture';
    const streamId = await chrome.tabCapture.getMediaStreamId({targetTabId:tab.id, consumerTabId:app.id});
    await chrome.tabs.sendMessage(app.id, {type:'start-tab-capture', streamId, meetingTabId:tab.id, title:tab.title || ''});
    await chrome.tabs.update(app.id, {active:true});
    return true;
  } catch (_) {
    await chrome.tabs.sendMessage(tab.id,{type:'capture-start-error',reason:stage}).catch(()=>{});
    // Show a user-visible error in Saamba without exposing recording data.
    const apps=await chrome.tabs.query({url:appPattern});
    const app=apps.find(t=>new URL(t.url).searchParams.get('meetTab')===String(tab.id)) || apps[0];
    if(app) await chrome.tabs.sendMessage(app.id,{type:'capture-error'}).catch(()=>{});
    return false;
  }
}
chrome.action.onClicked.addListener(startFromMeet);
