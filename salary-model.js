/* Política vigente: Tania, $1,050 semanales; los horarios miden el costo efectivo. */
(()=>{'use strict';const EFFECTIVE='2026-11-09',WEEK=604800000,ANCHOR=Date.parse(EFFECTIVE+'T00:00:00-06:00');
const date=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));
const isTania=p=>/^tania(?:\s|$)/i.test(String(p?.name||p?.employeeName||'').trim());
function week(ms){const d=date(ms),mid=Date.parse(d+'T00:00:00-06:00'),start=mid-((new Date(mid-21600000).getUTCDay()+6)%7)*86400000;return{start,startDate:date(start),end:start+WEEK,endDate:date(start+WEEK-1),key:'tania_'+start}}
function applies(p,ms=Date.now()){return isTania(p)&&date(ms)>=EFFECTIVE}
function details(profile,selected){if(!selected.length||!applies(profile,selected[0].start))return null;const w=week(selected[0].start);if(selected.some(s=>week(s.start).start!==w.start||s.end>w.end||Math.round(s.minutes*60)!==s.capacitySeconds))throw Error('Tania cobra $1,050 por semana completa. Selecciona turnos completos de una sola semana, de lunes a domingo.');return{salaryMode:'weekly-fixed',salaryWeekKey:w.key,salaryWeekStart:w.start,salaryWeekEnd:w.end,salaryWeekLabel:w.startDate+' al '+w.endDate,weeklyAmount:1050}}
function fixedRequest(r){return r?.salaryMode==='weekly-fixed'}
function validate(r){if(!fixedRequest(r))return false;const w=week(r.salaryWeekStart);return isTania(r)&&r.salaryWeekStart>=ANCHOR&&(r.salaryWeekStart-ANCHOR)%WEEK===0&&r.salaryWeekKey===w.key&&r.salaryWeekEnd===w.end&&r.weeklyAmount===1050&&r.rate===0&&(r.grossAmount??r.amount)===1050&&r.allocations?.every(a=>a.start>=w.start&&a.end<=w.end&&a.seconds===a.capacitySeconds)}
function weeklyStats(records,now=Date.now()){const w=week(now),summary=window.DarkisLedger.analyze(records,w.start,w.end,true,now),hours=summary.hours;return{...w,hours,amount:1050,effectiveRate:hours>0?1050/hours:null}}
window.DarkisSalary={EFFECTIVE,ANCHOR,WEEK,date,isTania,week,applies,details,fixedRequest,validate,weeklyStats};
})();
