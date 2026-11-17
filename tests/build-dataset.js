// Arma el conjunto de prueba: partidos ya jugados, con los datos que el robot habría tenido ANTES del partido.
// Uso: node tests/build-dataset.js [salida.json]
const H=require('./harness'); const fs=require('fs'), path=require('path');
const LGS=(process.env.LGS||'eng.1,esp.1,ita.1,ger.1,fra.1,por.1,ned.1,arg.1,bra.1,chi.1,mex.1,usa.1,uefa.champions').split(',');
const MONTHS=(process.env.MONTHS||'202609,202610,202611').split(',');
(async()=>{
  const evs=[];
  for(const lg of LGS) for(const mo of MONTHS){ try{ const d=await H.curlJSON(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${mo}&limit=500`);
    for(const e of d.events||[]){ const m=H.parseEvent(e,lg); if(m&&m.done) evs.push(m); } }catch(e){ console.error('mes',lg,mo,e.message); } }
  console.error('partidos terminados:',evs.length);
  let n=0; const out=[];
  await H.pool(evs,6,async ev=>{ try{ const m=await H.buildInputs(ev); out.push({id:ev.id,lg:ev.lg,t:ev.t,m,act:H.actualOf(ev),status:ev.status||null}); }catch(e){} n++; if(n%50===0) console.error(n,'/',evs.length,'red',H.netCount()); });
  out.sort((a,b)=>Date.parse(a.t)-Date.parse(b.t));
  fs.writeFileSync(process.argv[2]||path.join(__dirname,'.cache','dataset.json'),JSON.stringify(out));
  console.error('listo',out.length);
})();
