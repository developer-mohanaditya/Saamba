const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert');
let appended, listener, observer;const sent=[], handlers={};let joined=false;
function element(){return {textContent:'',disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener:(name,fn)=>{handlers[name]=fn},setPointerCapture(){}}}
const label=element(),message=element(),button=element(),drag=element(),control=element();
button.addEventListener=(name,fn)=>{handlers.capture=fn};
const shadow={innerHTML:'',querySelector:q=>({'.capture':button,'.drag':drag,'.control':control,'.label':label,'.message':message}[q])};
const root={id:'',style:{},attachShadow:()=>shadow,getBoundingClientRect:()=>({left:100,top:20,width:150,height:40})};
const document={getElementById:()=>null,createElement:()=>root,querySelectorAll:()=>joined?[{getAttribute:()=> 'Leave call'}]:[],body:{appendChild:x=>appended=x},documentElement:{}};
const chrome={runtime:{sendMessage:async m=>{sent.push(m);return {ok:true}},onMessage:{addListener:fn=>listener=fn}}};
class MutationObserver {constructor(fn){observer=fn} observe(){}}
vm.runInNewContext(fs.readFileSync('extension/meet-control.js','utf8'),{document,chrome,MutationObserver,location:{pathname:'/abc-defg-hij'},window:{innerWidth:1000,innerHeight:800}});
(async()=>{
 assert.equal(appended.id,'saamba-meet-control');assert.equal(root.style.display,'none');joined=true;observer();assert.equal(root.style.display,'block');
 await handlers.capture();assert.equal(sent[0].action,'start');listener({type:'recording-status',recording:true});assert.equal(label.textContent,'Stop recording');
 await handlers.capture();assert.equal(sent[1].action,'stop');assert.equal(label.textContent,'Saving…');assert.equal(button.disabled,true);
 listener({type:'recording-status',recording:false});assert.equal(label.textContent,'Capture video');assert.equal(button.disabled,false);
 joined=false;observer();assert.equal(root.style.display,'none');
 console.log('Meeting control join visibility and stop state: passed');
})().catch(e=>{console.error(e);process.exitCode=1});
