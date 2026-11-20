const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const bridge=fs.readFileSync(path.join(__dirname,'../apps-script/Bridge.html'),'utf8');
const script=bridge.match(/<script>([\s\S]*?)<\/script>/)[1].replace('<?!= channel ?>','ab12cd34');
const out=[],calls=[];
let onMessage;
const top={postMessage:(payload,origin)=>out.push({payload,origin})};
const runner={
  withSuccessHandler(fn){this.success=fn;return this},
  withFailureHandler(fn){this.failure=fn;return this},
  getPublicData(){calls.push('getPublicData');this.success({candidates:[{id:'1',name:'Contoh',gender:'P'}]})},
  loginVoter(ic){calls.push(['loginVoter',ic]);this.success({token:'test'})}
};
const context={
  window:{top,google:{script:{run:runner}},addEventListener:(type,fn)=>{if(type==='message')onMessage=fn}},
  google:{script:{run:runner}},
  setTimeout:()=>{},
  Object,Array,Number,String
};
vm.createContext(context);
new vm.Script(script).runInContext(context);
assert.equal(out[0].payload.kind,'BRIDGE_READY');
assert.equal(out[0].origin,'https://kea3123-bit.github.io');

const send=(origin,method,args,id=1)=>onMessage({
  origin,source:top,data:{kind:'BRIDGE_REQUEST',channel:'ab12cd34',id,method,args}
});
send('https://evil.example','getPublicData',[]);
assert.equal(calls.length,0,'rejects untrusted parent');
send('https://kea3123-bit.github.io','readRoster_',[]);
assert.equal(calls.length,0,'private method is not callable');
assert.equal(out.at(-1).payload.ok,false);
send('https://kea3123-bit.github.io','getPublicData',[],2);
assert.equal(calls.length,1);
assert.equal(out.at(-1).payload.kind,'BRIDGE_RESULT');
assert.equal(out.at(-1).payload.result.candidates[0].name,'Contoh');
send('https://kea3123-bit.github.io','loginVoter',['900101021234'],3);
assert.deepEqual(calls.at(-1),['loginVoter','900101021234']);
assert.equal(out.at(-1).payload.ok,true);
console.log('Passed: bridge origin restriction, method whitelist, google.script.run proxy, response correlation.');
