// Aprende con los primeros N partidos (por fecha) y muestra los valores aprendidos, para fijar mejores valores de fábrica.
const H=require('./harness'); const fs=require('fs');
const DS=JSON.parse(fs.readFileSync(process.argv[2],'utf8')).filter(x=>x.act), N=Number(process.argv[3]||700);
const st={theta:Object.assign({},H.THETA0),cal:{},prof:{},comp:{},history:DS.slice(0,N).map((y,k)=>({id:'h'+k,ts:Date.parse(y.t),date:y.t.slice(0,10),inputs:y.m,actual:y.act})).reverse()};
H.learnAll(st);
console.log('hasta',DS[N-1].t.slice(0,10),'· desde',DS[N].t.slice(0,10));
console.log(JSON.stringify(st.theta)); console.log(JSON.stringify({sc:{shots:st.cal.shots,sot:st.cal.sot,corners:st.cal.corners,cards:st.cal.cards},phi:st.cal.phi,ht:st.cal.ht}));
