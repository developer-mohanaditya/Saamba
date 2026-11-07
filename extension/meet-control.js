// The browser grants tab capture through the extension action, not page clicks.
(() => {
  if (document.getElementById('saamba-meet-control')) return;
  let recording = false, stopping = false;
  const root = document.createElement('div');
  root.id = 'saamba-meet-control';
  root.style.display = 'none';
  const shadow = root.attachShadow({mode:'closed'});
  shadow.innerHTML = `<style>
    :host{all:initial;position:fixed;z-index:2147483647;top:12px;left:320px;font-family:Arial,sans-serif}
    .control{display:flex;align-items:center;border:1px solid #476251;border-radius:20px;background:#234235;color:white;box-shadow:0 3px 12px #0005}
    button{border:0;background:transparent;color:inherit;font:600 12px Arial,sans-serif;cursor:pointer}
    .drag{padding:7px 3px 7px 9px;cursor:grab;touch-action:none}
    .capture{padding:8px 12px 8px 5px;display:flex;align-items:center;gap:7px}
    .capture:disabled{opacity:.75;cursor:wait}
    .mark{display:inline-grid;place-items:center;background:#deb569;color:#234235;width:20px;height:20px;border-radius:5px;font:bold 17px Georgia,serif}
    .message{display:none;color:white;background:#263b30;padding:8px 12px;border-radius:8px;margin-top:6px;max-width:260px;font:12px Arial,sans-serif}
    .message.visible{display:block}.control.recording{background:#9c3430;border-color:#c15a53}
    @media(max-width:650px){:host{left:12px;top:55px}}
  </style><div class="control"><button class="drag" type="button" aria-label="Move Saamba recording control" title="Drag to move">⠿</button><button class="capture" type="button"><span class="mark">S</span><span class="label">Capture video</span></button></div><div class="message" role="status"></div>`;
  const button=shadow.querySelector('.capture'), drag=shadow.querySelector('.drag'), control=shadow.querySelector('.control'), label=shadow.querySelector('.label'), message=shadow.querySelector('.message');
  function updateVisibility() {
    const joined = /^\/(?:meet\/)?[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(location.pathname) && [...document.querySelectorAll('button[aria-label], [role="button"][aria-label]')].some(el => /^(leave call|leave meeting|end call)$/i.test(el.getAttribute('aria-label') || ''));
    root.style.display = joined ? 'block' : 'none';
  }
  (document.body || document.documentElement).appendChild(root);
  updateVisibility();
  new MutationObserver(updateVisibility).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-label']});
  let movement;
  drag.addEventListener('pointerdown', event => {
    const rect=root.getBoundingClientRect();
    movement={x:event.clientX-rect.left,y:event.clientY-rect.top};
    drag.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  drag.addEventListener('pointermove', event => {
    if(!movement) return;
    const rect=root.getBoundingClientRect();
    root.style.left=Math.max(0,Math.min(window.innerWidth-rect.width,event.clientX-movement.x))+'px';
    root.style.top=Math.max(0,Math.min(window.innerHeight-rect.height,event.clientY-movement.y))+'px';
  });
  drag.addEventListener('pointerup',()=>{movement=null;});
  drag.addEventListener('pointercancel',()=>{movement=null;});
  button.addEventListener('click',async()=>{
    if(stopping) return;
    updateVisibility();
    if(root.style.display === 'none') return;
    const action=recording?'stop':'start';
    button.disabled=true;message.classList.remove('visible');
    if(action==='stop'){stopping=true;label.textContent='Saving…';}
    try {
      const result=await chrome.runtime.sendMessage({type:'meet-control',action});
      if(!result?.ok) {
        stopping=false;label.textContent=recording?'Stop recording':'Capture video';button.disabled=false;
        message.textContent=action==='start'?'Could not start recording. Try the Saamba toolbar icon and check that Saamba is open in Comet.':'Could not stop recording. Try again in Saamba.';
        message.classList.add('visible');
      } else if(action==='start') button.disabled=false;
    } catch (_) {
      stopping=false;label.textContent=recording?'Stop recording':'Capture video';button.disabled=false;
      message.textContent='Reload Saamba in Comet extensions, then refresh this meeting tab.';message.classList.add('visible');
    }
  });
  chrome.runtime.onMessage.addListener(m=>{
    if(m.type==='capture-start-error') {
      button.disabled=false;stopping=false;
      message.textContent=m.reason==='meeting'?'Join the meeting before starting recording.':m.reason==='app'?'Open Saamba in Comet and refresh it before recording.':'Recording could not start. Check Saamba for details and try again.';
      message.classList.add('visible');
    }
    if(m.type==='recording-status'){
      recording=m.recording===true;stopping=false;button.disabled=false;
      label.textContent=recording?'Stop recording':'Capture video';control.classList.toggle('recording',recording);message.classList.remove('visible');
    }
  });
})();
