const layoutChoice = document.querySelector('#layout-choice');
const testMenu = document.querySelector('.test-menu');
document.addEventListener('click', event => { if (testMenu && !testMenu.contains(event.target)) testMenu.open=false; });

const workspaceSidebar = document.querySelector('.workspace-sidebar');
const workspaceToggle = document.querySelector('#workspace-toggle');
const libraryPane = document.querySelector('.library');
const contentPane = document.querySelector('.content');
const libraryToggle = document.querySelector('#library-toggle');
let libraryExpanded = true;
try { libraryExpanded = localStorage.getItem('saamba-library-expanded') !== 'false'; } catch (_) {}
function syncLibrary() {
  const floating = document.querySelector('.app').classList.contains('layout-floating');
  libraryPane.hidden = !floating && !libraryExpanded;
  libraryToggle.setAttribute('aria-expanded', String(floating || libraryExpanded));
}
libraryToggle.addEventListener('click', () => {
  if (document.querySelector('.app').classList.contains('layout-floating')) { menuOpen(false); return; }
  libraryExpanded = !libraryExpanded;
  try { localStorage.setItem('saamba-library-expanded', String(libraryExpanded)); } catch (_) {}
  syncLibrary();
});
function setLayout(layout) {
  const floating=layout==='floating';
  document.querySelector('.app').classList.toggle('layout-floating',floating);
  document.querySelector('.app').classList.toggle('layout-sidebar',!floating);
  if(floating) contentPane.insertBefore(libraryPane,document.querySelector('#detail'));
  else workspaceSidebar.insertBefore(libraryPane,workspaceSidebar.querySelector('.side-bottom'));
  workspaceSidebar.classList.remove('menu-open');workspaceToggle.setAttribute('aria-expanded','false');
  syncLibrary();
  layoutChoice.value=floating?'floating':'sidebar';
  try { localStorage.setItem('saamba-layout',layoutChoice.value); } catch (_) {}
}
let savedLayout='sidebar';try { savedLayout=localStorage.getItem('saamba-layout')||'sidebar'; } catch (_) {}
setLayout(savedLayout);
layoutChoice.addEventListener('change',()=>setLayout(layoutChoice.value));
function menuOpen(open) { workspaceSidebar.classList.toggle('menu-open',open);workspaceToggle.setAttribute('aria-expanded',String(open)); }
workspaceToggle.addEventListener('click',()=>{if(document.querySelector('.layout-floating'))menuOpen(!workspaceSidebar.classList.contains('menu-open'));});
workspaceSidebar.addEventListener('mouseenter',()=>{if(document.querySelector('.layout-floating'))menuOpen(true);});
workspaceSidebar.addEventListener('mouseleave',()=>{if(document.querySelector('.layout-floating'))menuOpen(false);});
workspaceSidebar.addEventListener('focusout',event=>{if(document.querySelector('.layout-floating')&&!workspaceSidebar.contains(event.relatedTarget))menuOpen(false);});
document.addEventListener('click',event=>{if(document.querySelector('.layout-floating')&&!workspaceSidebar.contains(event.target))menuOpen(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&workspaceSidebar.classList.contains('menu-open')){menuOpen(false);workspaceToggle.focus();}});
const $ = s => document.querySelector(s);
let selected = null, current = null, lastVersion = null, editing = false;
const chats = {};
const downloads = new Set();
function showToast(message){const toast=$('#toast');toast.querySelector('span').textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.hidden=true,3000);}
$('#toast button').onclick=()=>$('#toast').hidden=true;
const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = n => { n=Math.floor(Number(n)||0);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
const date = s => new Date(s).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const busyStatus = s => ['queued','transcribing','summarizing'].includes(s);
const statusText = s => ({queued:'Getting ready',transcribing:'Creating transcript',summarizing:'Creating summary',recording:'Recording',ready:'Ready',error:'Needs attention','needs setup':'Setup needed'}[s]||s);
const icon = name => ({rewrite:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M5 10a7 7 0 0 1 12-3l3 5M19 14a7 7 0 0 1-12 3l-3-5"/></svg>', share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v6h14v-6"/></svg>',delete:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg>',mail:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',link:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-2 2M14 11a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l2-2"/></svg>',file:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>',chevron:'<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>'}[name]);
const spinner = () => '<span class="spinner" aria-hidden="true"></span>';
const statusChip = (s,notes=false) => `<span class="status-chip ${busyStatus(s)?'is-busy':''} ${s==='error'?'is-error':''}">${busyStatus(s)?spinner():''}${esc(s==='error'&&notes?'Notes saved · last attempt failed':statusText(s))}${busyStatus(s)?'…':''}</span>`;
const activity = (title,detail) => `<div class="activity" role="status">${spinner()}<div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div></div>`;
// Render a small, safe subset of Markdown; all model content is escaped first.
function markdown(text) {
  const inline = value => esc(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
  const lines=String(text||'').split(/\r?\n/);
  const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  const separator=line=>/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line||'');
  let list=false,html='';
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if(line.includes('|')&&separator(lines[i+1])){
      if(list){html+='</ul>';list=false;}
      const header=cells(line);i+=2;let rows='';
      while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()){
        const row=cells(lines[i]);rows+='<tr>'+header.map((_,n)=>`<td>${inline(row[n]||'')}</td>`).join('')+'</tr>';i++;
      }
      i--;html+='<div class="markdown-table"><table><thead><tr>'+header.map(c=>`<th>${inline(c)}</th>`).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';continue;
    }
    const item=line.match(/^\s*[-*]\s+(.+)/);
    if(item){if(!list){html+='<ul>';list=true;}html+=`<li>${inline(item[1])}</li>`;continue;}
    if(list){html+='</ul>';list=false;}
    if(!line.trim())continue;
    const heading=line.match(/^\s*#{1,4}\s+(.+)/)||line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    html+=heading?`<h3>${inline(heading[1])}</h3>`:`<p>${inline(line)}</p>`;
  }
  return html+(list?'</ul>':'');
}
function summarySections(m) {
  const sections=[]; let section={title:'',lines:[]};
  for(const line of String(m.summary||'').split(/\r?\n/)){
    const heading=line.match(/^\s*#{1,4}\s+(.+?)\s*$/)||line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if(heading){if(section.title||section.lines.some(x=>x.trim()))sections.push(section);section={title:heading[1],lines:[]};}else section.lines.push(line);
  }
  if(section.title||section.lines.some(x=>x.trim()))sections.push(section);
  return sections.map((part,i)=>{
    const isAction=/^(action items?|next steps)\s*:?$/i.test(part.title.trim());
    let body=markdown(part.lines.join('\n'));
    if(isAction && m.action_items?.length){body='<div class="action-list">'+m.action_items.map(a=>`<div class="action-row"><label><input type="checkbox" data-action="${esc(a.key)}" ${a.checked?'checked':''}><span>${esc(a.text)}</span></label>${a.start!=null?`<button class="action-citation" data-citation="${a.start}">Listen at ${time(a.start)}</button>`:'<span class="action-citation-unavailable">Source timestamp unavailable</span>'}</div>`).join('')+'</div>';}
    return `<section class="summary-section" ${isAction?'id="action-section"':''}><div class="summary-heading"><h3>${esc(part.title)}</h3><button class="copy-section" data-section="${i}" aria-label="Copy ${esc(part.title||'section')}">⧉</button></div>${body}</section>`;
  }).join('');
}
function summaryContent(m) {
  if(m.status==='queued')return activity('Getting things ready','Your recording is saved.');
  if(m.status==='transcribing')return activity('Creating your transcript','Follow along in the Transcript tab.');
  if(m.status==='summarizing')return activity('Creating your English summary',m.summary_preview?`Draft sections ready: ${m.summary_preview.completed} of ${m.summary_preview.total}. The final summary may change.`:'Working through the transcript. Draft sections will appear as they are ready.')+(m.summary_preview?`<div class="draft-label">DRAFT · WORK IN PROGRESS</div><div class="summary-text">${markdown(m.summary_preview.content)}</div>`:'');
  if(m.status==='recording'&&!m.summary)return '<p class="muted">The summary can be created after the recording ends.</p>';
  if(m.summary)return `<div class="summary-text">${summarySections(m)}</div>`;
  if(m.status==='error')return '<p class="muted">The summary could not be created. See the message above for details.</p>';
  return `<p class="muted">${m.transcript.length?'Your transcript is available. Choose Create summary to make an English summary.':'Create a transcript first to make a summary.'}</p>`;
}
async function api(url,options){const r=await fetch(url,options),v=await r.json();if(!r.ok)throw Error(v.error||'Something went wrong');return v;}
async function refresh(){
  const meetings=await api('/api/meetings');$('#count').textContent=String(meetings.length);$('#count').setAttribute('aria-label',`${meetings.length} ${meetings.length===1?'meeting':'meetings'}`);
  if(!selected&&meetings.length)selected=meetings[0].id;
  if(!meetings.length){$('#detail').innerHTML='<div class="empty"><div class="empty-icon">♫</div><h2>Make room for the conversation.</h2><p>Import a recording to bring your notes, transcript, and audio together.</p><button class="primary" id="empty-import">Import your first meeting</button></div>';$('#empty-import').onclick=()=>$('#import-dialog').showModal();}
  $('#meetings').innerHTML=meetings.length?meetings.map(m=>`<button class="meeting ${selected===m.id?'selected':''}" data-id="${esc(m.id)}" title="${esc(m.title)}"><span class="meeting-icon">♫</span><span class="meeting-copy"><strong>${esc(m.title)}</strong><small>${esc(date(m.created_at))}</small></span></button>`).join(''):'<div class="list-empty">No meetings yet.<br>Start with a recording.</div>';
  document.querySelectorAll('.meeting').forEach(b=>b.onclick=()=>openMeeting(b.dataset.id));
  if(selected&&!editing)await openMeeting(selected,false);
}
function transcriptActivity(m){if(m.status==='transcribing')return activity('Creating your transcript','More passages will appear here as they are ready.');if(m.status==='recording')return activity('Listening for speech','New transcript segments will appear here as they are ready.');return m.transcript.length?'':'<p class="muted">No transcript yet.</p>';}
async function openMeeting(id,rerender=true){
  selected=id;const m=await api(`/api/meetings/${id}`);if(rerender){await refresh();return;}
  if(!chats[id]){const messages=await api(`/api/meetings/${id}/chat`);if(selected!==id)return;chats[id]={messages,scope:'this',collapsed:false,question:''};}
  const version=JSON.stringify([m.id,m.title,m.status,m.error,m.summary,m.summary_preview,m.transcript,m.mime,m.action_items]);if(current===id&&lastVersion===version)return;lastVersion=version;
  const same=current===id,oldPlayer=$('#player'),position=same?oldPlayer?.currentTime||0:0,playing=same&&oldPlayer&&!oldPlayer.paused;
  const previousTab=same&&document.querySelector('.tab.active')?.dataset.tab; const activeTab=previousTab||(m.status==='recording'?'transcript':'summary');
  const searchTerm=same?($('#search')?.value||''):'';const oldScroll=same?($('#notes-scroll')?.scrollTop||0):0;current=id;
  const canRewrite=!busyStatus(m.status)&&m.status!=='recording';
  const video=m.mime.startsWith('video/');
  const segments=m.transcript.map(s=>`<button class="segment" data-time="${Number(s.start)||0}"><span class="segment-time">${time(s.start)}</span><span class="segment-body">${s.speaker==null?'':`<strong>Speaker ${Number(s.speaker)+1}</strong>`}<span>${esc(s.text)}</span></span></button>`).join('');
  $('#detail').innerHTML=`<div class="notes-card"><div class="detail-header"><div class="detail-meta"><span class="meeting-date"><span aria-hidden="true">▦</span> ${esc(date(m.created_at))}</span>${canRewrite?`<div class="share-menu"><button class="subtle-button" id="rewrite-toggle" aria-expanded="false">${icon('rewrite')} Rewrite ${icon('chevron')}</button><div class="share-options" id="rewrite-options" hidden><button id="make-transcript">${icon('file')}${m.transcript.length?'Rewrite':'Create'} transcript</button><button id="make-summary">${icon('rewrite')}${m.summary?'Rewrite':'Create'} summary</button></div></div>`:''}<div class="share-menu"><button class="subtle-button" id="share-toggle" aria-expanded="false">${icon('share')} Share ${icon('chevron')}</button><div class="share-options" id="share-options" hidden><button disabled>${icon('mail')}Send to email</button><button disabled>${icon('link')}Copy link</button></div></div><div class="delete-menu"><button class="subtle-button delete-button" id="delete-toggle" aria-label="Delete meeting" aria-expanded="false" ${!canRewrite?'disabled':''}>${icon('delete')}</button><div class="delete-popover" id="delete-popover" hidden><p>Do you really want to delete?</p><button id="delete-next" type="button">Continue</button></div></div>${statusChip(m.status,!!m.summary&&m.transcript.length>0)}</div><div class="title-group"><button id="meeting-title" class="meeting-title" title="Click to edit meeting name" aria-label="Edit meeting name">${esc(m.title)}</button></div></div>${m.error?`<p class="notice">${esc(m.error)}</p>`:''}<div class="meeting-workspace"><section class="notes-pane"><div class="tabs"><button class="tab ${activeTab==='summary'?'active':''}" data-tab="summary">Summary ${m.status==='summarizing'?spinner():''}</button><button class="tab action-tab ${activeTab==='actions'?'active':''}" data-tab="actions">Action items <span class="action-count">${m.action_items?.filter(a=>!a.checked).length||0}</span></button><button class="tab ${activeTab==='transcript'?'active':''}" data-tab="transcript">${m.status==='recording'?'Live transcript':'Transcript'} ${m.status==='transcribing'?spinner():''}</button><div id="search-wrap" class="search-wrap" ${activeTab==='transcript'?'':'hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><input id="search" class="search" placeholder="Search transcript" aria-label="Search transcript"></div></div>${m.transcript.length && m.transcript.every(s=>s.speaker==null)?`<p class="speaker-note" id="speaker-note" ${activeTab==='transcript'?'':'hidden'}>Speaker identification is not available for this recording.</p>`:''}<div class="notes-scroll" id="notes-scroll"><div id="summary" class="tab-content" ${['summary','actions'].includes(activeTab)?'':'hidden'}>${summaryContent(m)}</div><div id="transcript" class="tab-content" ${activeTab==='transcript'?'':'hidden'}><div id="segments">${segments}${transcriptActivity(m)}</div></div></div></section></div></div><aside class="media-pane"><div class="media-heading"><h3>Return to the moment</h3>${m.status!=='recording'?`<div class="share-menu download-menu"><button type="button" id="download-toggle" class="download-toggle" aria-expanded="false" ${downloads.has(id)?'disabled':''}><span class="download-label">${downloads.has(id)?spinner():'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg>'} ${downloads.has(id)?'Downloading…':'Download'}</span><span class="download-chevron">${icon('chevron')}</span></button><div class="share-options" id="download-options" hidden><button type="button" data-download="mp4" ${video?'':'disabled'}>Video · MP4</button><button type="button" data-download="webm" ${video?'':'disabled'}>Video · WebM</button><button type="button" data-download="mp3">Audio · MP3</button><button type="button" data-download="audio-webm">Audio · WebM</button></div></div>`:''}</div>${m.status==='recording'?'<p class="notice">Recording in progress. Audio playback is available after you stop.</p><button class="retry" id="recover-live">Finish saved recording</button>':`${video?'':'<div class="waveform" aria-hidden="true">'+Array.from({length:42},(_,i)=>`<i style="height:${10+((i*23+19)%37)}px"></i>`).join('')+'</div>'}<${video?'video':'audio'} id="player" controls preload="metadata" src="/api/meetings/${esc(id)}/audio"></${video?'video':'audio'}>${video?'':'<p class="hint">Audio recording. Video was not saved for this meeting.</p>'}`}</aside><section class="ask-panel" id="ask-panel"><div class="ask-head"><strong>✧ Ask Saamba</strong><button id="ask-collapse" type="button" aria-label="Collapse Ask Saamba" aria-expanded="true">${icon('chevron')}</button></div><div id="ask-body"><div class="ask-content"><div class="suggestions"><button data-question="What were the most important insights?">What were the important insights?</button><button data-question="What remains unresolved?">Anything left unresolved?</button>${m.action_items?.length?'<button data-question="Help me plan the action items.">Help me plan the action items</button>':'<button data-question="Draft a follow-up email based on this meeting.">Draft a follow-up email</button>'}</div><div class="chat-messages" aria-live="polite"></div></div><form id="ask-form"><button id="ask-expand" type="button" aria-label="Expand Ask Saamba" aria-expanded="false">${icon('chevron')}</button><input id="ask-input" type="text" maxlength="2000" placeholder="Ask about your meetings…" aria-label="Ask Saamba" required><div class="ask-controls"><div class="share-menu scope-menu"><button type="button" class="subtle-button" id="ask-scope-toggle" aria-expanded="false">This call ${icon('chevron')}</button><div class="share-options" id="ask-scope-options" hidden><button type="button" data-scope="this">This call</button><button type="button" data-scope="mine">My meetings</button><button type="button" disabled>Team calls</button><button type="button" disabled>All calls</button></div></div><button class="ask-send" type="submit" aria-label="Send question"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 9.5 14.5M21 3l-7 18-4.5-6.5L3 10z"/></svg></button></div></form></div></section>`;
  const title=$('#meeting-title');title.onclick=()=>{
    editing=true;const input=document.createElement('input');input.className='title-input';input.value=m.title;input.maxLength=200;input.setAttribute('aria-label','Meeting name');title.replaceWith(input);input.focus();input.setSelectionRange(input.value.length,input.value.length);let done=false;
    const save=async()=>{if(done)return;done=true;const value=input.value.trim();try{if(value&&value!==m.title)await api(`/api/meetings/${id}/rename`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:value})});}catch(e){alert(e.message);}finally{editing=false;current=null;refresh();}};
    input.onblur=save;input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.value=m.title;input.blur();}};
  };
  for(const name of ['share','rewrite','download']){const toggle=$('#'+name+'-toggle'),menu=$('#'+name+'-options');if(toggle)toggle.onclick=()=>{const opening=menu.hidden;document.querySelectorAll('.share-options').forEach(x=>x.hidden=true);document.querySelectorAll('[aria-expanded]').forEach(x=>x.setAttribute('aria-expanded','false'));menu.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));};}
  document.querySelectorAll('[data-download]').forEach(button=>button.onclick=async()=>{
    if(downloads.has(id))return;
    const format=button.dataset.download;downloads.add(id);$('#download-options').hidden=true;
    const toggle=$('#download-toggle');toggle.disabled=true;toggle.setAttribute('aria-expanded','false');toggle.querySelector('.download-label').innerHTML=spinner()+' Downloading…';
    try{
      const response=await fetch(`/api/meetings/${encodeURIComponent(id)}/download?format=${encodeURIComponent(format)}`);
      if(!response.ok){let message='Could not prepare the download.';try{message=(await response.json()).error||message;}catch(_){}throw Error(message);}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download=(m.title.replace(/[\\/\x00-\x1f\x7f]/g,' ').trim().slice(0,120)||'Meeting')+(format==='audio-webm'?'.webm':'.'+format);
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){showToast(error.message);}finally{downloads.delete(id);if(current===id){const t=$('#download-toggle');if(t){t.disabled=false;t.querySelector('.download-label').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/></svg> Download';}}}
  });
  const deleteToggle=$('#delete-toggle'),deletePopover=$('#delete-popover');
  deleteToggle.onclick=()=>{deletePopover.hidden=!deletePopover.hidden;deleteToggle.setAttribute('aria-expanded',String(!deletePopover.hidden));};
  $('#delete-next').onclick=()=>{deletePopover.hidden=true;deleteToggle.setAttribute('aria-expanded','false');$('#delete-error').textContent='';$('#delete-dialog').showModal();};
  $('#delete-form').onsubmit=async e=>{e.preventDefault();$('#delete-yes').disabled=true;try{await api(`/api/meetings/${id}/delete`,{method:'POST'});$('#delete-dialog').close();selected=null;current=null;lastVersion=null;$('#detail').innerHTML='<div class="empty"><h2>Choose a meeting.</h2><p>Select a conversation from your library.</p></div>';await refresh();}catch(err){$('#delete-error').textContent=err.message;}finally{$('#delete-yes').disabled=false;}};
  for(const [button,action] of [['make-transcript','transcript'],['make-summary','summary']]){const el=$('#'+button);if(el)el.onclick=async()=>{if(action==='transcript'&&m.summary&&!confirm('A new transcript will remove the current summary. Continue?'))return;try{await api(`/api/meetings/${id}/${action}`,{method:'POST'});current=null;refresh();}catch(e){alert(e.message);}};}
  if($('#recover-live'))$('#recover-live').onclick=async()=>{if(capture&&capture.id===id){alert('Use Stop recording to finish the active meeting.');return;}try{await api(`/api/live/${id}/finish`,{method:'POST'});current=null;refresh();}catch(e){alert(e.message);}};
  const search=$('#search');search.value=searchTerm;search.oninput=()=>document.querySelectorAll('.segment').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(search.value.toLowerCase()));search.dispatchEvent(new Event('input'));
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{const action=b.dataset.tab==='actions';document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tab-content').forEach(x=>x.hidden=x.id!==(action?'summary':b.dataset.tab));$('#search-wrap').hidden=b.dataset.tab!=='transcript';const note=$('#speaker-note');if(note)note.hidden=b.dataset.tab!=='transcript';if(action){const target=$('#action-section');if(target)$('#notes-scroll').scrollTop=target.offsetTop-$('#notes-scroll').offsetTop;else showToast('No action items are available yet.');}else $('#notes-scroll').scrollTop=0;});
  document.querySelectorAll('[data-action]').forEach(box=>box.onchange=async()=>{const desired=box.checked;box.disabled=true;try{await api(`/api/meetings/${id}/action-check`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:box.dataset.action,checked:desired})});const item=m.action_items.find(a=>a.key===box.dataset.action);if(item)item.checked=desired;const count=m.action_items.filter(a=>!a.checked).length;$('.action-count').textContent=count;$('.action-count').setAttribute('aria-label',`${count} remaining`);lastVersion=JSON.stringify([m.id,m.title,m.status,m.error,m.summary,m.summary_preview,m.transcript,m.mime,m.action_items]);}catch(e){box.checked=!desired;showToast(e.message);}finally{box.disabled=false;}});
  document.querySelectorAll('.copy-section').forEach(button=>button.onclick=async()=>{const section=button.closest('.summary-section');try{const copy=section.cloneNode(true);copy.querySelectorAll('button').forEach(el=>el.remove());await navigator.clipboard.writeText(copy.innerText.trim());showToast('Section copied.');}catch(e){showToast('Could not copy this section.');}});
  document.querySelectorAll('[data-citation]').forEach(button=>button.onclick=()=>{const player=$('#player');if(player){player.currentTime=Number(button.dataset.citation);player.play().catch(()=>{});}});
  const chat=chats[id];
  const chatPanel=$('#ask-panel'),chatInput=$('#ask-input'),chatScope=$('#ask-scope-toggle'),scopeMenu=$('#ask-scope-options'),chatMessages=$('.chat-messages');
  const chatContent=$('.ask-content'),suggestions=$('.suggestions');
  const renderChat=()=>{suggestions.hidden=!!chat.messages.length||!!chatInput.value.trim();chatMessages.innerHTML=chat.messages.map(x=>`<div class="chat-message ${esc(x.role)}">${x.role==='assistant'?markdown(x.text):esc(x.text)}</div>`).join('');chatContent.scrollTop=chatContent.scrollHeight;};
  const setCollapsed=collapsed=>{chat.collapsed=collapsed;chatPanel.classList.toggle('is-collapsed',collapsed);$('#ask-collapse').setAttribute('aria-expanded',String(!collapsed));$('#ask-expand').setAttribute('aria-expanded',String(!collapsed));scopeMenu.hidden=true;chatScope.setAttribute('aria-expanded','false');};
  setCollapsed(chat.collapsed);$('#ask-collapse').onclick=()=>setCollapsed(true);$('#ask-expand').onclick=()=>setCollapsed(false);
  const updateScope=()=>{chatScope.innerHTML=(chat.scope==='mine'?'My meetings':'This call')+' '+icon('chevron');};updateScope();
  chatScope.onclick=()=>{if(chat.collapsed)setCollapsed(false);const opening=scopeMenu.hidden;document.querySelectorAll('.share-options').forEach(x=>x.hidden=true);document.querySelectorAll('[aria-expanded]').forEach(x=>{if(x!==$('#ask-collapse')&&x!==$('#ask-expand'))x.setAttribute('aria-expanded','false');});scopeMenu.hidden=!opening;chatScope.setAttribute('aria-expanded',String(opening));};
  scopeMenu.querySelectorAll('[data-scope]').forEach(option=>option.onclick=()=>{chat.scope=option.dataset.scope;updateScope();scopeMenu.hidden=true;chatScope.setAttribute('aria-expanded','false');});
  chatInput.value=chat.question;chatInput.onfocus=()=>{if(chat.collapsed)setCollapsed(false);};chatInput.oninput=()=>{chat.question=chatInput.value;suggestions.hidden=!!chat.messages.length||!!chat.question.trim();};renderChat();
  document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{chatInput.value=b.dataset.question;chat.question=chatInput.value;suggestions.hidden=true;chatInput.focus();});
  $('#ask-form').onsubmit=async e=>{e.preventDefault();if(chat.collapsed)setCollapsed(false);const question=chatInput.value.trim();if(!question||chat.pending)return;chat.pending=true;chat.messages.push({role:'user',text:question});chatInput.value='';chat.question='';renderChat();const send=$('.ask-send');send.disabled=true;try{const response=await api('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,scope:chat.scope,meeting_id:id})});chat.messages.push({role:'assistant',text:response.answer});}catch(err){chat.messages.push({role:'assistant',text:err.message});}finally{chat.pending=false;if(current===id){send.disabled=false;renderChat();}}};
  const player=$('#player');if(player){if(position)player.currentTime=position;if(playing)player.play().catch(()=>{});let active=null;const updateWave=()=>{const progress=Number.isFinite(player.duration)&&player.duration>0?player.currentTime/player.duration:0;document.querySelectorAll('.waveform i').forEach((bar,i,all)=>bar.classList.toggle('played',(i+0.5)/all.length<=progress));};player.addEventListener('seeked',updateWave);player.addEventListener('loadedmetadata',updateWave);player.addEventListener('timeupdate',()=>{updateWave();if(player.paused||$('#transcript').hidden)return;const all=[...document.querySelectorAll('.segment')];let target=null;for(const item of all){if(Number(item.dataset.time)<=player.currentTime)target=item;else break;}if(target!==active){if(active)active.classList.remove('is-playing');active=target;if(active){active.classList.add('is-playing');if(!active.hidden){const scroller=$('#notes-scroll');const top=active.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-(scroller.clientHeight-active.offsetHeight)/2;scroller.scrollTo({top,behavior:'smooth'});}}}});document.querySelectorAll('.segment').forEach(b=>b.onclick=()=>{player.currentTime=Number(b.dataset.time);player.play().catch(()=>{});});}
  $('#notes-scroll').scrollTop=oldScroll;
}
$('#import-button').onclick=$('#empty-import').onclick=()=>$('#import-dialog').showModal();$('#close-dialog').onclick=()=>$('#import-dialog').close();$('#audio').onchange=e=>{if(!$('#title').value)$('#title').value=e.target.files[0]?.name.replace(/\.[^.]+$/,'')||''};$('#upload-form').onsubmit=async e=>{e.preventDefault();const file=$('#audio').files[0];if(!file)return;$('#submit').disabled=true;$('#submit').textContent='Importing…';$('#upload-error').textContent='';try{const m=await api('/api/meetings',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-Meeting-Title':encodeURIComponent($('#title').value)},body:file});$('#import-dialog').close();e.target.reset();selected=m.id;current=null;await refresh();}catch(err){$('#upload-error').textContent=err.message;}finally{$('#submit').disabled=false;$('#submit').textContent='Import meeting';}};
refresh().catch(e=>$('#meetings').textContent=e.message);setInterval(()=>refresh().catch(()=>{}),5000);

$('#delete-cancel').onclick=()=>$('#delete-dialog').close();
document.addEventListener('click',e=>{
  if(!e.target.closest('.share-menu')){document.querySelectorAll('.share-options').forEach(x=>x.hidden=true);document.querySelectorAll('#share-toggle,#rewrite-toggle,#ask-scope-toggle,#download-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));}
  if(!e.target.closest('.delete-menu')){const pop=$('#delete-popover');if(pop)pop.hidden=true;const toggle=$('#delete-toggle');if(toggle)toggle.setAttribute('aria-expanded','false');}
  if(!e.target.closest('.notes-card, .media-pane, dialog')){const player=$('#player');if(player&&!player.paused)player.pause();}
});
