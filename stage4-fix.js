(()=>{
  'use strict';
  const STORAGE_KEY='miori_spell_garden_v1';
  let replacingLegacy=false;
  let openCleanup=null;

  const stage4Context=()=>{
    const input=document.querySelector('#questionArea .full-input');
    if(!input) return null;
    const label=(document.querySelector('#stageName')?.textContent||'').toLowerCase();
    if(label && !label.includes('stage 4')) return null;
    const wrap=input.closest('.type-wrap');
    if(!wrap) return null;
    return {input,wrap};
  };

  const readState=()=>{
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return null}
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
    const map={a:['e','o'],b:['p','d'],c:['k','s'],d:['b','t'],e:['i','a'],f:['v','p'],g:['j','k'],h:['n','r'],i:['e','y'],j:['g','c'],k:['c','g'],l:['r','i'],m:['n','w'],n:['m','h'],o:['u','a'],p:['b','d'],q:['g','k'],r:['l','n'],s:['c','z'],t:['d','p'],u:['o','a'],v:['f','b'],w:['m','v'],x:['z','s'],y:['i','e'],z:['s','x']};
    return (map[char]||['e','a']).filter(x=>x!==char&&x.length===1);
  };
  const shuffle=a=>a.map(v=>({v,r:Math.random()})).sort((x,y)=>x.r-y.r).map(x=>x.v);

  const clearDirect=()=>{
    openCleanup?.();
    openCleanup=null;
    document.querySelectorAll('.stage4-direct-track,.stage4-direct-controls').forEach(x=>x.remove());
    document.querySelector('.full-input')?.classList.remove('stage4-hint-active');
  };

  const clearLegacy=()=>{
    document.querySelectorAll('.stage4-hint-track,.typing-hint-strip').forEach(x=>x.remove());
    const panel=document.querySelector('#helpPanel');
    if(panel && stage4Context()) {panel.className='help-panel hidden';panel.innerHTML=''}
  };

  const showDirectHint=(countUsage=true)=>{
    const ctx=stage4Context();
    if(!ctx) return;
    const wordObj=findWord(ctx);
    if(!wordObj) return;
    const word=String(wordObj.word||'').toLowerCase();
    if(!word) return;

    clearDirect();
    clearLegacy();
    if(countUsage) saveHintUse(wordObj);
    slowAudio(wordObj);

    const typed=(ctx.input.value||'').toLowerCase();
    let idx=0;
    while(idx<word.length && typed[idx]===word[idx]) idx++;
    if(idx>=word.length){
      ctx.input.animate([{boxShadow:'0 0 0 0 rgba(120,189,144,0)'},{boxShadow:'0 0 0 8px rgba(120,189,144,.18)'},{boxShadow:'0 0 0 0 rgba(120,189,144,0)'}],{duration:750});
      ctx.input.focus();
      return;
    }

    const target=word[idx];
    const isDouble=word[idx-1]===target||word[idx+1]===target;
    const track=document.createElement('div');
    track.className='stage4-direct-track';
    track.setAttribute('aria-label','Spelling hint position');
    for(let i=0;i<word.length;i++){
      const cell=document.createElement('span');
      cell.className='stage4-direct-cell';cell.dataset.index=String(i);
      if(i<idx && typed[i]===word[i]){cell.textContent=typed[i];cell.classList.add('known')}
      else if(i===idx){cell.textContent='?';cell.classList.add('target')}
      else{cell.innerHTML='&nbsp;';cell.classList.add('future')}
      track.appendChild(cell);
    }
    if(isDouble){
      const neighbor=word[idx-1]===target?idx-1:idx+1;
      track.querySelector(`[data-index="${neighbor}"]`)?.classList.add('pair');
      track.querySelector(`[data-index="${idx}"]`)?.classList.add('pair');
      const badge=document.createElement('b');badge.className='stage4-double-badge';badge.textContent='×2';track.appendChild(badge);
    }

    const pool=[target,...confusions(target)];
    const fallback=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallback){if(!pool.includes(c))pool.push(c);if(pool.length>=3)break}
    const choices=shuffle([...new Set(pool)]).slice(0,3);
    const controls=document.createElement('div');
    controls.className='stage4-direct-controls';
    controls.innerHTML=`<button type="button" class="stage4-hint-icon replay" aria-label="Play slowly">🔊</button><div class="stage4-letter-choices">${choices.map(c=>`<button type="button" class="stage4-letter-choice" data-char="${c}">${c}</button>`).join('')}</div><button type="button" class="stage4-hint-icon close" aria-label="Close hint">×</button>`;

    ctx.input.classList.add('stage4-hint-active');
    ctx.input.insertAdjacentElement('beforebegin',track);
    ctx.input.insertAdjacentElement('afterend',controls);

    const focusAtTarget=()=>{
      ctx.input.focus();
      try{ctx.input.setSelectionRange(idx,Math.min(idx+1,ctx.input.value.length))}catch{}
    };
    focusAtTarget();

    const cleanup=()=>{
      track.remove();controls.remove();ctx.input.classList.remove('stage4-hint-active');
      ctx.input.removeEventListener('input',onType);
    };
    openCleanup=cleanup;

    const solved=()=>{
      const cell=track.querySelector(`[data-index="${idx}"]`);
      if(cell){cell.textContent=target;cell.classList.remove('target');cell.classList.add('solved')}
      controls.querySelectorAll('button').forEach(b=>b.disabled=true);
      setTimeout(()=>{cleanup();openCleanup=null;ctx.input.focus();try{ctx.input.setSelectionRange(idx+1,idx+1)}catch{}},620);
    };

    const onType=()=>{
      const now=(ctx.input.value||'').toLowerCase();
      if(now[idx]===target) solved();
    };
    ctx.input.addEventListener('input',onType);

    controls.querySelector('.close').onclick=()=>{cleanup();openCleanup=null;ctx.input.focus()};
    controls.querySelector('.replay').onclick=()=>{slowAudio(wordObj);focusAtTarget()};
    controls.querySelectorAll('.stage4-letter-choice').forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.char!==target){btn.classList.add('wrong');setTimeout(()=>btn.classList.remove('wrong'),420);return}
      btn.classList.add('correct');
      const value=ctx.input.value||'';
      ctx.input.value=value.slice(0,idx)+target+(value.length>idx?value.slice(idx+1):'');
      ctx.input.dispatchEvent(new Event('input',{bubbles:true}));
    });
  };

  /* Stage 4 owns its Hint click completely so it cannot conflict with older Hint UI. */
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#hintBtn');
    if(!btn||!stage4Context()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    showDirectHint(true);
  },true);

  /* The main app may auto-open its old Hint after repeated mistakes. Replace it immediately. */
  const observer=new MutationObserver(()=>{
    if(replacingLegacy||!stage4Context()) return;
    if(document.querySelector('.stage4-hint-track')||document.querySelector('.typing-hint-strip')){
      replacingLegacy=true;
      setTimeout(()=>{clearLegacy();showDirectHint(false);replacingLegacy=false},0);
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();