// Prueba de punta a punta en Chromium: Inicio → robot automático → análisis → Historial → Robot.
// Las llamadas a ESPN pasan por curl (el navegador de pruebas no usa el proxy). Uso: node tests/e2e.js [AAAA-MM-DD] [liga]
const {chromium}=require('playwright'); const {execFile}=require('child_process'); const path=require('path');
const DAY=process.argv[2]||'2026-11-21', LG=process.argv[3]||'ita.1';
const viaCurl=r=>execFile('curl',['--silent','--show-error','--compressed','--max-time','30',r.request().url()],{maxBuffer:256e6},
  (e,out)=>e?r.fulfill({status:500,body:''}):r.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:out}));
(async()=>{ const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:400,height:860}}); const errs=[];
  await pg.route(/espn\.com/,viaCurl);
  await pg.route(/telegram\.org|googleapis|gstatic/,r=>r.fulfill({status:200,body:''}));
  pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const step=async(name,fn)=>{ try{ await fn(); console.log('OK   ',name); }catch(e){ console.log('FALLA',name,'·',e.message.split('\n')[0]); errs.push(name); } };
  await pg.goto('file://'+path.join(__dirname,'..','index.html'));
  await step('abre en Inicio',async()=>{ if(await pg.evaluate(()=>document.body.dataset.tab)!=='hoy') throw new Error('no abrió en Inicio'); });
  await step('carga partidos de la liga',async()=>{ await pg.selectOption('#autoLeague',LG); await pg.fill('#autoDate',DAY); await pg.dispatchEvent('#autoDate','change');
    await pg.waitForFunction(()=>document.querySelectorAll('#autoList .am').length>0,null,{timeout:150000}); });
  await step('robot analiza y recomienda',async()=>{ await pg.click('#btnAutoRun'); await pg.waitForFunction(()=>/Listo|No quedan/.test(document.getElementById('autoMsg').textContent),null,{timeout:300000});
    if(!/Listo/.test(await pg.textContent('#autoMsg'))) throw new Error(await pg.textContent('#autoMsg')); });
  await step('abre un análisis desde una recomendación',async()=>{ const bt=await pg.$('#autoRecs button[data-aid]'); if(!bt) throw new Error('sin recomendaciones'); await bt.click();
    await pg.waitForFunction(()=>document.body.dataset.tab==='robot',null,{timeout:120000}); });
  await step('el análisis conserva cuotas y datos extra de ESPN',async()=>{ const z=await pg.evaluate(()=>({ou:!!current.m.ou,odds:!!current.m.odds,ev:!!current.m.ev,extra:current.m.home.cardsA!=null}));
    if(!z.ev||!z.extra) throw new Error(JSON.stringify(z)); if(!z.ou) console.log('      (este partido no trae línea de más/menos)'); });
  for(const v of ['analisis','lineas','partido']) await step('vista '+v,async()=>{ await pg.click(`#subNav [data-go="${v}"]`); if(await pg.evaluate(()=>document.body.dataset.tab)!==v) throw new Error('no cambió'); });
  await step('no duplica el pronóstico ya guardado',async()=>{ await pg.click('#subNav [data-go="robot"]'); if(!(await pg.isDisabled('#btnSave'))) throw new Error('el botón Guardar sigue activo'); });
  await step('Historial',async()=>{ await pg.click('[data-nav="historial"]'); if(!(await pg.$$('#history .hx')).length) throw new Error('vacío'); });
  await step('Robot',async()=>{ await pg.click('[data-nav="robot"]'); await pg.click('#subNav [data-go="rvm"]'); });
  await step('registro automático de resultados (partido ya jugado)',async()=>{ const r=await pg.evaluate(async()=>{ const ev=(await dayMatches('2026-11-08','esp.1')).find(x=>x.id==='401882816');
      const m=await buildInputs(ev); saveAutoPrediction(m,robotCompute(m)); await autoSettle(); const x=state.history.find(z=>z.inputs.ev&&z.inputs.ev.id==='401882816'); return x&&x.actual; });
    if(!r||r.h!==1||r.a!==2) throw new Error(JSON.stringify(r)); });
  await pg.screenshot({path:path.join(__dirname,'.cache','e2e.png')});
  console.log(errs.length?'Errores: '+errs.join(' | '):'Sin errores en la página'); await b.close(); process.exit(errs.length?1:0); })();
