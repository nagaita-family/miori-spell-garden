(async()=>{
  const parts=['app-parts/part-01.txt','app-parts/part-02.txt','app-parts/part-03.txt','app-parts/part-04.txt','app-parts/part-05.txt','app-parts/part-06.txt','app-parts/part-07.txt'];
  const chunks=await Promise.all(parts.map(p=>fetch(p).then(r=>{if(!r.ok)throw new Error(`Could not load ${p}`);return r.text()})));
  const source=chunks.join('').replace('const base = = defaultState();','const base = defaultState();');
  (0,eval)(source);
})().catch(err=>{console.error(err);document.body.innerHTML='<div style="font-family:sans-serif;padding:40px">Spell Garden could not start. Please reload.</div>'});
