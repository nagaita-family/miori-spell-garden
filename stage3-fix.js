(()=>{
  const STORAGE_KEY='miori_spell_garden_v1';

  const visibleStage3=()=>{
    const group=document.querySelector('#questionArea .stage3-input-group');
    if(!group) return null;
    const boxes=[...group.querySelectorAll('.stage3-letter-box')];
    if(!boxes.length) return null;
    const line=group.closest('.stage3-word-line');
    if(!line) return null;
    const parts=[...line.children];
    const before=(parts[0]?.textContent||'').toLowerCase();
    const after=(parts[2]?.textContent||'').toLowerCase();
    return {group,boxes,line,before,after};
  };

  const findWord=(ctx)=>{
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      const state=raw?JSON.parse(raw):null;
      const words=Array.isArray(state?.library)?state.library:[];
      return words.find(w=>{
        const word=String(w.word||'').toLowerCase();
        return word.startsWith(ctx.before) && word.endsWith(ctx.after) && word.length===ctx.before.length+ctx.boxes.length+ctx.after.length;
      })||null;
    }catch{return null}
  };

  const confusions=(char)=>{
    const map={
      a:['e','o'],b:['p','d'],c:['k','s'],d:['b','t'],e:['i','a'],f:['v','p'],g:['j','k'],h:['n','r'],
      i:['e','y'],j:['g','ch'],k:['c','g'],l:['r','i'],m:['n','w'],n:['m','h'],o:['u','a'],p:['b','d'],q:['g','k'],
      r:['l','n'],s:['c','z'],t:['d','p'],u:['o','a'],v:['f','b'],w:['m','v'],x:['z','s'],y:['i','e'],z:['s','x']
    };
    return (map[char]||['e','a']).filter(x=>x.length===1&&x!==char);
  };

  const shuffle=(arr)=>arr.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);

  const speakSlow=(word)=>{
    try{
      if(!('speechSynthesis' in window)||!word) return;
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(word);
      u.lang='en-US';u.rate=.62;u.pitch=1.02;
      speechSynthesis.speak(u);
    }catch{}
  };

  const clearHint=()=>{
    document.querySelectorAll('.typing-hint-strip').forEach(x=>x.remove());
    document.querySelectorAll('.double-badge').forEach(x=>x.remove());
    document.querySelectorAll('.stage3-letter-box').forEach(x=>x.classList.remove('hint-target','hint-solved','pair-hint'));
  };

  const showDirectHint=()=>{
    const ctx=visibleStage3();
    if(!ctx) return;
    const wordObj=findWord(ctx);
    if(!wordObj) return;
    const word=String(wordObj.word||'').toLowerCase();
    const correct=word.slice(ctx.before.length,word.length-ctx.after.length);
    if(correct.length!==ctx.boxes.length) return;

    clearHint();
    let idx=ctx.boxes.findIndex((b,i)=>(b.value||'').toLowerCase()!==correct[i]);
    if(idx<0){
      const box=ctx.boxes[ctx.boxes.length-1];
      box?.animate([{boxShadow:'0 0 0 0 rgba(120,189,144,0)'},{boxShadow:'0 0 0 8px rgba(120,189,144,.18)'},{boxShadow:'0 0 0 0 rgba(120,189,144,0)'}],{duration:750});
      box?.focus();
      return;
    }

    const target=correct[idx];
    const box=ctx.boxes[idx];
    box.classList.add('hint-target');

    const isDouble=correct[idx-1]===target||correct[idx+1]===target;
    if(isDouble){
      const n=correct[idx-1]===target?idx-1:idx+1;
      ctx.boxes[n]?.classList.add('pair-hint');
      box.classList.add('pair-hint');
      const badge=document.createElement('span');
      badge.className='double-badge';badge.textContent='×2';
      ctx.group.appendChild(badge);
    }

    const pool=[target,...confusions(target)];
    const fallbacks=['e','a','i','o','u','b','d','p','t','c','g','s','r','l','m','n','h','f','v','w','y'];
    for(const c of fallbacks){if(!pool.includes(c))pool.push(c);if(pool.length>=3)break}
    const choices=shuffle([...new Set(pool)]).slice(0,3);

    const strip=document.createElement('div');
    strip.className='typing-hint-strip';
    strip.innerHTML=`<button type="button" class="hint-icon-btn hint-replay" aria-label="Play slowly">🔊</button><div class="hint-letter-choices">${choices.map(c=>`<button type="button" class="hint-letter-choice" data-char="${c}">${c}</button>`).join('')}</div><button type="button" class="hint-icon-btn hint-close" aria-label="Close hint">×</button>`;
    const wrap=ctx.group.closest('.type-wrap');
    const submit=wrap?.querySelector('.submit-answer');
    if(!wrap) return;
    wrap.insertBefore(strip,submit||null);

    speakSlow(word);
    strip.querySelector('.hint-close').onclick=()=>{clearHint();box.focus()};
    strip.querySelector('.hint-replay').onclick=()=>{speakSlow(word);box.focus()};
    strip.querySelectorAll('.hint-letter-choice').forEach(btn=>btn.onclick=()=>{
      if(btn.dataset.char!==target){
        btn.classList.add('wrong');
        setTimeout(()=>btn.classList.remove('wrong'),430);
        return;
      }
      strip.querySelectorAll('.hint-letter-choice').forEach(x=>x.disabled=true);
      btn.classList.add('correct');
      box.value=target;
      box.classList.add('filled','hint-solved');
      box.dispatchEvent(new Event('input',{bubbles:true}));
      const next=ctx.boxes.find((b,i)=>i>idx && (b.value||'').toLowerCase()!==correct[i]);
      setTimeout(()=>{
        clearHint();
        (next||ctx.boxes[Math.min(idx+1,ctx.boxes.length-1)]||box).focus();
      },700);
    });
  };

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#hintBtn');
    if(!btn||!visibleStage3()) return;
    setTimeout(showDirectHint,0);
  },true);

  const focusStage3=()=>{
    const ctx=visibleStage3();
    if(!ctx) return;
    const active=document.activeElement;
    if(!ctx.boxes.includes(active)){
      const first=ctx.boxes.find(b=>!b.value)||ctx.boxes[0];
      first?.focus();
    }
  };
  const observer=new MutationObserver(()=>setTimeout(focusStage3,0));
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();

/* Load the Stage 4 Hint helper after the Stage 3 helper so each stage owns its own focused Hint behavior. */
(()=>{
  if(document.querySelector('script[data-stage4-helper]')) return;
  const s=document.createElement('script');
  s.src='stage4-fix.js';
  s.defer=true;
  s.dataset.stage4Helper='1';
  document.head.appendChild(s);
})();

/* Load Garden collectible illustrations as a separate visual layer. */
(()=>{
  if(document.querySelector('script[data-cute-items]')) return;
  const s=document.createElement('script');
  s.src='cute-items.js';
  s.defer=true;
  s.dataset.cuteItems='1';
  document.head.appendChild(s);
})();