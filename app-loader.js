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

  function renderStage3(area,word,task){
    const span=weakSpanFor(word); task.span=span;
    const wrap=document.createElement('div');wrap.className='type-wrap';
    const line=document.createElement('div');line.className='stage3-word-line';
    const before=document.createElement('span');before.textContent=word.word.slice(0,span.start);
    const group=document.createElement('div');group.className='stage3-input-group';
    const input=document.createElement('input');input.className='gap-input stage3-real-input';input.autocomplete='off';input.spellcheck=false;input.maxLength=span.correct.length;input.setAttribute('aria-label','Type missing letters');
    const slots=document.createElement('div');slots.className='stage3-slot-row';
    for(let i=0;i<span.correct.length;i++){
      const slot=document.createElement('span');slot.className='stage3-letter-slot';slot.dataset.local=String(i);slots.appendChild(slot);
    }
    group.append(input,slots);
    const after=document.createElement('span');after.textContent=word.word.slice(span.end+1);
    line.append(before,group,after);
    const submit=document.createElement('button');submit.className='primary-btn submit-answer';submit.textContent='Check';
    const sync=()=>{
      const chars=(input.value||'').toLowerCase().split('');
      $$('.stage3-letter-slot',slots).forEach((slot,i)=>{slot.textContent=chars[i]||'';slot.classList.toggle('filled',!!chars[i])});
    };
    input.addEventListener('input',sync);
    group.addEventListener('click',()=>input.focus());
    const go=()=>checkTyped(input,input.value.toLowerCase().trim()===span.correct,input.value.toLowerCase().trim(),word,task,span.correct);
    submit.onclick=go; input.onkeydown=e=>{if(e.key==='Enter')go()};
    wrap.append(line,submit);area.appendChild(wrap);setTimeout(()=>input.focus(),50);
  }

  function showHint(){
    const task=currentTask(),word=currentWord();if(!task||!word)return;
    task.usedHint=true;word.learning.hintUsed++;saveStateQuietly();
    playWordAudio(word,true);

    const help=$('#helpPanel');if(help){help.className='help-panel hidden';help.innerHTML=''}
    const old=$('.typing-hint-strip');if(old)old.remove();
    const oldTrack=$('.stage4-hint-track');if(oldTrack)oldTrack.remove();
    $$('.stage3-letter-slot').forEach(x=>x.classList.remove('hint-target','hint-solved','pair-hint'));
    const oldBadge=$('.double-badge');if(oldBadge)oldBadge.remove();

    if(task.stage<3){
      const audio=$('#audioBtn');audio?.classList.add('hint-pulse');
      const gap=$('.gap-slot');gap?.classList.add('hint-pulse');
      setTimeout(()=>{audio?.classList.remove('hint-pulse');gap?.classList.remove('hint-pulse')},1250);
      return;
    }

    const wrap=$('.type-wrap');
    const input=task.stage===3?$('.stage3-real-input'):$('.full-input');
    if(!wrap||!input)return;
    const span=task.span||weakSpanFor(word);
    const typed=(input.value||'').toLowerCase();
    let targetIndex=0,localIndex=0,complete=false;

    if(task.stage===3){
      while(localIndex<span.correct.length&&typed[localIndex]===span.correct[localIndex])localIndex++;
      if(localIndex>=span.correct.length)complete=true;else targetIndex=span.start+localIndex;
    }else{
      let i=0;while(i<word.word.length&&typed[i]===word.word[i])i++;
      if(i>=word.word.length)complete=true;else targetIndex=i;
    }

    if(complete){
      input.animate([{boxShadow:'0 0 0 0 rgba(120,189,144,0)'},{boxShadow:'0 0 0 7px rgba(120,189,144,.16)'},{boxShadow:'0 0 0 0 rgba(120,189,144,0)'}],{duration:700});
      input.focus();return;
    }

    const targetChar=word.word[targetIndex]||'';
    const isDouble=(word.word[targetIndex-1]===targetChar||word.word[targetIndex+1]===targetChar);
    const candidatePool=[targetChar,...closestConfusion(targetChar).filter(c=>String(c).length===1)];
    const fallback=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallback){if(!candidatePool.includes(c))candidatePool.push(c);if(candidatePool.length>=3)break}
    const choices=shuffle([...new Set(candidatePool.filter(c=>String(c).length===1))]).slice(0,3);

    let targetVisual=null;
    if(task.stage===3){
      targetVisual=$(`.stage3-letter-slot[data-local="${localIndex}"]`);
      targetVisual?.classList.add('hint-target');
      if(isDouble){
        const neighborLocal=word.word[targetIndex-1]===targetChar?localIndex-1:localIndex+1;
        const neighbor=$(`.stage3-letter-slot[data-local="${neighborLocal}"]`);
        neighbor?.classList.add('pair-hint');targetVisual?.classList.add('pair-hint');
        const group=$('.stage3-input-group');
        if(group){const badge=document.createElement('span');badge.className='double-badge';badge.textContent='×2';group.appendChild(badge)}
      }
    }else{
      const track=document.createElement('div');track.className='stage4-hint-track';
      for(let i=0;i<word.word.length;i++){
        const slot=document.createElement('span');slot.className='stage4-hint-slot';slot.dataset.index=String(i);
        if(i===targetIndex){slot.textContent='?';slot.classList.add('hint-target');targetVisual=slot}
        else if(i<typed.length&&typed[i]===word.word[i]){slot.textContent=typed[i];slot.classList.add('known')}
        else{slot.innerHTML='&nbsp;';slot.classList.add('future')}
        track.appendChild(slot);
      }
      if(isDouble){
        const neighborIndex=word.word[targetIndex-1]===targetChar?targetIndex-1:targetIndex+1;
        track.querySelector(`[data-index="${neighborIndex}"]`)?.classList.add('pair-hint');
        targetVisual?.classList.add('pair-hint');
        const badge=document.createElement('span');badge.className='double-badge';badge.textContent='×2';track.style.position='relative';track.appendChild(badge);
      }
      input.insertAdjacentElement('afterend',track);
    }

    const strip=document.createElement('div');strip.className='typing-hint-strip';
    strip.innerHTML=`<button type="button" class="hint-icon-btn hint-replay" aria-label="Play slowly">🔊</button><div class="hint-letter-choices">${choices.map(c=>`<button type="button" class="hint-letter-choice" data-char="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div><button type="button" class="hint-icon-btn hint-close" aria-label="Close hint">×</button>`;
    const submit=$('.submit-answer',wrap);wrap.insertBefore(strip,submit||null);

    const cleanup=()=>{
      strip.remove();$('.stage4-hint-track')?.remove();$('.double-badge')?.remove();
      $$('.stage3-letter-slot').forEach(x=>x.classList.remove('hint-target','hint-solved','pair-hint'));
      input.focus();
    };
    $('.hint-close',strip).onclick=cleanup;
    $('.hint-replay',strip).onclick=()=>{playWordAudio(word,true);input.focus()};

    $$('.hint-letter-choice',strip).forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.char!==targetChar){btn.classList.add('wrong');setTimeout(()=>btn.classList.remove('wrong'),430);return}
      $$('.hint-letter-choice',strip).forEach(x=>x.disabled=true);btn.classList.add('correct');
      const editIndex=task.stage===3?localIndex:targetIndex;
      let value=input.value||'';
      const before=value.slice(0,editIndex);const after=value.length>editIndex?value.slice(editIndex+1):'';
      input.value=before+targetChar+after;input.dispatchEvent(new Event('input',{bubbles:true}));
      if(task.stage===4&&targetVisual){targetVisual.textContent=targetChar;targetVisual.classList.remove('future');targetVisual.classList.add('hint-solved')}
      if(task.stage===3){const solved=$(`.stage3-letter-slot[data-local="${localIndex}"]`);solved?.classList.add('hint-solved')}
      const caret=Math.min(input.value.length,editIndex+1);input.focus();input.setSelectionRange?.(caret,caret);
      setTimeout(cleanup,1050);
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
  source=source.replace(/  function renderStage3\(area,word,task\)\{[\s\S]*?\n  \}(?=\n\n  function renderStage4)/,indent(renderStage3));
  source=source.replace(/  function showHint\(\)\{[\s\S]*?\n  \}(?=\n\n  function insertHintCharacter)/,indent(showHint));
  source=source.replace(/  function showPeek\(\)\{[\s\S]*?\n  \}(?=\n\n  function showInfo)/,indent(showPeek));
  source=source.replace("$('#helpPanel').classList.add('hidden'); $('#helpPanel').innerHTML='';","const helpPanel=$('#helpPanel'); helpPanel.className='help-panel hidden'; helpPanel.innerHTML='';");
  source=source.replace("panel.innerHTML=html;panel.classList.remove('hidden');","panel.className='help-panel';panel.innerHTML=html;panel.classList.remove('hidden');");

  (0,eval)(source);
})().catch(err=>{console.error(err);document.body.innerHTML='<div style="font-family:sans-serif;padding:40px">Spell Garden could not start. Please reload.</div>'});
