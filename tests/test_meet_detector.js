const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert');
const messages=[];let controls=[],observe,click,nextTimer=0;const timers=new Map();
const context={location:{pathname:'/abc-defg-hij'},document:{documentElement:{},querySelectorAll:()=>controls,addEventListener:(name,fn)=>{if(name==='click')click=fn}},MutationObserver:class {constructor(fn){observe=fn} observe(){}},setTimeout:fn=>{const id=++nextTimer;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),chrome:{runtime:{onMessage:{addListener:()=>{}},sendMessage:m=>{messages.push(m);return Promise.resolve()}}}};
function expire(){for(const [id,fn] of [...timers]){timers.delete(id);fn()}}
vm.runInNewContext(fs.readFileSync('extension/meet.js','utf8'),context);
assert.equal(messages.length,0,'pre-join does not trigger');
controls=[{getAttribute:()=> 'Leave call'}];observe();observe();assert.deepEqual(messages.map(m=>m.type),['joined-meeting']);
controls=[];observe();assert.equal(messages.length,1,'end is delayed');controls=[{getAttribute:()=> 'Leave call'}];observe();expire();assert.equal(messages.length,1,'transient disappearance does not end meeting');
controls=[];observe();expire();assert.deepEqual(messages.map(m=>m.type),['joined-meeting','meeting-ended']);assert(messages.every(m=>Object.keys(m).length===1),'no meeting contents sent');
controls=[{getAttribute:()=> 'Leave call'}];observe();assert.equal(messages[2].type,'joined-meeting');
click({target:{closest:()=>controls[0]}});assert.equal(messages[3].type,'meeting-ended','leave click immediately signals stop');
observe();assert.equal(messages.length,4,'meeting is not reannounced while leaving');
controls=[];observe();controls=[{getAttribute:()=> 'Leave call'}];observe();assert.equal(messages[4].type,'joined-meeting','a later meeting can be detected');
console.log('Google Meet join and end detector: passed');
