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
    const row=document.createElement('div');row.className='stage3-slot-row';
    const aggregate=document.createElement('input');
    aggregate.type='text';aggregate.className='stage3-aggregate-input';aggregate.tabIndex=-1;aggregate.setAttribute('aria-hidden','true');
    const boxes=[];

    const sync=()=>{aggregate.value=boxes.map(b=>(b.value||'').toLowerCase()).join('')};
    const focusBest=()=>{
      let idx=boxes.findIndex((b,i)=>(b.value||'').toLowerCase()!==span.correct[i]);
      if(idx<0) idx=Math.max(0,boxes.length-1);
      boxes[idx]?.focus();boxes[idx]?.select?.();
    };

    for(let i=0;i<span.correct.length;i++){
      const box=document.createElement('input');
      box.type='text';box.inputMode='text';box.autocomplete='off';box.spellcheck=false;box.maxLength=1;
      box.className='stage3-letter-slot stage3-letter-box';box.dataset.local=String(i);box.setAttribute('aria-label',`Missing letter ${i+1}`);
      box.addEventListener('input',()=>{
        let v=(box.value||'').toLowerCase().replace(/[^a-z]/g,'');
        if(v.length>1)v=v.slice(-1);
        box.value=v;box.classList.toggle('filled',!!v);sync();
        if(v&&i<boxes.length-1){boxes[i+1].focus();boxes[i+1].select?.()}
      });
      box.addEventListener('keydown',e=>{
        if(e.key==='Backspace'&&!box.value&&i>0){e.preventDefault();boxes[i-1].value='';boxes[i-1].classList.remove('filled');sync();boxes[i-1].focus()}
        else if(e.key==='ArrowLeft'&&i>0){e.preventDefault();boxes[i-1].focus()}
        else if(e.key==='ArrowRight'&&i<boxes.length-1){e.preventDefault();boxes[i+1].focus()}
        else if(e.key==='Enter'){e.preventDefault();wrap.querySelector('.submit-answer')?.click()}
      });
      box.addEventListener('paste',e=>{
        const text=(e.clipboardData?.getData('text')||'').toLowerCase().replace(/[^a-z]/g,'');if(!text)return;
        e.preventDefault();[...text].forEach((ch,j)=>{const target=boxes[i+j];if(target){target.value=ch;target.classList.add('filled')}});sync();
        boxes[Math.min(i+text.length,boxes.length-1)]?.focus();
      });
      boxes.push(box);row.appendChild(box);
    }

    group.append(row,aggregate);
    const after=document.createElement('span');after.textContent=word.word.slice(span.end+1);
    line.append(before,group,after);
    const submit=document.createElement('button');submit.className='primary-btn submit-answer';submit.textContent='Check';
    const go=()=>{sync();const attempt=aggregate.value.toLowerCase().trim();checkTyped(aggregate,attempt===span.correct,attempt,word,task,span.correct);setTimeout(focusBest,20)};
    submit.onclick=go;
    aggregate.select=focusBest;aggregate.focus=focusBest;
    wrap.append(line,submit);area.appendChild(wrap);setTimeout(()=>boxes[0]?.focus(),50);
  }

  function showHint(){
    const task=currentTask(),word=currentWord();if(!task||!word)return;
    task.usedHint=true;word.learning.hintUsed++;saveStateQuietly();
    playWordAudio(word,true);

    const help=$('#helpPanel');if(help){help.className='help-panel hidden';help.innerHTML=''}
    $('.typing-hint-strip')?.remove();$('.stage4-hint-track')?.remove();$('.double-badge')?.remove();
    $$('.stage3-letter-box').forEach(x=>x.classList.remove('hint-target','hint-solved','pair-hint'));

    if(task.stage<3){
      const audio=$('#audioBtn');audio?.classList.add('hint-pulse');
      const gap=$('.gap-slot');gap?.classList.add('hint-pulse');
      setTimeout(()=>{audio?.classList.remove('hint-pulse');gap?.classList.remove('hint-pulse')},1250);
      return;
    }

    const wrap=$('.type-wrap');if(!wrap)return;
    const span=task.span||weakSpanFor(word);
    let targetChar='',isDouble=false,targetVisual=null,focusAfter=null,editIndex=0;

    if(task.stage===3){
      const boxes=$$('.stage3-letter-box',wrap);if(!boxes.length)return;
      let local=0;
      while(local<span.correct.length&&(boxes[local]?.value||'').toLowerCase()===span.correct[local])local++;
      if(local>=span.correct.length){boxes[boxes.length-1]?.animate([{boxShadow:'0 0 0 0 rgba(120,189,144,0)'},{boxShadow:'0 0 0 7px rgba(120,189,144,.16)'},{boxShadow:'0 0 0 0 rgba(120,189,144,0)'}],{duration:700});return}
      editIndex=local;targetChar=span.correct[local];targetVisual=boxes[local];
      isDouble=(span.correct[local-1]===targetChar||span.correct[local+1]===targetChar||word.word[span.start+local-1]===targetChar||word.word[span.start+local+1]===targetChar);
      targetVisual.classList.add('hint-target');
      if(isDouble){
        const neighbor=span.correct[local-1]===targetChar?boxes[local-1]:boxes[local+1];neighbor?.classList.add('pair-hint');targetVisual.classList.add('pair-hint');
        const badge=document.createElement('span');badge.className='double-badge';badge.textContent='×2';wrap.querySelector('.stage3-input-group')?.appendChild(badge);
      }
      focusAfter=()=>{
        let idx=boxes.findIndex((b,i)=>(b.value||'').toLowerCase()!==span.correct[i]);if(idx<0)idx=boxes.length-1;
        boxes[idx]?.focus();boxes[idx]?.select?.();
      };
    }else{
      const input=$('.full-input');if(!input)return;
      const typed=(input.value||'').toLowerCase();let i=0;while(i<word.word.length&&typed[i]===word.word[i])i++;
      if(i>=word.word.length){input.animate([{boxShadow:'0 0 0 0 rgba(120,189,144,0)'},{boxShadow:'0 0 0 7px rgba(120,189,144,.16)'},{boxShadow:'0 0 0 0 rgba(120,189,144,0)'}],{duration:700});return}
      editIndex=i;targetChar=word.word[i];isDouble=(word.word[i-1]===targetChar||word.word[i+1]===targetChar);
      const track=document.createElement('div');track.className='stage4-hint-track';
      for(let j=0;j<word.word.length;j++){
        const slot=document.createElement('span');slot.className='stage4-hint-slot';slot.dataset.index=String(j);
        if(j===i){slot.textContent='?';slot.classList.add('hint-target');targetVisual=slot}
        else if(j<typed.length&&typed[j]===word.word[j]){slot.textContent=typed[j];slot.classList.add('known')}
        else{slot.innerHTML='&nbsp;';slot.classList.add('future')}
        track.appendChild(slot);
      }
      if(isDouble){const neighbor=i>0&&word.word[i-1]===targetChar?i-1:i+1;track.querySelector(`[data-index="${neighbor}"]`)?.classList.add('pair-hint');targetVisual?.classList.add('pair-hint');const badge=document.createElement('span');badge.className='double-badge';badge.textContent='×2';track.style.position='relative';track.appendChild(badge)}
      input.insertAdjacentElement('afterend',track);
      focusAfter=()=>{input.focus();input.setSelectionRange?.(Math.min(input.value.length,editIndex+1),Math.min(input.value.length,editIndex+1))};
    }

    const pool=[targetChar,...closestConfusion(targetChar).filter(c=>String(c).length===1)];
    const fallback=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallback){if(!pool.includes(c))pool.push(c);if(pool.length>=3)break}
    const choices=shuffle([...new Set(pool.filter(c=>String(c).length===1))]).slice(0,3);

    const strip=document.createElement('div');strip.className='typing-hint-strip';
    strip.innerHTML=`<button type="button" class="hint-icon-btn hint-replay" aria-label="Play slowly">🔊</button><div class="hint-letter-choices">${choices.map(c=>`<button type="button" class="hint-letter-choice" data-char="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div><button type="button" class="hint-icon-btn hint-close" aria-label="Close hint">×</button>`;
    const submit=$('.submit-answer',wrap);wrap.insertBefore(strip,submit||null);

    const cleanup=()=>{strip.remove();$('.stage4-hint-track')?.remove();$('.double-badge')?.remove();$$('.stage3-letter-box').forEach(x=>x.classList.remove('hint-target','hint-solved','pair-hint'));focusAfter?.()};
    $('.hint-close',strip).onclick=cleanup;
    $('.hint-replay',strip).onclick=()=>{playWordAudio(word,true);focusAfter?.()};
    $$('.hint-letter-choice',strip).forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.char!==targetChar){btn.classList.add('wrong');setTimeout(()=>btn.classList.remove('wrong'),430);return}
      $$('.hint-letter-choice',strip).forEach(x=>x.disabled=true);btn.classList.add('correct');
      if(task.stage===3){
        const box=$$('.stage3-letter-box',wrap)[editIndex];if(box){box.value=targetChar;box.classList.add('filled','hint-solved');box.dispatchEvent(new Event('input',{bubbles:true}))}
      }else{
        const input=$('.full-input');let value=input.value||'';input.value=value.slice(0,editIndex)+targetChar+(value.length>editIndex?value.slice(editIndex+1):'');input.dispatchEvent(new Event('input',{bubbles:true}));
        if(targetVisual){targetVisual.textContent=targetChar;targetVisual.classList.add('hint-solved')}
      }
      setTimeout(cleanup,850);
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
