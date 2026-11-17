// Mide la precisión real del robot con partidos ya jugados, en orden de fecha y aprendiendo como en la app
// (solo de los partidos anteriores al que pronostica). Uso: node tests/backtest.js [dataset.json]
const H=require('./harness'); const fs=require('fs'), path=require('path');
const DS=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'.cache','dataset.json'),'utf8')).filter(x=>x.act);
const START=Number(process.env.START||0), RELEARN=Number(process.env.RELEARN||40), LEARN=process.env.LEARN!=='0';
const res=a=>a.h>a.a?0:a.h===a.a?1:2;
const ll=p=>-Math.log(Math.max(p,1e-9));
const S={mk:0,mkn:0,n:0,ll:0,br:0,acc:0,bll:0,o25:0,btts:0, picks:{}, bins:{}, lines:{}};
const bin=p=>p>=0.8?'80+':p>=0.7?'70-79':p>=0.6?'60-69':'<60';
function addBin(key,p,hit){ const b=S.bins[key]||(S.bins[key]={}); const z=b[bin(p)]||(b[bin(p)]={n:0,hit:0,p:0}); z.n++; z.hit+=hit?1:0; z.p+=p; }
let st={theta:Object.assign({},H.THETA0),cal:{},prof:{},comp:{},history:[]}; H.setState(st);
const t0=Date.now();
DS.forEach((x,i)=>{
  if(LEARN&&i&&i%RELEARN===0){ st.history=DS.slice(0,i).map((y,k)=>({id:'h'+k,ts:Date.parse(y.t),date:y.t.slice(0,10),inputs:y.m,actual:y.act,picks:y.picks,robot:y.robot,base:y.base})).reverse(); H.learnAll(st); }
  if(i<START){ const R0=H.robotCompute(x.m); x.picks=R0.picks; x.robot={p1:R0.r.p1,px:R0.r.px,p2:R0.r.p2}; x.base={p1:R0.base.p1,px:R0.base.px,p2:R0.base.p2,o25:R0.base.o25,btts:R0.base.btts}; return; }
  const R=H.robotCompute(x.m), a=x.act, r=R.r, y=res(a), P=[r.p1,r.px,r.p2], B=[R.base.p1,R.base.px,R.base.p2];
  x.picks=R.picks; x.robot={p1:r.p1,px:r.px,p2:r.p2,o25:r.o25,btts:r.btts}; x.base={p1:B[0],px:B[1],p2:B[2],o25:R.base.o25,btts:R.base.btts};
  if(x.m.odds){ const inv=x.m.odds.map(o=>1/o), t=inv[0]+inv[1]+inv[2]; S.mk+=ll(inv[y]/t); S.mkn++; }
  S.n++; S.ll+=ll(P[y]); S.bll+=ll(B[y]); S.br+=P.reduce((s,p,k)=>s+Math.pow(p-(k===y?1:0),2),0); S.acc+=P.indexOf(Math.max(...P))===y?1:0;
  const ov=a.h+a.a>2.5, bt=a.h>0&&a.a>0; S.o25+=ll(ov?r.o25:1-r.o25); S.btts+=ll(bt?r.btts:1-r.btts);
  addBin('1X2 favorito',Math.max(...P),P.indexOf(Math.max(...P))===y);
  for(const pk of R.picks){ const h=H.pickHit(pk,a); if(h===null) continue; const z=S.picks[pk.st]||(S.picks[pk.st]={n:0,hit:0,p:0,rn:0,rhit:0});
    z.n++; z.hit+=h?1:0; z.p+=pk.p; if(pk.p>=H.CONF_MID){ z.rn++; z.rhit+=h?1:0; addBin('jugadas recomendadas',pk.p,h); addBin('jugada '+pk.st,pk.p,h); } }
  // Calibración de todas las líneas (no solo las elegidas): mide si "70%" ocurre 70% de las veces
  for(const [stt] of H.STATS){ const v=stt==='goals'?[a.h,a.a]:a[stt]; if(!v) continue; const mu=H.statMeans(x.m,r,stt,R.mcal);
    for(const sc of ['total','home','away']){ const c=Math.max(0.5,Math.round(mu[sc])-0.5);
      for(const ln of [c-1,c,c+1]){ if(ln<0.5) continue; const p=H.lineOver(x.m,r,stt,sc,ln,R.mcal), val=sc==='home'?v[0]:sc==='away'?v[1]:v[0]+v[1], o=val>ln;
        const L=S.lines[stt]||(S.lines[stt]={n:0,ll:0}); L.n++; L.ll+=ll(o?p:1-p); addBin('línea '+stt,Math.max(p,1-p),(p>=0.5)===o); } } }
});
const f=x=>x.toFixed(4), pc=x=>(x*100).toFixed(1)+'%';
console.log(`Partidos: ${S.n} · aprendizaje ${LEARN?'cada '+RELEARN:'apagado'} · ${((Date.now()-t0)/1000).toFixed(0)} s`);
console.log(`1X2  logloss robot ${f(S.ll/S.n)} · base ${f(S.bll/S.n)} · Brier ${f(S.br/S.n)} · acierto favorito ${pc(S.acc/S.n)}`);
console.log(`Mercado solo (casa sin margen): logloss ${S.mkn?f(S.mk/S.mkn):'—'} (${S.mkn} partidos)`);
console.log(`Más/menos 2.5 logloss ${f(S.o25/S.n)} · Ambos marcan logloss ${f(S.btts/S.n)}`);
console.log('Líneas (logloss medio): '+Object.entries(S.lines).map(([k,v])=>`${k} ${f(v.ll/v.n)}`).join(' · '));
let tn=0,th=0; for(const k in S.picks){ tn+=S.picks[k].rn; th+=S.picks[k].rhit; }
console.log(`Jugadas recomendadas (≥60%): ${th}/${tn} = ${pc(th/tn)}`);
for(const k in S.picks){ const z=S.picks[k]; console.log(`  ${k.padEnd(8)} recomendadas ${String(z.rn).padStart(4)} acierto ${pc(z.rhit/Math.max(1,z.rn)).padStart(6)} · prometido medio ${pc(z.p/z.n)}`); }
console.log('Calibración (prometido → real):');
for(const k of Object.keys(S.bins).sort()){ console.log('  '+k.padEnd(22)+Object.entries(S.bins[k]).sort().map(([b,z])=>`${b}: ${pc(z.p/z.n)}→${pc(z.hit/z.n)} (n=${z.n})`).join(' | ')); }
if(process.env.STATE){ console.log('theta',JSON.stringify(st.theta)); const c=Object.assign({},st.cal); console.log('cal',JSON.stringify({shots:c.shots,sot:c.sot,corners:c.corners,cards:c.cards,phi:c.phi,ht:c.ht})); console.log('trust',JSON.stringify(Object.fromEntries(Object.entries(c.trust||{}).map(([k,v])=>[k,+v.f.toFixed(3)])))); }
if(process.env.JSON) fs.writeFileSync(process.env.JSON,JSON.stringify(S));
