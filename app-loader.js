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

    const standardPanel=$('#helpPanel');
    if(standardPanel){standardPanel.className='help-panel hidden';standardPanel.innerHTML=''}

    /* Stages 1/2 only need a small listening reminder. The typing coach is for Stages 3/4. */
    if(task.stage<3){
      if(!standardPanel)return;
      standardPanel.className='help-panel pretype-hint';
      standardPanel.innerHTML='<strong>✦ Slow Hint</strong><br>Listen once more, then look at the choices. You can take your time.';
      standardPanel.classList.remove('hidden');
      return;
    }

    const wrap=$('.type-wrap');
    const input=task.stage===3?$('.gap-input'):$('.full-input');
    if(!wrap||!input)return;
    const old=$('.typing-hint-card',wrap);if(old)old.remove();

    const span=task.span||weakSpanFor(word);
    const typed=(input.value||'').toLowerCase();
    let targetIndex=0;
    let localIndex=0;
    let complete=false;

    if(task.stage===3){
      while(localIndex<span.correct.length&&typed[localIndex]===span.correct[localIndex])localIndex++;
      if(localIndex>=span.correct.length) complete=true;
      else targetIndex=span.start+localIndex;
    }else{
      let i=0;while(i<word.word.length&&typed[i]===word.word[i])i++;
      if(i>=word.word.length) complete=true;
      else targetIndex=i;
    }

    const card=document.createElement('div');
    card.className='typing-hint-card';

    if(complete){
      card.innerHTML=`<button class="typing-hint-close" aria-label="Close hint">×</button><div class="typing-hint-done"><span>✦</span><div><strong>You found this part.</strong><br>Press Check when you're ready.</div></div>`;
      $('.typing-hint-close',card).onclick=()=>card.remove();
      input.insertAdjacentElement('afterend',card);input.focus();return;
    }

    const targetChar=word.word[targetIndex]||'';
    const isDouble=(word.word[targetIndex-1]===targetChar||word.word[targetIndex+1]===targetChar);
    const choices=[targetChar,...closestConfusion(targetChar).filter(c=>String(c).length===1)];
    const fallback=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallback){if(!choices.includes(c))choices.push(c);if(choices.length>=3)break}
    const finalChoices=shuffle([...new Set(choices.filter(c=>String(c).length===1))]).slice(0,3);

    const tiles=[];
    for(let i=0;i<word.word.length;i++){
      let shown='';let cls='typing-hint-tile';
      if(i===targetIndex){shown='?';cls+=' target'}
      else if(task.stage===3){
        if(i<span.start||i>span.end){shown=word.word[i];cls+=' outside'}
        else{
          const local=i-span.start;
          if(local<typed.length&&typed[local]===word.word[i])shown=typed[local];
          else cls+=' future';
        }
      }else{
        if(i<typed.length&&typed[i]===word.word[i])shown=typed[i];
        else cls+=' future';
      }
      tiles.push(`<span class="${cls}" data-index="${i}">${shown?escapeHtml(shown):'&nbsp;'}</span>`);
    }

    let clue='Say the word slowly. Listen to the sound around the glowing spot.';
    if(task.stage===3&&span.correct.length>1){
      clue=`This missing part has ${span.correct.length} letters. We’ll solve only one letter at a time.`;
    }
    if(isDouble){
      clue=task.stage===3&&span.correct.length>1
        ? `This missing part has ${span.correct.length} letters. Notice the pattern: the same letter repeats.`
        : 'Notice the pattern: this is a double letter. The same letter repeats.';
    }

    const stepLabel=task.stage===3
      ? `Missing part · letter ${localIndex+1} of ${span.correct.length}`
      : `Whole word · letter ${targetIndex+1}`;

    card.innerHTML=`
      <button class="typing-hint-close" aria-label="Close hint">×</button>
      <div class="typing-hint-top">
        <span class="typing-hint-kicker">✦ Slow Hint</span>
        <span class="typing-hint-step">${escapeHtml(stepLabel)}</span>
        <button class="typing-hint-replay" type="button">🔊 Slow again</button>
      </div>
      <div class="typing-hint-body">
        <div class="typing-hint-left">
          <p class="typing-hint-message">You don’t need the whole answer. Just notice this one spot.</p>
          <p class="typing-hint-clue">${escapeHtml(clue)}</p>
          <div class="typing-hint-map">${tiles.join('')}</div>
        </div>
        <div class="typing-hint-right">
          <span class="typing-hint-question">Which ONE letter fits the glowing box?</span>
          <div class="typing-hint-choices">${finalChoices.map(c=>`<button class="typing-hint-choice" type="button" data-char="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>
          <p class="typing-hint-status">Choose one here — it will go straight into your answer.</p>
        </div>
      </div>`;

    input.insertAdjacentElement('afterend',card);
    $('.typing-hint-close',card).onclick=()=>{card.remove();input.focus()};
    $('.typing-hint-replay',card).onclick=()=>{playWordAudio(word,true);input.focus()};

    const status=$('.typing-hint-status',card);
    $$('.typing-hint-choice',card).forEach(b=>b.onclick=()=>{
      if(b.dataset.char!==targetChar){
        b.classList.add('wrong');
        status.textContent='Not that one. Listen again and try another.';
        status.className='typing-hint-status try';
        setTimeout(()=>b.classList.remove('wrong'),450);
        return;
      }

      $$('.typing-hint-choice',card).forEach(x=>x.disabled=true);
      b.classList.add('correct');

      let value=input.value||'';
      let editIndex=task.stage===3?targetIndex-span.start:targetIndex;
      const before=value.slice(0,editIndex);
      const after=value.length>editIndex?value.slice(editIndex+1):'';
      input.value=before+targetChar+after;
      input.dispatchEvent(new Event('input',{bubbles:true}));

      const tile=$(`.typing-hint-tile[data-index="${targetIndex}"]`,card);
      if(tile){tile.textContent=targetChar;tile.classList.add('solved')}
      card.classList.add('settled');
      status.textContent=isDouble
        ? `Yes — ${targetChar}. Good catch: this is a double-letter spot. Keep typing while the hint stays here.`
        : `Yes — ${targetChar}. Nice. Keep typing while the hint stays here.`;
      status.className='typing-hint-status good';

      const caret=Math.min(input.value.length,editIndex+1);
      input.focus();input.setSelectionRange?.(caret,caret);
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
