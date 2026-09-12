(()=>{
  const enhance=()=>{
    document.querySelectorAll('.stage3-input-group').forEach(group=>{
      if(group.dataset.keyboardFixed==='1') return;
      const hidden=group.querySelector('.stage3-real-input');
      const row=group.querySelector('.stage3-slot-row');
      if(!hidden||!row) return;
      group.dataset.keyboardFixed='1';

      const oldSlots=[...row.querySelectorAll('.stage3-letter-slot')];
      const boxes=oldSlots.map((old,i)=>{
        const box=document.createElement('input');
        box.type='text';
        box.inputMode='text';
        box.autocomplete='off';
        box.spellcheck=false;
        box.maxLength=1;
        box.className=old.className+' stage3-letter-box';
        box.dataset.local=old.dataset.local??String(i);
        box.setAttribute('aria-label',`Missing letter ${i+1}`);
        old.replaceWith(box);
        return box;
      });

      hidden.tabIndex=-1;
      hidden.setAttribute('aria-hidden','true');

      let syncing=false;
      const syncHidden=()=>{
        if(syncing) return;
        syncing=true;
        hidden.value=boxes.map(b=>b.value.toLowerCase()).join('');
        syncing=false;
      };
      const syncBoxes=()=>{
        if(syncing) return;
        syncing=true;
        const chars=(hidden.value||'').toLowerCase().split('');
        boxes.forEach((b,i)=>{
          b.value=chars[i]||'';
          b.classList.toggle('filled',!!b.value);
        });
        syncing=false;
      };
      const focusBest=()=>{
        const firstEmpty=boxes.find(b=>!b.value) || boxes[boxes.length-1];
        firstEmpty?.focus();
        firstEmpty?.select?.();
      };

      boxes.forEach((box,i)=>{
        box.addEventListener('input',()=>{
          let v=(box.value||'').toLowerCase().replace(/[^a-z]/g,'');
          if(v.length>1) v=v.slice(-1);
          box.value=v;
          box.classList.toggle('filled',!!v);
          syncHidden();
          if(v && i<boxes.length-1){
            boxes[i+1].focus();
            boxes[i+1].select();
          }
        });
        box.addEventListener('keydown',e=>{
          if(e.key==='Backspace' && !box.value && i>0){
            e.preventDefault();
            boxes[i-1].value='';
            boxes[i-1].classList.remove('filled');
            syncHidden();
            boxes[i-1].focus();
          }else if(e.key==='ArrowLeft' && i>0){
            e.preventDefault();boxes[i-1].focus();
          }else if(e.key==='ArrowRight' && i<boxes.length-1){
            e.preventDefault();boxes[i+1].focus();
          }else if(e.key==='Enter'){
            e.preventDefault();group.closest('.type-wrap')?.querySelector('.submit-answer')?.click();
          }
        });
        box.addEventListener('paste',e=>{
          const text=(e.clipboardData?.getData('text')||'').toLowerCase().replace(/[^a-z]/g,'');
          if(!text) return;
          e.preventDefault();
          [...text].forEach((ch,j)=>{
            const target=boxes[i+j];if(target){target.value=ch;target.classList.add('filled')}
          });
          syncHidden();
          const next=boxes[Math.min(i+text.length,boxes.length-1)];next?.focus();
        });
      });

      hidden.addEventListener('input',syncBoxes);
      hidden.addEventListener('focus',()=>setTimeout(focusBest,0));
      hidden.addEventListener('select',()=>setTimeout(focusBest,0));
      group.addEventListener('click',e=>{
        if(e.target===group||e.target===row) focusBest();
      });

      syncBoxes();
      setTimeout(focusBest,20);
    });
  };

  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',enhance);
  setTimeout(enhance,100);
})();