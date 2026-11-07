chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === 'saamba-ping') { respond({ready:true}); return; }
  if (['meeting-detected','meeting-ended','start-tab-capture','capture-error','stop-recording'].includes(message.type)) {
    window.postMessage({source:'saamba-meeting-detector', ...message}, window.location.origin);
  }
});

chrome.runtime.sendMessage({type:"saamba-ready"}).catch(()=>{});

window.addEventListener('message',event=>{
  if(event.source!==window || event.origin!==location.origin || event.data?.source!=='saamba-app' || event.data.type!=='request-tab-capture') return;
  const meetingTabId=Number(event.data.meetingTabId);
  if(!Number.isInteger(meetingTabId) || meetingTabId<=0) return;
  chrome.runtime.sendMessage({type:'request-tab-capture',meetingTabId}).then(result=>{
    if(!result?.ok) window.postMessage({source:'saamba-meeting-detector',type:'capture-invocation-required'},location.origin);
  }).catch(()=>window.postMessage({source:'saamba-meeting-detector',type:'capture-invocation-required'},location.origin));
});

window.addEventListener('message',event=>{
  if(event.source!==window || event.origin!==location.origin || event.data?.source!=='saamba-app' || event.data.type!=='recording-status') return;
  const meetingTabId=Number(event.data.meetingTabId);
  if(Number.isInteger(meetingTabId) && meetingTabId>0 && typeof event.data.recording==='boolean') chrome.runtime.sendMessage({type:'recording-status',meetingTabId,recording:event.data.recording}).catch(()=>{});
});
