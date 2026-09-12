(async()=>{
  const parts=['app-parts/part-01.txt','app-parts/part-02.txt','app-parts/part-03.txt','app-parts/part-04.txt','app-parts/part-05.txt','app-parts/part-06.txt','app-parts/part-07.txt'];
  const chunks=await Promise.all(parts.map(p=>fetch(p).then(r=>{if(!r.ok)throw new Error(`Could not load ${p}`);return r.text()})));
  let source=chunks.join('').replace('const base = = defaultState();','const base = defaultState();');

  function renderStage2(area,word,task){
    const span=weakSpanFor(word); task.span=span;
    const wrap=document.createElement('div'); wrap.style.width='100%';
    const display=document.createElement('div'); display.className='gap-word';
    display.innerHTML=`${escapeHtml(word.word.slice(0,span.start))}<span class="gap-slot" aria-label="missing part"><span>?</span></span>${escapeHtml(word.word.slice(span.end+1))}`;
    const choices=document.createElement('div'); choices.className='choice-grid'; choices.style.marginTop='26px';
    makeGapChoices(word,span).forEach(opt=>{const b=document.createElement('button');b.className='choice-btn';b.textContent=opt;b.onclick=()=>checkChoice(b,opt===span.correct,opt,word,task);choices.appendChild(b)});
    wrap.append(display,choices);area.appendChild(wrap);
  }

  function showHint(){
    const task=currentTask(),word=currentWord();if(!task||!word)return;
    task.usedHint=true;word.learning.hintUsed++;saveStateQuietly();
    playWordAudio(word,true);

    let targetIndex=0;
    let span=task.span||weakSpanFor(word);
    let typed='';

    if(task.stage===4){
      const input=$('.full-input');typed=(input?.value||'').toLowerCase();
      let i=0;while(i<word.word.length&&typed[i]===word.word[i])i++;
      targetIndex=Math.min(i,Math.max(0,word.word.length-1));
    }else if(task.stage===3){
      const input=$('.gap-input');typed=(input?.value||'').toLowerCase();
      let local=0;while(local<span.correct.length&&typed[local]===span.correct[local])local++;
      local=Math.min(local,Math.max(0,span.correct.length-1));
      targetIndex=span.start+local;
    }else{
      targetIndex=span.start;
    }

    const targetChar=word.word[targetIndex]||word.word[0]||'';
    const choices=[targetChar,...closestConfusion(targetChar)];
    const fallback=['e','a','i','o','u','b','d','p','t','c'];
    for(const c of fallback){if(!choices.includes(c))choices.push(c);if(choices.length>=3)break}
    const finalChoices=shuffle([...new Set(choices.filter(Boolean))]).slice(0,3);

    const map=[];
    for(let i=0;i<word.word.length;i++){
      if(i===targetIndex){map.push('<span class="hint-map-char target">?</span>');continue}
      let shown='•';
      let dim=true;
      if(task.stage===3){
        if(i<span.start||i>span.end){shown=word.word[i];dim=false}
        else{
          const local=i-span.start;
          if(local<typed.length&&typed[local]===word.word[i]){shown=typed[local];dim=false}
        }
      }else if(task.stage===4){
        if(i<targetIndex&&typed[i]===word.word[i]){shown=typed[i];dim=false}
      }else if(task.stage===2){
        if(i<span.start||i>span.end){shown=word.word[i];dim=false}
      }
      map.push(`<span class="hint-map-char${dim?' dim':''}">${escapeHtml(shown)}</span>`);
    }

    const panel=$('#helpPanel');
    panel.className='help-panel hint-mode';
    panel.innerHTML=`<button class="hint-close" aria-label="Close hint">×</button><p class="hint-kicker">SLOW HINT</p><h3 class="hint-title">Which letter goes right here?</h3><span class="hint-position">Letter ${targetIndex+1} of ${word.word.length}</span><div class="hint-word-map">${map.join('')}</div><p class="hint-instruction">The glowing box is the one letter this hint is helping with.</p><div class="hint-choices">${finalChoices.map(c=>`<button class="hint-choice" data-char="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>`;
    panel.classList.remove('hidden');
    $('.hint-close',panel).onclick=()=>{panel.className='help-panel hidden';panel.innerHTML=''};
    $$('.hint-choice',panel).forEach(b=>b.onclick=()=>{
      if(b.dataset.char!==targetChar){b.classList.add('wrong');return}
      $$('.hint-choice',panel).forEach(x=>x.disabled=true);
      b.classList.add('correct');
      const target=$('.hint-map-char.target',panel);if(target){target.textContent=targetChar;target.classList.add('solved')}
      const instruction=$('.hint-instruction',panel);if(instruction)instruction.textContent='Yes — this is the letter. Nice!';
      if(task.stage===3||task.stage===4)insertHintCharacter(task,word,targetIndex,targetChar);
      setTimeout(()=>{panel.className='help-panel hidden';panel.innerHTML=''},750);
    });
  }

  function showPeek(){
    const task=currentTask(),word=currentWord();if(!task||!word)return;
    task.usedPeek=true;word.learning.peekUsed++;saveStateQuietly();
    const panel=$('#helpPanel');
    panel.className='help-panel peek-mode';
    panel.innerHTML=`<div class="peek-magic"><span class="peek-spark s1">✦</span><span class="peek-spark s2">✧</span><span class="peek-spark s3">✦</span><span class="peek-spark s4">✧</span><span class="peek-spark s5">✦</span><span class="peek-word">${escapeHtml(word.word)}</span></div>`;
    panel.classList.remove('hidden');
    setTimeout(()=>{panel.className='help-panel hidden';panel.innerHTML=''},2900);
  }

  const indent=fn=>'  '+fn.toString().replace(/\n/g,'\n  ');
  source=source.replace(/  function renderStage2\(area,word,task\)\{[\s\S]*?\n  \}(?=\n\n  function renderStage3)/,indent(renderStage2));
  source=source.replace(/  function showHint\(\)\{[\s\S]*?\n  \}(?=\n\n  function insertHintCharacter)/,indent(showHint));
  source=source.replace(/  function showPeek\(\)\{[\s\S]*?\n  \}(?=\n\n  function showInfo)/,indent(showPeek));
  source=source.replace("$('#helpPanel').classList.add('hidden'); $('#helpPanel').innerHTML='';","const helpPanel=$('#helpPanel'); helpPanel.className='help-panel hidden'; helpPanel.innerHTML='';");
  source=source.replace("panel.innerHTML=html;panel.classList.remove('hidden');","panel.className='help-panel';panel.innerHTML=html;panel.classList.remove('hidden');");

  (0,eval)(source);
})().catch(err=>{console.error(err);document.body.innerHTML='<div style="font-family:sans-serif;padding:40px">Spell Garden could not start. Please reload.</div>'});
