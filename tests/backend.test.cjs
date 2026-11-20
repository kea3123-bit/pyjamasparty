const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class Sheet {
  constructor(rows = []) { this.rows = rows; }
  getLastRow() { return this.rows.length; }
  appendRow(values) { this.rows.push(values); }
  getDataRange() { return this.getRange(1,1,this.rows.length,Math.max(...this.rows.map(r=>r.length))); }
  getRange(r,c,height=1,width=1) {
    const sheet=this;
    return {
      getDisplayValues() {
        return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>{
          const v=sheet.rows[r-1+i]?.[c-1+j];
          return v==null?'':String(v);
        }));
      },
      setValues(data) {
        data.forEach((row,i)=>row.forEach((value,j)=>{
          if(!sheet.rows[r-1+i])sheet.rows[r-1+i]=[];
          sheet.rows[r-1+i][c-1+j]=value;
        }));
      },
      setValue(value) {
        if(!sheet.rows[r-1])sheet.rows[r-1]=[];
        sheet.rows[r-1][c-1]=value;
      }
    };
  }
}
class Book {
  constructor(sheets){this.sheets=sheets;}
  getSheetByName(name){return this.sheets[name]||null;}
  insertSheet(name){return this.sheets[name]=new Sheet();}
}
const roster = new Book({Sheet1:new Sheet([
  ['BIL','NAMA','NOKP','JAWATAN','NO TELEFON'],
  ['1','WAN SATU','900101021234','PPP','0121114567'],
  ['2','WAN SATU','900101021234','PPP','0121114567'],
  ['3','WAN DUA','920101021236','PPP','0123338899'],
  ['4','MAN SATU','900101021235','PPP','0131230101'],
  ['5','MAN DUA','900101021237','PPP','0195552222']
])});
const database = new Book({
  UNDI:new Sheet([['MASA','HASH_PENGUNDI','PILIHAN_ID','STATUS']]),
  CALON:new Sheet([['ID','NAMA_CALON','JANTINA','AKTIF']]),
  TETAPAN:new Sheet([
    ['TETAPAN','NILAI'],['voting_open','TRUE'],['max_votes','3'],
    ['female_winners','7'],['male_winners','3']
  ])
});
const props = new Map([['ADMIN_PASSWORD','test-only-very-long-password']]);
const cache = new Map();
const sandbox = {
  SpreadsheetApp: {
    openById:id=>id==='1YU2UT5BVFJo5JRacTVPXZKyPkOp-Z3DQ-HC5jD7zjf8'?roster:database,
    flush:()=>{}
  },
  PropertiesService:{getScriptProperties:()=>({
    getProperty:key=>props.get(key),
    setProperty:(key,value)=>props.set(key,value)
  })},
  CacheService:{getScriptCache:()=>({
    get:key=>cache.get(key)||null,
    put:(key,value)=>cache.set(key,value),
    remove:key=>cache.delete(key)
  })},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  Utilities:{
    getUuid:()=>crypto.randomUUID(),
    DigestAlgorithm:{SHA_256:'sha256'},
    Charset:{UTF_8:'utf8'},
    computeDigest:(_algorithm,text)=>[...crypto.createHash('sha256').update(text).digest()]
  }
};
vm.createContext(sandbox);
const gs=fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8');
vm.runInContext(gs,sandbox);

const data=sandbox.getPublicData();
assert.equal(data.candidates.length,4,'duplicate IC only produces one nominee');
assert.deepEqual([...new Set(data.candidates.map(c=>c.gender))].sort(),['L','P']);
assert.ok(data.candidates.every(c=>!('ic' in c)&&!('phone' in c)),'public results exclude identifiers');
assert.equal(database.getSheetByName('CALON').rows[0][4],'SINGKATAN','database has editable abbreviation column');
assert.ok(data.candidates.every(c=>c.shortName),'every nominee has a wheel abbreviation');
const firstCandidateRow=database.getSheetByName('CALON').rows.find(row=>row[0]===data.candidates[0].id);
firstCandidateRow[4]='W. SATU CUSTOM';
assert.equal(sandbox.getPublicData().candidates[0].shortName,'W. SATU CUSTOM','manual Sheet edit reaches frontend');
assert.equal(firstCandidateRow[4],'W. SATU CUSTOM','backend never replaces custom abbreviation');
assert.throws(()=>sandbox.loginVoter('000000000000'),/tidak ditemui/);
const voter=sandbox.loginVoter('900101021234');
assert.equal(voter.alreadyVoted,false);
const firstThree=data.candidates.slice(0,3).map(c=>c.id);
assert.throws(()=>sandbox.castVote(voter.token,[firstThree[0],firstThree[0],firstThree[1]]),/calon yang sama/i);
assert.equal(sandbox.castVote(voter.token,firstThree).ok,true);
const repeat=sandbox.loginVoter('900101021234');
assert.equal(repeat.alreadyVoted,true);
assert.throws(()=>sandbox.castVote(repeat.token,firstThree),/sudah direkodkan/);
assert.equal(database.getSheetByName('UNDI').getLastRow(),2);
assert.equal(database.getSheetByName('UNDI').rows[1][1].length,64,'only hashed voter id is saved');
assert.throws(()=>sandbox.adminLeaderboard('invalid'),/tidak sah/);
assert.throws(()=>sandbox.adminLogin('wrong'),/tidak tepat/);
const admin=sandbox.adminLogin('test-only-very-long-password');
const results=sandbox.adminLeaderboard(admin.token);
assert.equal(results.totalVoters,1);
assert.equal(results.totalStars,3);
assert.equal(results.eligibleVoters,4);
assert.equal(sandbox.adminSetVotingOpen(admin.token,false).open,false);
assert.throws(()=>sandbox.loginVoter('920101021236'),/telah ditutup/);
console.log('Passed: unique nominees, voter validation, 3 distinct votes, one vote/person, admin auth, private results, close voting.');
