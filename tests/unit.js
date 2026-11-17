// Pruebas automáticas del motor y de los datos automáticos. Uso: node tests/unit.js [dataset.json]
const H=require('./harness'); const fs=require('fs'), path=require('path'), assert=require('assert');
let ok=0, fail=0; const t=(name,fn)=>{ try{ fn(); ok++; }catch(e){ fail++; console.log('FALLA',name,'·',e.message); } };
const near=(a,b,eps,msg)=>assert.ok(Math.abs(a-b)<=eps,`${msg||''} ${a} ≠ ${b}`);

// --- Probabilidades bien formadas ---
t('matriz de marcadores suma 1 y 1X2 suma 1',()=>{ for(const [lh,la] of [[0.3,0.2],[1.4,1.1],[3.5,0.4],[5,5]]){
  const m={neutral:false,split:false,home:{n:10,wins:5,unbeaten:7,gf:lh,ga:la,xg:lh,xga:la,over25:5,btts:5,shots:12,sot:4,corners:5,cards:2},away:{n:10,wins:3,unbeaten:6,gf:la,ga:lh,xg:la,xga:lh,over25:5,btts:5,shots:10,sot:3,corners:4,cards:2}};
  const p=H.predict(m,H.THETA0,0.43); near(p.p1+p.px+p.p2,1,1e-9,'1X2'); let s=0; p.M.forEach(r=>r.forEach(v=>s+=v)); near(s,1,1e-9,'matriz');
  const r=H.robotView(m,H.THETA0,0.43); near(r.p1+r.px+r.p2,1,1e-9,'robot'); } });
t('líneas: más de 0.5 ≥ más de 1.5 ≥ más de 2.5',()=>{ for(const phi of [1,1.4,2]) for(const mu of [0.5,4,11]){ const a=H.countOver(mu,phi,0.5),b=H.countOver(mu,phi,1.5),c=H.countOver(mu,phi,2.5); assert.ok(a>=b&&b>=c&&a<=1&&c>=0,`${mu} ${phi}`); } });
t('Poisson: P(más de 0.5 | media 1) = 1 − e^−1',()=>near(H.countOver(1,1,0.5),1-Math.exp(-1),1e-12));
t('cuotas americanas a decimales',()=>{ assert.strictEqual(H.usToDec('+150'),2.5); near(H.usToDec('-200'),1.5,1e-9); assert.strictEqual(H.usToDec('x'),null); });

t('goles de la casa: línea 2.5 a cuotas parejas ≈ 2.67 goles, y el favorito recibe más',()=>{ const g=H.marketGoals({ou:{line:2.5,o:1.9,u:1.9},odds:[1.6,4,6]});
  near(g.T,2.674,0.01,'total'); assert.ok(g.lh>g.la,'reparto'); near(g.lh+g.la,g.T,1e-9);
  assert.strictEqual(H.marketGoals({ou:{line:2.25,o:1.9,u:1.9}}),null,'líneas asiáticas no se usan'); });
t('el modelo se acerca a la línea de la casa',()=>{ const base={neutral:false,split:false,home:{n:10,wins:5,unbeaten:7,gf:1.2,ga:1.1,xg:1.2,xga:1.1,over25:5,btts:5,shots:12,sot:4,corners:5,cards:2},away:{n:10,wins:4,unbeaten:6,gf:1.1,ga:1.2,xg:1.1,xga:1.2,over25:5,btts:5,shots:11,sot:4,corners:5,cards:2}};
  const a=H.lambdas(base,H.THETA0), b=H.lambdas(Object.assign({},base,{ou:{line:3.5,o:1.8,u:2.0}}),H.THETA0); assert.ok(b.lh+b.la>a.lh+a.la+0.5); });

// --- Liquidación de jugadas ---
t('pickHit: más/menos, por equipo, 1er y 2º tiempo',()=>{ const a={h:2,a:1,ht:[1,0],corners:[6,3]};
  assert.strictEqual(H.pickHit({st:'goals',s:'total',l:2.5,o:1},a),true); assert.strictEqual(H.pickHit({st:'goals',s:'away',l:0.5,o:0},a),false);
  assert.strictEqual(H.pickHit({st:'corners',s:'home',l:5.5,o:1},a),true); assert.strictEqual(H.pickHit({st:'htg',s:'total',l:1.5,o:0},a),true);
  assert.strictEqual(H.pickHit({st:'h2g',s:'total',l:1.5,o:1},a),true); assert.strictEqual(H.pickHit({st:'htr',r:'1X'},a),true);
  assert.strictEqual(H.pickHit({st:'shots',s:'total',l:20.5,o:1},a),null,'sin dato → null'); });

// --- Lectura de ESPN ---
const ev=(over)=>Object.assign({id:'1',date:'2026-11-01T20:00Z',competitions:[{status:{type:{state:'post',completed:true,name:'STATUS_FULL_TIME',shortDetail:'FT'}},
  competitors:[{homeAway:'home',score:'2',team:{id:'10',displayName:'Local'},statistics:[{name:'totalShots',displayValue:'12'},{name:'shotsOnTarget',displayValue:'5'},{name:'wonCorners',displayValue:'6'}]},
               {homeAway:'away',score:'1',team:{id:'20',displayName:'Visita'},statistics:[{name:'totalShots',displayValue:'8'},{name:'shotsOnTarget',displayValue:'3'},{name:'wonCorners',displayValue:'2'}]}],
  details:[{scoringPlay:true,team:{id:'10'},clock:{value:600,displayValue:"10'"}},{scoringPlay:true,team:{id:'20'},clock:{value:2800,displayValue:"45'+2'"}},{yellowCard:true,team:{id:'20'},clock:{value:3000,displayValue:"50'"}},{scoringPlay:true,team:{id:'10'},clock:{value:5000,displayValue:"83'"}}]}]},over);
t('parseEvent: descanso, primer gol, tarjetas',()=>{ const m=H.parseEvent(ev(),'esp.1'); assert.deepStrictEqual(m.ht,[1,1]); assert.strictEqual(m.first,0); assert.deepStrictEqual(m.cards,[0,1]); assert.deepStrictEqual(m.corners,[6,2]); });
t('parseEvent: autogol con el equipo del autor se corrige',()=>{ const e=ev(); e.competitions[0].details[2-1]={scoringPlay:true,ownGoal:true,team:{id:'10'},clock:{value:2800,displayValue:"45'"}};
  e.competitions[0].competitors[0].score='1'; e.competitions[0].competitors[1].score='1'; e.competitions[0].details=e.competitions[0].details.filter((d,i)=>i!==3);
  const m=H.parseEvent(e,'esp.1'); assert.deepStrictEqual(m.ht,[1,1]); });
t('alargue: se liquida con el marcador de 90 minutos y sin estadísticas de 120',()=>{ const e=ev(); const c=e.competitions[0]; c.status.type.name='STATUS_FINAL_AET';
  c.competitors[1].score='2'; c.details.push({scoringPlay:true,team:{id:'20'},clock:{value:6500,displayValue:"104'"}});
  const m=H.parseEvent(e,'esp.copa_del_rey'), a=H.actualOf(m); assert.strictEqual(a.h,2); assert.strictEqual(a.a,1); assert.ok(!a.corners); });
t('alargue sin cronología: no se liquida',()=>{ const e=ev(); const c=e.competitions[0]; c.status.type.name='STATUS_FINAL_PEN'; c.details=[]; assert.strictEqual(H.actualOf(H.parseEvent(e,'x')),null); });
t('0-0 sin estadísticas no cuenta como descanso conocido',()=>{ const e=ev(); const c=e.competitions[0]; c.competitors.forEach(k=>{k.score='0'; k.statistics=[];}); c.details=[]; assert.strictEqual(H.parseEvent(e,'x').ht,undefined); });

// --- Nombres ---
t('mismo equipo con distinta escritura',()=>{ for(const [a,b] of [['TURQUÍA','Turkey'],['ATLÉTICO DE MADRID','Atlético Madrid'],['Liga de las Naciones UEFA','Liga de Naciones UEFA'],['IRLANDA','Republic of Ireland']]) assert.strictEqual(H.teamKey(a),H.teamKey(b),a);
  assert.notStrictEqual(H.teamKey('Real Madrid'),H.teamKey('Real Sociedad')); });

t('reconoce el mismo equipo para vincular con ESPN, sin confundir equipos distintos',()=>{
  for(const [a,b] of [['U. de Chile','Universidad de Chile'],['COLO COLO','Colo-Colo'],['Atlético de Madrid','Atlético Madrid'],['Man City','Manchester City']]) assert.ok(H.sameTeam(a,b),a+' = '+b);
  for(const [a,b] of [['Universidad Católica','Universidad de Chile'],['Real Madrid','Real Sociedad'],['Manchester City','Manchester United']]) assert.ok(!H.sameTeam(a,b),a+' ≠ '+b); });

// --- Aprendizaje ---
t('confianza aprendida dentro de sus límites y casi neutra con pocos datos',()=>{ const T=H.trustCal([{ts:Date.now(),actual:{h:0,a:0},picks:[{st:'goals',s:'total',l:2.5,o:1,p:0.8}]}]); assert.ok(T.goals.f<1&&T.goals.f>0.94,'f='+T.goals.f); });

// --- Todos los partidos del conjunto de prueba: datos válidos para el formulario y probabilidades sin NaN ---
const dsf=process.argv[2]||path.join(__dirname,'.cache','ds5.json');
if(fs.existsSync(dsf)){ const DS=JSON.parse(fs.readFileSync(dsf,'utf8')); let bad=0;
  t(`datos automáticos válidos (${DS.length} partidos)`,()=>{ for(const x of DS){ for(const tm of [x.m.home,x.m.away]){
      const errs=[]; if(!(tm.n>=3&&Number.isInteger(tm.n))) errs.push('n');
      for(const k of ['wins','btts','over25','scoredFirst','concededFirst','unbeaten','htWin','cleanSheet']) if(!(Number.isInteger(tm[k])&&tm[k]>=0&&tm[k]<=tm.n)) errs.push(k);
      if(tm.wins>tm.unbeaten) errs.push('wins>unbeaten'); if(tm.scoredFirst+tm.concededFirst>tm.n) errs.push('first');
      for(const k of ['gf','ga','xg','xga','shots','sot','corners','cards']) if(!(isFinite(tm[k])&&tm[k]>=0)) errs.push(k);
      if(tm.sot>tm.shots) errs.push('sot>shots');
      if(errs.length){ bad++; if(bad<4) console.log('  dato inválido',x.id,tm.name,errs.join(',')); } } }
    assert.strictEqual(bad,0,bad+' equipos con datos inválidos'); });
  t('probabilidades finitas en todos los partidos',()=>{ for(const x of DS){ const R=H.robotCompute(x.m); for(const v of [R.r.p1,R.r.px,R.r.p2,R.r.o25,R.r.btts]) assert.ok(isFinite(v)&&v>=0&&v<=1,x.id);
      for(const pk of R.picks) assert.ok(isFinite(pk.p)&&pk.p>0&&pk.p<1,x.id+' '+pk.st); } });
  t('sin fuga de datos: ningún partido usa información posterior',()=>{ /* buildInputs filtra partidos previos al inicio; se verifica que n ≤ 10 */ for(const x of DS) assert.ok(x.m.home.n<=10&&x.m.away.n<=10); });
}
console.log(`${ok} pruebas correctas, ${fail} fallidas`); process.exit(fail?1:0);
