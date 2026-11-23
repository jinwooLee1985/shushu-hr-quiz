#!/usr/bin/env node
/**
 * 문제은행 검증기 — 봇(bot/hr_quiz.js)과 똑같은 파싱·채점 코드로 quiz_bank.json을 검사합니다.
 * 사용: node validate.js   (실패 시 종료 코드 1)
 */
const fs = require("fs"), path = require("path");
const store = {};
global.DataBase = { getDataBase: k => (k in store ? store[k] : null), setDataBase: (k, v) => { store[k] = String(v); } };
global.java = { lang: { Runnable: function (o) { return o; }, Thread: function () { this.start = () => {}; this.interrupt = () => {}; this.isAlive = () => true; } },
  util: { concurrent: { atomic: { AtomicBoolean: function () {} } } } };
const bot = fs.readFileSync(path.join(__dirname, "bot/hr_quiz.js"), "utf8").replace("const scriptName", "var scriptName");
const api = new Function(bot + "\nreturn { rowToQuiz, judge, mat, QUIZ };")();

const bank = JSON.parse(fs.readFileSync(path.join(__dirname, "quiz_bank.json"), "utf8"));
const errs = [], warns = [], ids = new Set();
const REQ = ["id", "type", "q", "answer", "hint", "ok", "exp", "law", "checked", "source", "test"];
if (!/^\d{4}-\d{2}-\d{2}$/.test(bank.updated || "")) errs.push("updated 날짜 형식 오류 (YYYY-MM-DD)");
if (bank.count !== bank.rows.length) errs.push(`count(${bank.count}) ≠ 실제 행 수(${bank.rows.length})`);
for (const r of bank.rows) {
  const tag = `[id ${r.id}]`;
  for (const f of REQ) if (r[f] === undefined || String(r[f]).trim() === "") errs.push(`${tag} 필수 항목 누락: ${f}`);
  if (ids.has(String(r.id))) errs.push(`${tag} id 중복`);
  ids.add(String(r.id));
  if (/^G-/.test(String(r.id))) errs.push(`${tag} 'G-'로 시작하는 id는 계산형 전용`);
  if (r.checked && !/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) errs.push(`${tag} checked 날짜 형식 오류`);
  if (!/^\[.+\]$/.test(String(r.law || "").trim())) warns.push(`${tag} law는 [법령명 제00조] 형식 권장`);
  if (String(r.use || "Y").toUpperCase() === "N") continue;
  const q = api.rowToQuiz(r);
  if (!q) { errs.push(`${tag} 봇이 읽을 수 없는 행 (type/answer 확인)`); continue; }
  if (api.judge(q, String(r.test)) !== true) errs.push(`${tag} test 답 "${r.test}"을 봇이 정답으로 인식하지 못함`);
  if (r.wrong && api.judge(q, String(r.wrong)) === true) errs.push(`${tag} wrong 답 "${r.wrong}"을 봇이 정답으로 처리함`);
  if (q.type === "ox" && !/^\[O\/X\]/.test(q.q)) warns.push(`${tag} O/X 문제는 문제 앞에 [O/X] 표기 권장`);
}
warns.forEach(w => console.log("경고", w));
errs.forEach(e => console.log("오류", e));
console.log(`\n검사 ${bank.rows.length}문제 — 오류 ${errs.length}, 경고 ${warns.length}`);
process.exit(errs.length ? 1 : 0);
