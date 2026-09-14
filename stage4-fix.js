(()=>{
  'use strict';

  const STORAGE_KEY='miori_spell_garden_v1';
  let openCleanup=null;
  let replacingLegacy=false;

  const readState=()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
  };

  const stage4Context=()=>{
    const input=document.querySelector('#questionArea .full-input');
    if(!input) return null;
    const label=(document.querySelector('#stageName')?.textContent||'').toLowerCase();
    if(label && !label.includes('stage 4')) return null;
    const wrap=input.closest('.type-wrap');
    if(!wrap) return null;
    return {input,wrap};
  };

  const findWord=(ctx)=>{
    const state=readState();
    const words=Array.isArray(state?.library)?state.library:[];
    const cue=(document.querySelector('#wordVisualCue span:last-child')?.textContent||'').trim();
    if(cue){
      const exact=words.find(w=>String(w.pictureCue||'').trim()===cue);
      if(exact) return exact;
    }
    const expectedLen=Math.max(0,(Number(ctx.input.maxLength)||0)-4);
    const byLen=words.filter(w=>String(w.word||'').length===expectedLen);
    return byLen.length===1?byLen[0]:null;
  };

  const saveHintUse=(wordObj)=>{
    try{
      const state=readState();
      if(!state||!Array.isArray(state.library)) return;
      const w=state.library.find(x=>x.id===wordObj.id)||state.library.find(x=>x.word===wordObj.word);
      if(!w) return;
      w.learning=w.learning||{};
      w.learning.hintUsed=(w.learning.hintUsed||0)+1;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }catch{}
  };

  const slowAudio=(wordObj)=>{
    const fallback=()=>{
      try{
        if(!('speechSynthesis' in window)) return;
        speechSynthesis.cancel();
        const u=new SpeechSynthesisUtterance(String(wordObj.word||''));
        u.lang='en-US';u.rate=.62;u.pitch=1.02;
        speechSynthesis.speak(u);
      }catch{}
    };
    if(wordObj.pronunciationUrl){
      try{
        const a=new Audio(wordObj.pronunciationUrl);
        a.playbackRate=.76;
        a.play().catch(fallback);
        return;
      }catch{}
    }
    fallback();
  };

  const confusions=(char)=>{
    const map={
      a:['e','o'],b:['p','d'],c:['k','s'],d:['b','t'],e:['i','a'],f:['v','p'],g:['j','k'],h:['n','r'],
      i:['e','y'],j:['g','c'],k:['c','g'],l:['r','i'],m:['n','w'],n:['m','h'],o:['u','a'],p:['b','d'],q:['g','k'],
      r:['l','n'],s:['c','z'],t:['d','p'],u:['o','a'],v:['f','b'],w:['m','v'],x:['z','s'],y:['i','e'],z:['s','x']
    };
    return (map[char]||['e','a']).filter(x=>x!==char&&x.length===1);
  };

  const shuffle=a=>a.map(v=>({v,r:Math.random()})).sort((x,y)=>x.r-y.r).map(x=>x.v);

  const boxesFor=ctx=>[...ctx.wrap.querySelectorAll('.stage4-letter-box')];

  const syncSource=(ctx,boxes)=>{
    ctx.input.value=boxes.map(b=>(b.value||'').toLowerCase()).join('');
    ctx.input.dispatchEvent(new Event('input',{bubbles:true}));
  };

  const clearBoxFeedback=(boxes)=>{
    boxes.forEach(b=>b.classList.remove('stage4-ok','stage4-bad'));
  };

  const decorateStage4=()=>{
    const ctx=stage4Context();
    if(!ctx||ctx.wrap.querySelector('.stage4-box-row')) return;
    const wordObj=findWord(ctx);
    if(!wordObj) return;
    const word=String(wordObj.word||'').toLowerCase();
    if(!word) return;

    const row=document.createElement('div');
    row.className='stage4-box-row';
    row.setAttribute('aria-label','Type the whole word, one letter in each box');

    for(let i=0;i<word.length;i++){
      const box=document.createElement('input');
      box.type='text';
      box.className='stage4-letter-box';
      box.maxLength=1;
      box.autocomplete='off';
      box.spellcheck=false;
      box.inputMode='text';
      box.dataset.index=String(i);
      box.setAttribute('aria-label',`Letter ${i+1}`);
      row.appendChild(box);
    }

    ctx.input.classList.add('stage4-source-input');
    ctx.input.insertAdjacentElement('beforebegin',row);
    const boxes=boxesFor(ctx);

    boxes.forEach((box,i)=>{
      box.addEventListener('input',()=>{
        const clean=(box.value||'').replace(/[^a-z]/gi,'').slice(-1).toLowerCase();
        box.value=clean;
        box.classList.remove('stage4-ok','stage4-bad','hint-solved');
        syncSource(ctx,boxes);
        if(clean && i<boxes.length-1) boxes[i+1].focus();
      });

      box.addEventListener('keydown',e=>{
        if(e.key==='Backspace' && !box.value && i>0){
          e.preventDefault();
          boxes[i-1].value='';
          boxes[i-1].classList.remove('stage4-ok','stage4-bad','hint-solved');
          syncSource(ctx,boxes);
          boxes[i-1].focus();
          return;
        }
        if(e.key==='ArrowLeft' && i>0){e.preventDefault();boxes[i-1].focus();return}
        if(e.key==='ArrowRight' && i<boxes.length-1){e.preventDefault();boxes[i+1].focus();return}
        if(e.key==='Enter'){
          e.preventDefault();
          syncSource(ctx,boxes);
          ctx.wrap.querySelector('.submit-answer')?.click();
        }
      });

      box.addEventListener('focus',()=>box.select());
    });

    const submit=ctx.wrap.querySelector('.submit-answer');
    if(submit){
      submit.addEventListener('click',()=>{
        syncSource(ctx,boxes);
        setTimeout(()=>paintResult(ctx,wordObj),0);
      });
    }

    setTimeout(()=>boxes.find(b=>!b.value)?.focus(),40);
  };

  const paintResult=(ctx,wordObj)=>{
    if(!ctx||!wordObj) return;
    const word=String(wordObj.word||'').toLowerCase();
    const boxes=boxesFor(ctx);
    if(!boxes.length) return;
    const attempt=boxes.map(b=>(b.value||'').toLowerCase()).join('');
    boxes.forEach((box,i)=>{
      box.classList.remove('stage4-ok','stage4-bad');
      if((box.value||'').toLowerCase()===word[i]) box.classList.add('stage4-ok');
      else box.classList.add('stage4-bad');
    });
    if(attempt===word){
      boxes.forEach(b=>{b.disabled=true;b.classList.remove('stage4-bad');b.classList.add('stage4-ok')});
    }else{
      const firstBad=boxes.find((b,i)=>(b.value||'').toLowerCase()!==word[i]);
      setTimeout(()=>firstBad?.focus(),120);
    }
  };

  const clearDirect=()=>{
    openCleanup?.();
    openCleanup=null;
    document.querySelectorAll('.stage4-box-hint-controls,.stage4-double-badge').forEach(x=>x.remove());
    document.querySelectorAll('.stage4-letter-box').forEach(x=>x.classList.remove('hint-target','pair-hint'));
  };

  const clearLegacy=()=>{
    const panel=document.querySelector('#helpPanel');
    if(panel && stage4Context() && panel.querySelector('.hint-choices')){
      panel.className='help-panel hidden';
      panel.innerHTML='';
    }
    document.querySelectorAll('.stage4-hint-track,.stage4-direct-track,.stage4-direct-controls,.typing-hint-strip').forEach(x=>x.remove());
  };

  const showBoxHint=(countUsage=true)=>{
    const ctx=stage4Context();
    if(!ctx) return;
    decorateStage4();
    const wordObj=findWord(ctx);
    if(!wordObj) return;
    const word=String(wordObj.word||'').toLowerCase();
    const boxes=boxesFor(ctx);
    if(!word||boxes.length!==word.length) return;

    clearDirect();
    clearLegacy();
    if(countUsage) saveHintUse(wordObj);
    slowAudio(wordObj);

    let idx=boxes.findIndex((b,i)=>(b.value||'').toLowerCase()!==word[i]);
    if(idx<0){
      const last=boxes[boxes.length-1];
      last?.animate([
        {boxShadow:'0 0 0 0 rgba(120,189,144,0)'},
        {boxShadow:'0 0 0 9px rgba(120,189,144,.18)'},
        {boxShadow:'0 0 0 0 rgba(120,189,144,0)'}
      ],{duration:760});
      last?.focus();
      return;
    }

    const target=word[idx];
    const box=boxes[idx];
    box.classList.remove('stage4-bad');
    box.classList.add('hint-target');

    const isDouble=word[idx-1]===target||word[idx+1]===target;
    if(isDouble){
      const neighbor=word[idx-1]===target?idx-1:idx+1;
      box.classList.add('pair-hint');
      boxes[neighbor]?.classList.add('pair-hint');
      const badge=document.createElement('span');
      badge.className='stage4-double-badge';
      badge.textContent='×2';
      ctx.wrap.querySelector('.stage4-box-row')?.appendChild(badge);
    }

    const pool=[target,...confusions(target)];
    const fallback=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallback){if(!pool.includes(c))pool.push(c);if(pool.length>=3)break}
    const choices=shuffle([...new Set(pool)]).slice(0,3);

    const controls=document.createElement('div');
    controls.className='stage4-box-hint-controls';
    controls.innerHTML=`<button type="button" class="stage4-hint-icon replay" aria-label="Play slowly">🔊</button><div class="stage4-letter-choices">${choices.map(c=>`<button type="button" class="stage4-letter-choice" data-char="${c}">${c}</button>`).join('')}</div><button type="button" class="stage4-hint-icon close" aria-label="Close hint">×</button>`;
    ctx.wrap.querySelector('.stage4-box-row')?.insertAdjacentElement('afterend',controls);

    const cleanup=()=>{
      controls.remove();
      ctx.wrap.querySelector('.stage4-double-badge')?.remove();
      boxes.forEach(b=>b.classList.remove('hint-target','pair-hint'));
      box.removeEventListener('input',onType);
    };
    openCleanup=cleanup;

    const solved=()=>{
      box.classList.remove('hint-target','stage4-bad');
      box.classList.add('hint-solved');
      controls.querySelectorAll('button').forEach(b=>b.disabled=true);
      setTimeout(()=>{
        cleanup();openCleanup=null;
        const next=boxes.find((b,i)=>i>idx && (b.value||'').toLowerCase()!==word[i]);
        (next||boxes[Math.min(idx+1,boxes.length-1)]||box).focus();
      },620);
    };

    const onType=()=>{
      if((box.value||'').toLowerCase()===target) solved();
    };
    box.addEventListener('input',onType);

    controls.querySelector('.close').onclick=()=>{cleanup();openCleanup=null;box.focus()};
    controls.querySelector('.replay').onclick=()=>{slowAudio(wordObj);box.focus()};
    controls.querySelectorAll('.stage4-letter-choice').forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.char!==target){
        btn.classList.add('wrong');
        setTimeout(()=>btn.classList.remove('wrong'),420);
        return;
      }
      btn.classList.add('correct');
      box.value=target;
      syncSource(ctx,boxes);
      box.dispatchEvent(new Event('input',{bubbles:true}));
    });

    box.focus();
  };

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#hintBtn');
    if(!btn||!stage4Context()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showBoxHint(true);
  },true);

  const observer=new MutationObserver(()=>{
    const ctx=stage4Context();
    if(!ctx) return;
    decorateStage4();
    if(replacingLegacy) return;
    const panel=document.querySelector('#helpPanel');
    if(panel?.querySelector('.hint-choices')||document.querySelector('.stage4-hint-track,.stage4-direct-track,.stage4-direct-controls')){
      replacingLegacy=true;
      setTimeout(()=>{
        clearLegacy();
        showBoxHint(false);
        replacingLegacy=false;
      },0);
    }
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorateStage4,0);
})();