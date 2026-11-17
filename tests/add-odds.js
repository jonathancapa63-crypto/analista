// Agrega al conjunto de prueba las cuotas de cierre de DraftKings que ESPN guarda en el resumen de cada partido.
// Uso: node tests/add-odds.js entrada.json salida.json
const H=require('./harness'); const fs=require('fs');
const DS=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{ let n=0, got=0;
  await H.pool(DS,6,async x=>{ try{ const d=await H.curlJSON(`https://site.api.espn.com/apis/site/v2/sports/soccer/${x.lg}/summary?event=${x.id}`);
      const pc=(d.pickcenter||[])[0]; if(pc){ const o=[H.usToDec(pc.homeTeamOdds&&pc.homeTeamOdds.moneyLine),H.usToDec(pc.drawOdds&&pc.drawOdds.moneyLine),H.usToDec(pc.awayTeamOdds&&pc.awayTeamOdds.moneyLine)];
        if(o.every(v=>v>1)) { x.m.odds=o; got++; }
        const ou=[H.usToDec(pc.overOdds),H.usToDec(pc.underOdds)]; if(pc.overUnder>0&&ou.every(v=>v>1)) x.m.ou={line:pc.overUnder,o:ou[0],u:ou[1]}; }
      const box=(d.boxscore&&d.boxscore.teams)||[]; if(box.length===2) x.box=box.map(t=>({id:String(t.team.id),s:Object.fromEntries((t.statistics||[]).map(s=>[s.name,Number(s.displayValue)]))}));
    }catch(e){} if(++n%200===0) console.error(n,got); });
  fs.writeFileSync(process.argv[3],JSON.stringify(DS)); console.error('con cuotas',got,'de',DS.length,'· con más/menos',DS.filter(x=>x.m.ou).length);
})();
