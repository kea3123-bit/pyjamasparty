/**
 * A NIGHT UNDER THE STARS — SISTEM UNDIAN BINTANG MALAM
 * SMK Bandar Baru Sungai Lalang · 26 November 2026
 *
 * This is a DATABASE BRIDGE ONLY. The complete voting UI lives on GitHub Pages.
 * Apps Script serves a tiny hidden iframe bridge using google.script.run.
 * Deploy as a Web App: Execute as Me; access must permit school voters.
 *
 * Script Property REQUIRED:
 * ADMIN_PASSWORD = a unique, strong admin password (16+ characters suggested)
 *
 * No voter IC/phone number is ever stored in the vote database.
 */

const APP = Object.freeze({
  ROSTER_ID: '1YU2UT5BVFJo5JRacTVPXZKyPkOp-Z3DQ-HC5jD7zjf8',
  DB_ID: '1JTDub0wvhC8O991Gnc0neJdHupONWCM5PO9_T0-mKVw',
  ROSTER_TAB: 'Sheet1',
  VOTES_TAB: 'UNDI',
  CANDIDATES_TAB: 'CALON',
  SETTINGS_TAB: 'TETAPAN',
  SESSION_SECONDS: 14400
});

/** Serves a message-only bridge, never the public voting interface. */
function doGet(e) {
  const raw = (e && e.parameter && e.parameter.channel) || '';
  const channel = String(raw).replace(/[^a-fA-F0-9]/g, '').slice(0,64);
  const template = HtmlService.createTemplateFromFile('Bridge');
  template.channel = channel;
  return template.evaluate()
    .setTitle('Sambungan Data Undian Bintang Malam')
    // Required for hosting the full UI on GitHub Pages.
    // Bridge.html checks the embedding page's origin + random session channel.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Public: exposes only nominee names and gender, never KP/telephone. */
function getPublicData() {
  const db = ensureDb_();
  const settings = readSettings_(db);
  return {
    candidates: readCandidates_(db),
    open: settings.open,
    maxVotes: settings.maxVotes,
    femaleWinners: settings.femaleWinners,
    maleWinners: settings.maleWinners
  };
}

/**
 * Voter login verifies BOTH the full 12-digit IC and last 4 phone digits
 * against the original, read-only staff spreadsheet.
 */
function loginVoter(icInput, lastFourInput) {
  const ic = digits_(icInput);
  const phoneFour = digits_(lastFourInput);
  if (!/^\d{12}$/.test(ic) || !/^\d{4}$/.test(phoneFour)) {
    throw new Error('Nombor KP atau empat digit telefon tidak sah.');
  }
  const db = ensureDb_();
  if (!readSettings_(db).open) throw new Error('Sesi undian telah ditutup.');
  const roster = readRoster_();
  const person = roster.find(p => p.ic === ic && p.phone.slice(-4) === phoneFour);
  if (!person) throw new Error('Maklumat tidak sepadan dengan rekod sekolah. Sila semak nombor KP dan telefon.');

  const voterHash = sha_('pengundi:' + ic);
  const token = Utilities.getUuid() + Utilities.getUuid();
  const alreadyVoted = hasVoted_(db.getSheetByName(APP.VOTES_TAB), voterHash);
  CacheService.getScriptCache().put(
    'vote:' + token,
    JSON.stringify({voterHash: voterHash, name: person.name}),
    APP.SESSION_SECONDS
  );
  return {token: token, name: person.name, alreadyVoted: alreadyVoted};
}

/**
 * Atomic write. ScriptLock prevents two browser tabs from voting twice.
 * Selected IDs must be three distinct active nominees in the server's sheet.
 */
function castVote(sessionToken, candidateIds) {
  const session = voterSession_(sessionToken);
  if (!Array.isArray(candidateIds) || candidateIds.length !== 3) {
    throw new Error('Anda mesti memilih tepat tiga orang calon.');
  }
  const ids = candidateIds.map(String);
  if (new Set(ids).size !== 3) throw new Error('Calon yang sama tidak boleh dipilih dua kali.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Pelayan sedang sibuk. Sila cuba lagi.');
  try {
    const db = ensureDb_();
    if (!readSettings_(db).open) throw new Error('Sesi undian telah ditutup.');
    const allowed = new Set(readCandidates_(db).map(c => c.id));
    if (ids.some(id => !allowed.has(id))) throw new Error('Terdapat calon tidak sah atau tidak aktif.');
    const voteSheet = db.getSheetByName(APP.VOTES_TAB);
    if (hasVoted_(voteSheet, session.voterHash)) {
      throw new Error('Undian anda sudah direkodkan. Setiap warga sekolah hanya boleh mengundi sekali.');
    }
    voteSheet.appendRow([new Date(), session.voterHash, ids.join('|'), 'SAH']);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().remove('vote:' + sessionToken);
    return {ok: true, message: 'Undian anda berjaya direkodkan.'};
  } finally {
    lock.releaseLock();
  }
}

/** Admin authentication. Password MUST live in Script Properties, not source. */
function adminLogin(password) {
  const configured = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!configured || configured.length < 12) {
    throw new Error('Pentadbir belum menyediakan ADMIN_PASSWORD (sekurang-kurangnya 12 aksara) dalam Script Properties.');
  }
  if (typeof password !== 'string' || password !== configured) {
    throw new Error('Kata laluan pentadbir tidak tepat.');
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('admin:' + token, 'yes', APP.SESSION_SECONDS);
  return {token: token};
}

/** Confidential: must be authenticated every time, not just hidden in UI. */
function adminLeaderboard(adminToken) {
  assertAdmin_(adminToken);
  const db = ensureDb_();
  const candidates = readCandidates_(db);
  const votes = readVoteRows_(db.getSheetByName(APP.VOTES_TAB));
  const totals = Object.create(null);
  const votedBy = new Set();
  candidates.forEach(c => totals[c.id] = 0);
  votes.forEach(row => {
    if (row.status !== 'SAH' || votedBy.has(row.voterHash)) return;
    votedBy.add(row.voterHash);
    row.ids.forEach(id => {
      if (Object.prototype.hasOwnProperty.call(totals, id)) totals[id]++;
    });
  });
  const ranked = candidates.map(c => ({
    id: c.id, name: c.name, gender: c.gender, votes: totals[c.id]
  })).sort((a,b) => b.votes - a.votes || a.name.localeCompare(b.name, 'ms'));
  const settings = readSettings_(db);
  return {
    female: ranked.filter(c => c.gender === 'P'),
    male: ranked.filter(c => c.gender === 'L'),
    totalVoters: votedBy.size,
    totalStars: ranked.reduce((sum,c) => sum+c.votes, 0),
    eligibleVoters: new Set(readRoster_().map(p => p.ic)).size,
    femaleWinners: settings.femaleWinners,
    maleWinners: settings.maleWinners,
    open: settings.open
  };
}

/** Only admin can close or reopen voting. */
function adminSetVotingOpen(adminToken, shouldOpen) {
  assertAdmin_(adminToken);
  if (typeof shouldOpen !== 'boolean') throw new Error('Status undian tidak sah.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Pelayan sedang sibuk. Cuba lagi.');
  try {
    const db = ensureDb_();
    const sheet = db.getSheetByName(APP.SETTINGS_TAB);
    const values = sheet.getDataRange().getDisplayValues();
    const index = values.findIndex((row,i) => i > 0 && row[0] === 'voting_open');
    if (index < 0) throw new Error('Tetapan voting_open tidak ditemui.');
    sheet.getRange(index+1,2).setValue(shouldOpen ? 'TRUE' : 'FALSE');
    SpreadsheetApp.flush();
    return {open: shouldOpen};
  } finally {
    lock.releaseLock();
  }
}

function adminLogout(adminToken) {
  if (typeof adminToken === 'string') CacheService.getScriptCache().remove('admin:' + adminToken);
  return {ok:true};
}

// ----------------- Server-only private helpers -----------------

function ensureDb_() {
  const db = SpreadsheetApp.openById(APP.DB_ID);
  let votes = db.getSheetByName(APP.VOTES_TAB);
  let candidates = db.getSheetByName(APP.CANDIDATES_TAB);
  let settings = db.getSheetByName(APP.SETTINGS_TAB);
  if (!votes || !candidates || !settings) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('Sistem sedang disediakan. Cuba sebentar lagi.');
    try {
      votes = db.getSheetByName(APP.VOTES_TAB) || db.insertSheet(APP.VOTES_TAB);
      candidates = db.getSheetByName(APP.CANDIDATES_TAB) || db.insertSheet(APP.CANDIDATES_TAB);
      settings = db.getSheetByName(APP.SETTINGS_TAB) || db.insertSheet(APP.SETTINGS_TAB);
    } finally { lock.releaseLock(); }
  }
  if (votes.getLastRow() < 1) votes.appendRow(['MASA','HASH_PENGUNDI','PILIHAN_ID','STATUS']);
  if (candidates.getLastRow() < 1) candidates.appendRow(['ID','NAMA_CALON','JANTINA','AKTIF']);
  if (settings.getLastRow() < 1) {
    settings.getRange(1,1,5,2).setValues([
      ['TETAPAN','NILAI'],['voting_open','TRUE'],['max_votes','3'],
      ['female_winners','7'],['male_winners','3']
    ]);
  }
  if (candidates.getLastRow() < 2) {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) throw new Error('Senarai calon sedang disediakan. Cuba lagi.');
    try {
      if (candidates.getLastRow() < 2) {
        const seen = new Set();
        const initial = readRoster_().filter(p => {
          if (seen.has(p.ic)) return false;
          seen.add(p.ic);
          return true;
        }).map(p => [
          'C'+sha_('calon:'+p.ic).slice(0,18),
          p.name,
          Number(p.ic.slice(-1))%2 === 0 ? 'P' : 'L',
          'YA'
        ]);
        if (initial.length) candidates.getRange(2,1,initial.length,4).setValues(initial);
        SpreadsheetApp.flush();
      }
    } finally {lock.releaseLock();}
  }
  return db;
}

function readRoster_() {
  const roster = SpreadsheetApp.openById(APP.ROSTER_ID).getSheetByName(APP.ROSTER_TAB);
  if (!roster) throw new Error('Tab senarai nama tidak ditemui.');
  if (roster.getLastRow() < 2) return [];
  return roster.getRange(2,1,roster.getLastRow()-1,5).getDisplayValues()
    .map(row => ({name:String(row[1]||'').trim(),ic:digits_(row[2]),phone:digits_(row[4])}))
    .filter(p => p.name && /^\d{12}$/.test(p.ic) && p.phone.length >= 4);
}

function readCandidates_(db) {
  const sheet = db.getSheetByName(APP.CANDIDATES_TAB);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,4).getDisplayValues()
    .filter(row => row[0] && row[1] && ['P','L'].includes(String(row[2]).trim().toUpperCase()) &&
      ['YA','TRUE','1'].includes(String(row[3]).trim().toUpperCase()))
    .map(row => ({id:String(row[0]),name:String(row[1]),gender:String(row[2]).toUpperCase()}));
}

function readVoteRows_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,4).getDisplayValues()
    .map(row => ({voterHash:row[1],ids:String(row[2]||'').split('|'),status:row[3]}));
}

function hasVoted_(sheet, voterHash) {
  return readVoteRows_(sheet).some(r => r.voterHash === voterHash && r.status === 'SAH');
}

function readSettings_(db) {
  const values = db.getSheetByName(APP.SETTINGS_TAB).getDataRange().getDisplayValues();
  const map = {};
  values.slice(1).forEach(r => map[r[0]]=r[1]);
  return {
    open: String(map.voting_open).toUpperCase() === 'TRUE',
    maxVotes: 3, // Fixed business rule, regardless of manual sheet edits
    femaleWinners: 7,
    maleWinners: 3
  };
}

function voterSession_(token) {
  if (typeof token !== 'string' || token.length < 36) throw new Error('Sila log masuk semula.');
  const value = CacheService.getScriptCache().get('vote:'+token);
  if (!value) throw new Error('Sesi anda telah tamat. Sila log masuk semula.');
  return JSON.parse(value);
}

function assertAdmin_(token) {
  if (typeof token !== 'string' || token.length < 36 ||
      CacheService.getScriptCache().get('admin:'+token) !== 'yes') {
    throw new Error('Akses pentadbir tidak sah atau sesi telah tamat.');
  }
}

function digits_(value) {return String(value==null?'':value).replace(/\D/g,'');}

function sha_(text) {
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty('VOTE_HASH_SALT');
  if (!salt) {
    // During ensureDb_ initialization another ScriptLock may already be held.
    // Setting is idempotent within the active initialization; avoid nested lock.
    salt = props.getProperty('VOTE_HASH_SALT') || Utilities.getUuid()+Utilities.getUuid();
    props.setProperty('VOTE_HASH_SALT',salt);
  }
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt+':'+text, Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');
}
