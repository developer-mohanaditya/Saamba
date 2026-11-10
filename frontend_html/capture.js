// A single continuous audio graph avoids gaps between uploaded chunks.
let capture = null;
let detectedMeetingTabId = null;
const dismissedMeetings = new Set();
const captureButton=document.querySelector('#record-button');
const captureStatus=document.querySelector('#record-status');
const soundAlerts=document.querySelector('#sound-alerts');
let alertAudio=null;
try { soundAlerts.checked=localStorage.getItem('saamba-sound-alerts') !== 'off'; } catch (_) { soundAlerts.checked=true; }
function unlockAlertAudio() {
  if(!soundAlerts.checked) return;
  try { alertAudio ||= new AudioContext(); if(alertAudio.state==='suspended') alertAudio.resume().catch(()=>{}); } catch (_) {}
}
document.addEventListener('pointerdown',unlockAlertAudio,{passive:true});
document.addEventListener('keydown',unlockAlertAudio);
soundAlerts.addEventListener('change',()=>{
  try { localStorage.setItem('saamba-sound-alerts',soundAlerts.checked?'on':'off'); } catch (_) {}
  if(soundAlerts.checked) { unlockAlertAudio(); playAlert('detected'); }
});
function playAlert(kind) {
  if(!soundAlerts.checked) return;
  try {
    alertAudio ||= new AudioContext();
    if(alertAudio.state !== 'running') return;
    const notes={detected:[660,880],start:[523,659,784],stop:[659,523],ended:[784,587]}[kind];
    if(!notes) return;
    const now=alertAudio.currentTime;
    notes.forEach((frequency,i)=>{
      const at=now+i*.10, oscillator=alertAudio.createOscillator(),gain=alertAudio.createGain();
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0.0001,at);gain.gain.exponentialRampToValueAtTime(.035,at+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.16);
      oscillator.connect(gain);gain.connect(alertAudio.destination);oscillator.start(at);oscillator.stop(at+.17);
    });
  } catch (_) { /* Sound must never interrupt recording. */ }
}

function wav(samples,rate) {
  const out=new ArrayBuffer(44+samples.length*2), v=new DataView(out);
  function text(at,s){for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));}
  text(0,'RIFF');v.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
  return out;
}
async function startCapture(extensionStream = null) {
  if (!navigator.mediaDevices?.getDisplayMedia) throw Error('This browser does not support meeting audio sharing. Use a supported Chrome browser.');
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) throw Error('This browser cannot record meeting video in the required format.');
  let screen, mic, context;
  try {
    if (extensionStream) {
      const source = {chromeMediaSource:'tab',chromeMediaSourceId:extensionStream.streamId};
      screen=await navigator.mediaDevices.getUserMedia({audio:{mandatory:source},video:{mandatory:source}});
    } else {
      screen=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true});
    }
    if (!screen.getAudioTracks().length) throw Error('No meeting audio was shared. Select the meeting tab and enable sharing tab audio.');
    mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    try { context=new AudioContext({sampleRate:48000}); } catch (_) { context=new AudioContext(); }
    if (context.sampleRate < 8000 || context.sampleRate > 192000) throw Error('This audio sample rate is not supported.');
    await context.audioWorklet.addModule('/capture-worklet.js');
    const sharedTitle=(extensionStream?.title || screen.getVideoTracks()[0].label || '').replace(/^Meet\s*[-–]\s*/i,'').trim();
    const usableTitle=/^(google meet|meet|chrome tab|tab|screen|window)$/i.test(sharedTitle)?'':sharedTitle;
    const wsId = (window.state && window.state.activeWorkspaceId) || '';
    const startHeaders = {'X-Meeting-Title':encodeURIComponent(usableTitle)};
    if (wsId && wsId !== 'default') startHeaders['X-Workspace-Id'] = wsId;
    const start=await fetch('/api/live/start',{method:'POST',headers:startHeaders});
    if(!start.ok) throw Error('Could not start recording.');
    const {id}=await start.json();
    if (wsId && wsId !== 'default' && window.state) {
      if (!window.state.workspaceMeetings[wsId]) window.state.workspaceMeetings[wsId] = [];
      if (!window.state.workspaceMeetings[wsId].includes(id)) {
        window.state.workspaceMeetings[wsId].push(id);
        try { localStorage.setItem('saamba-workspace-meetings', JSON.stringify(window.state.workspaceMeetings)); } catch (_) {}
      }
    }
    const node=new AudioWorkletNode(context,'saamba-recorder');
    const meetingSource=context.createMediaStreamSource(new MediaStream(screen.getAudioTracks()));
    const micSource=context.createMediaStreamSource(mic);
    const meetingGain=context.createGain(),micGain=context.createGain(); meetingGain.gain.value=.5;micGain.gain.value=.5;
    meetingSource.connect(meetingGain).connect(node);micSource.connect(micGain).connect(node);
    if(extensionStream) meetingSource.connect(context.destination);
    const mute=context.createGain();mute.gain.value=0;node.connect(mute).connect(context.destination);
    let index=0,flushResolve;
    const session={id,screen,mic,context,node,meetingTabId:extensionStream?.meetingTabId || detectedMeetingTabId,stopping:false,captureStopped:false,outbox:[],saving:null};
    session.drain=()=>{
      if(session.saving)return session.saving;
      session.saving=(async()=>{
        while(session.outbox.length){
          const item=session.outbox[0];
          const response=await fetch(`/api/live/${id}/chunk`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Chunk-Index':String(item.index)},body:item.payload});
          if(!response.ok)throw Error('A recording segment could not be saved. Keep this tab open and stop again to retry.');
          session.outbox.shift();
        }
      })().finally(()=>{session.saving=null;});
      return session.saving;
    };
    node.port.onmessage=e=>{
      if(e.data.type==='flushed'){flushResolve?.();return;}
      if(e.data.type!=='chunk')return;
      session.outbox.push({payload:wav(e.data.samples,e.data.rate),index:index++});
      session.drain().catch(()=>{captureStatus.textContent='Saving is delayed. Keep this tab open; press stop to retry.';});
    };
    const recorder=new MediaRecorder(new MediaStream(screen.getVideoTracks()),{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1200000});
    session.videoOutbox=[];session.videoCount=0;session.videoSaving=null;session.recorder=recorder;
    session.videoDrain=()=>{
      if(session.videoSaving)return session.videoSaving;
      session.videoSaving=(async()=>{while(session.videoOutbox.length){
        const item=session.videoOutbox[0];
        const response=await fetch(`/api/live/${id}/video-chunk`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Chunk-Index':String(item.index)},body:item.payload});
        if(!response.ok)throw Error('A video segment could not be saved. Keep this tab open and retry saving.');
        session.videoOutbox.shift();
      }})().finally(()=>{session.videoSaving=null;});
      return session.videoSaving;
    };
    recorder.addEventListener('dataavailable',e=>{if(e.data.size){session.videoOutbox.push({payload:e.data,index:session.videoCount++});session.videoDrain().catch(()=>{captureStatus.textContent='Saving video is delayed. Keep this tab open and retry saving.';});}});
    session.videoStopped=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
    recorder.start(10000);
    session.flush=()=>new Promise(resolve=>{flushResolve=resolve;node.port.postMessage('flush');});
    capture=session;
    screen.getVideoTracks()[0].addEventListener('ended',()=>stopCapture());
    captureButton.textContent='Stop recording';captureButton.classList.add('is-recording');playAlert('start');
    if(session.meetingTabId) window.postMessage({source:'saamba-app',type:'recording-status',meetingTabId:session.meetingTabId,recording:true},location.origin);captureStatus.textContent='Recording video, meeting audio and microphone. Keep this tab open.';
    selected=id;current=null;refresh();
  } catch(error) {
    screen?.getTracks().forEach(t=>t.stop());mic?.getTracks().forEach(t=>t.stop());if(context) await context.close();throw error;
  }
}
async function stopCapture() {
  const session=capture;if(!session||session.stopping)return;
  session.stopping=true;captureButton.disabled=true;captureStatus.textContent='Saving the recording…';
  try {
    if(!session.captureStopped){
      const flushed=session.flush();
      if(session.recorder.state !== 'inactive') session.recorder.stop();
      session.screen.getTracks().forEach(t=>t.stop());session.mic.getTracks().forEach(t=>t.stop());
      await flushed;
      await session.videoStopped;
      session.captureStopped=true;
      await session.context.close();
    }
    await session.drain();
    await session.videoDrain();
    const response=await fetch(`/api/live/${session.id}/finish`,{method:'POST',headers:{'X-Video-Chunks':String(session.videoCount)}});
    if(!response.ok)throw Error('Could not finish saving. Keep this tab open and contact support.');
    const result=await response.json();
    if(session.meetingTabId) window.postMessage({source:'saamba-app',type:'recording-status',meetingTabId:session.meetingTabId,recording:false},location.origin);
    playAlert('stop');capture=null;captureButton.textContent='Record a meeting';captureButton.classList.remove('is-recording');captureStatus.textContent=result.video_saved?'Video and audio saved. Transcription and summary are finishing.':'Audio was saved, but video could not be finalized. Video segments remain on this device.';current=null;refresh();
  } catch(error) {captureStatus.textContent=error.message;session.stopping=false;captureButton.textContent='Retry saving';if(session.meetingTabId) window.postMessage({source:'saamba-app',type:'recording-status',meetingTabId:session.meetingTabId,recording:true},location.origin);}
  finally {captureButton.disabled=false;}
}
captureButton.addEventListener('click',async()=>{try{if(capture)await stopCapture();else await startCapture();}catch(error){captureStatus.textContent='';showToast(error.name==='NotAllowedError'?'Permission denied by user':error.message);}});
window.addEventListener('beforeunload',e=>{if(capture){e.preventDefault();e.returnValue='';}});
function requestDetectedCapture() {
  captureStatus.textContent='Starting meeting capture…';
  window.postMessage({source:'saamba-app',type:'request-tab-capture',meetingTabId:detectedMeetingTabId},location.origin);
  clearTimeout(requestDetectedCapture.timer);
  requestDetectedCapture.timer=setTimeout(()=>{if(!capture && captureStatus.textContent==='Starting meeting capture…') captureStatus.textContent='Open the meeting tab and click the Saamba S extension icon to start recording.';},3000);
}
function showMeetingPrompt(meetingTabId) {
  if (!meetingTabId || capture || dismissedMeetings.has(String(meetingTabId))) return;
  if(String(detectedMeetingTabId)===String(meetingTabId)) return;
  detectedMeetingTabId=meetingTabId;
  playAlert('detected');
}
const initialMeetTab = new URLSearchParams(location.search).get('meetTab');
if(initialMeetTab) showMeetingPrompt(initialMeetTab);
// Only the Saamba tab opened for this Meet can respond to its end signal.
window.addEventListener('message', event => {
  if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'saamba-meeting-detector') return;
  if(event.data.type === 'stop-recording') { if(capture && String(capture.meetingTabId)===String(event.data.meetingTabId)) stopCapture(); return; }
  if(event.data.type === 'meeting-detected') { showMeetingPrompt(event.data.meetingTabId); return; }
  if(event.data.type === 'capture-invocation-required') { captureStatus.textContent='Open the meeting tab and click the Saamba S extension icon to start recording.'; return; }
  if(event.data.type === 'capture-error') { showToast('Could not capture the meeting tab. Click the Saamba extension icon in the meeting.'); return; }
  if(event.data.type === 'start-tab-capture') {
    if(capture) { showToast('A recording is already in progress.'); return; }
    document.querySelector('#meeting-prompt').hidden=true;
    startCapture(event.data).catch(error=>showToast(error.name==='NotAllowedError'?'Microphone or tab permission was denied.':error.message));
    return;
  }
  if(event.data.type !== 'meeting-ended') return;
  const endedId=String(event.data.meetingTabId);
  dismissedMeetings.delete(endedId);
  if(String(detectedMeetingTabId)===endedId) { if(!capture) playAlert('ended'); document.querySelector('#meeting-prompt').hidden=true; detectedMeetingTabId=null; }
  if (capture && String(capture.meetingTabId) === endedId) stopCapture();
});
