// Carga el motor del robot y el módulo de datos automáticos de index.html para probarlos fuera del navegador.
// Uso: const H=require('./harness'); las llamadas a ESPN pasan por curl con caché en disco (tests/.cache).
const fs=require('fs'), path=require('path'), {execFile}=require('child_process'), crypto=require('crypto');
let SRC=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
// Para comparar variantes: SUBST="texto original=>texto nuevo||otro=>otro"
for(const pair of (process.env.SUBST||'').split('||').filter(Boolean)){ const [a,b]=pair.split('=>'); if(SRC.indexOf(a)<0) throw new Error('SUBST no encontrado: '+a); SRC=SRC.split(a).join(b); }
const slice=(a,b)=>{ const i=SRC.indexOf(a), j=SRC.indexOf(b,i); if(i<0||j<0) throw new Error('marcador no encontrado: '+a); return SRC.slice(i,j); };
const engine=slice('/*ENGINE*/','/*END*/');
const compute=slice('function robotCompute(m){','function analyze(m){');
const auto=slice("const ESPN='https://site.api.espn.com","/* ---------- Registro automático de resultados");
const actualSrc=slice('function actualOf(d){','let settling=false;');
const CACHE=path.join(__dirname,'.cache'); fs.mkdirSync(CACHE,{recursive:true});
let net=0;
function curlJSON(url){ const f=path.join(CACHE,crypto.createHash('md5').update(url).digest('hex')+'.json');
  if(fs.existsSync(f)) return Promise.resolve(JSON.parse(fs.readFileSync(f,'utf8')));
  return new Promise((res,rej)=>{ net++; execFile('curl',['-sS','--compressed','--max-time','30','--retry','2',url],{maxBuffer:256e6},(e,out)=>{
    if(e) return rej(e); try{ const j=JSON.parse(out); if(j&&j.code===400) return rej(new Error('400')); fs.writeFileSync(f,out); res(j); }catch(err){ rej(err); } }); }); }
const localDate=d=>{ const z=d||new Date(); return z.getFullYear()+'-'+String(z.getMonth()+1).padStart(2,'0')+'-'+String(z.getDate()).padStart(2,'0'); };
const code=`${engine}
const localDate=${localDate.toString()};
let state={theta:Object.assign({},THETA0),cal:{},prof:{},comp:{},history:[]};
${compute}
${auto.replace(/function getJSON\(url,ttl\)\{[\s\S]*?return pr; \}/,'function getJSON(url){ return __curl(url); }')}
${actualSrc}
module.exports={marketGoals,THETA0,BOUNDS,SIGMA,PHI,STATS,predict,robotView,robotPicks,robotCompute,lambdas,statMeans,lineOver,countOver,calibrate,train,learnAll,trustCal,pickHit,lineRecord,record,confOf,teamKey,
  parseEvent,dayBoard,eventData,teamMatches,teamInputs,buildInputs,actualOf,pool,LEAGUES,etDaysLocal,etDaysTs,usToDec,
  getState:()=>state,setState:s=>{state=s;},CONF_MID,CONF_HI,PICK_MAX,PICKNAMES,extraMarkets};`;
const mod={exports:{}};
new Function('module','__curl','Date',code)(mod,curlJSON,Date);
mod.exports.netCount=()=>net; mod.exports.curlJSON=curlJSON;
module.exports=mod.exports;
