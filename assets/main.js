/* Karandeep Singh – Insurance Advisor website */
(function(){
  /* ================= SETTINGS ================= */
  // All form submissions (quotes + reviews) are emailed here via FormSubmit.co
  const FORM_EMAIL = 'karandeepsinghinsurance@gmail.com';
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + FORM_EMAIL;
  // Reviews are saved & loaded by review.php (stored in data/reviews.json on your hosting)
  const REVIEW_API = 'review.php';
  /* ============================================ */

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header background on scroll
  const header=document.getElementById('header');
  const onScroll=()=>header&&header.classList.toggle('scrolled',window.scrollY>10);
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  // mobile menu
  const menuBtn=document.getElementById('menuBtn'),navLinks=document.getElementById('navLinks');
  if(menuBtn){
    menuBtn.addEventListener('click',()=>{const o=navLinks.classList.toggle('show');menuBtn.setAttribute('aria-expanded',o)});
    navLinks.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{navLinks.classList.remove('show');menuBtn.setAttribute('aria-expanded',false)}));
  }
  document.querySelectorAll('.has-drop>button').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();const p=b.parentNode;const o=p.classList.toggle('open');b.setAttribute('aria-expanded',o);
  }));
  document.addEventListener('click',e=>{
    document.querySelectorAll('.has-drop.open').forEach(d=>{if(!d.contains(e.target)&&window.innerWidth>1060)d.classList.remove('open')});
  });

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>{
    const item=q.parentNode,wasOpen=item.classList.contains('open');
    item.parentNode.querySelectorAll('.faq-item').forEach(i=>{i.classList.remove('open');i.querySelector('.faq-q').setAttribute('aria-expanded',false)});
    if(!wasOpen){item.classList.add('open');q.setAttribute('aria-expanded',true)}
  }));

  /* ---------- animations ---------- */
  // rotating word in hero
  const rot=document.getElementById('rot');
  if(rot&&!reduceMotion){
    const words=['Car','Home','Business','Life','Condo','Travel'];let i=0;
    setInterval(()=>{
      rot.classList.add('out');
      setTimeout(()=>{i=(i+1)%words.length;rot.textContent=words[i];rot.classList.remove('out');rot.classList.add('in-pre');
        requestAnimationFrame(()=>requestAnimationFrame(()=>rot.classList.remove('in-pre')));},350);
    },2600);
  }
  // scroll reveal
  const sel='.sec-head,.sec-head-center,.cat,.fx,.card,.pcard,.cov>div,.award,.faq-item,.form-card,.rv-card,.prose,.split>.ph,.pgroup-head,.tip,.article h2,.ticks,.partners h3,.cta-copy,.faq-art,.rv-empty';
  const els=[...document.querySelectorAll(sel)];
  if('IntersectionObserver' in window&&!reduceMotion){
    els.forEach(el=>{
      const sib=[...el.parentNode.children].filter(c=>c.matches(sel));
      el.style.transitionDelay=(Math.min(sib.indexOf(el),5)*70)+'ms';
      el.classList.add('reveal');
    });
    const io=new IntersectionObserver(entries=>entries.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}}),{rootMargin:'0px 0px -40px 0px',threshold:.08});
    els.forEach(el=>io.observe(el));
    window.__observeReveal=el=>{el.classList.add('reveal');io.observe(el)};
  }

  /* ---------- helpers ---------- */
  function setMsg(el,type,html){el.className='form-msg show '+type;el.innerHTML=html}
  async function sendEmail(data){
    const r=await fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||String(j.success)!=='true')throw new Error(j.message||'Send failed');
    return j;
  }
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ---------- contact / quote form ---------- */
  const form=document.getElementById('contactForm');
  if(form){
    const params=new URLSearchParams(location.search);
    const sel=form.querySelector('[name=service]');
    const t=params.get('type');
    if(t&&[...sel.options].some(o=>o.value===t)){
      sel.value=t;
      const chip=document.getElementById('quoteFor');
      chip.textContent=(t==='Claims Help'?'Request: ':'Quote for: ')+(params.get('for')||t);chip.hidden=false;
    }
    const f=params.get('for');
    if(f){form.querySelector('[name=message]').value='I’m interested in coverage for: '+f+'\n'}
    const msg=document.getElementById('formMsg');
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!form.reportValidity())return;
      const d=Object.fromEntries(new FormData(form).entries());
      if(d._honey)return;
      const btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.classList.add('loading');
      try{
        await sendEmail({
          _subject:'New website request – '+d.service,_template:'table',_captcha:'false',_replyto:d.email,
          Name:d.name,Phone:d.phone,Email:d.email,Service:d.service,'Preferred contact':d.preferred_contact,Details:d.message||'-',Page:location.href
        });
        form.reset();if(t)sel.value=t;
        setMsg(msg,'ok','✅ Thank you! Your request has been sent. Karandeep will contact you shortly.');
      }catch(err){
        const body=encodeURIComponent(`Name: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nService: ${d.service}\n\n${d.message||''}`);
        setMsg(msg,'err',`Sorry, the form couldn’t be sent right now. Please call <a href="tel:+12899685254">(289) 968-5254</a> or <a href="mailto:${FORM_EMAIL}?subject=${encodeURIComponent('Quote request – '+d.service)}&body=${body}">email your request</a>.`);
      }finally{btn.disabled=false;btn.classList.remove('loading')}
    });
  }

  /* ---------- reviews (reviews.json) ---------- */
  const rvForm=document.getElementById('reviewForm');
  if(rvForm){
    const list=document.getElementById('rvList'),empty=document.getElementById('rvEmpty'),more=document.getElementById('rvMore');
    const sum=document.getElementById('rvSummary'),avgEl=document.getElementById('rvAvg'),cntEl=document.getElementById('rvCount');
    const STAR='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.3 6.9.9-5 4.8 1.2 6.9L12 17.6 5.9 20.9 7.1 14l-5-4.8 6.9-.9L12 2z"/></svg>';
    let all=[],shown=4;
    const fmt=d=>{const x=new Date(d);return isNaN(x)?'':x.toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'})};
    function card(r){
      const n=Math.max(1,Math.min(5,Number(r.rating)||5));
      const ini=esc(String(r.name||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase());
      return `<article class="rv-card"><div class="rv-top"><div class="t-avatar rv-av">${ini}</div><div><b>${esc(r.name)}</b><small>${esc(r.service||'')}${r.date?' · '+fmt(r.date):''}</small></div><div class="stars rv-stars" aria-label="${n} out of 5">${STAR.repeat(n)}<span class="off">${STAR.repeat(5-n)}</span></div></div><p>${esc(r.text)}</p></article>`;
    }
    function render(){
      empty.hidden=all.length>0;
      list.innerHTML=all.slice(0,shown).map(card).join('');
      more.hidden=all.length<=shown;
      if(all.length){
        const avg=all.reduce((a,r)=>a+(Number(r.rating)||5),0)/all.length;
        avgEl.textContent=avg.toFixed(1);cntEl.textContent=`Based on ${all.length} review${all.length>1?'s':''}`;sum.hidden=false;
      }else sum.hidden=true;
    }
    more.addEventListener('click',()=>{shown+=4;render()});
    render();
    // load reviews from review.php
    fetch(REVIEW_API+'?v='+Date.now(),{cache:'no-store'})
      .then(r=>r.ok?r.json():null)
      .then(j=>{ if(j&&Array.isArray(j.reviews)){all=j.reviews;render()} })
      .catch(()=>{});

    // star picker
    const pick=document.getElementById('starPick'),rating=rvForm.querySelector('[name=rating]');
    const paint=v=>[...pick.children].forEach((b,i)=>{b.classList.toggle('on',i<v);b.setAttribute('aria-pressed',i<v)});
    pick.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;rating.value=b.dataset.v;paint(+b.dataset.v)});
    pick.addEventListener('mouseover',e=>{const b=e.target.closest('button');if(b)paint(+b.dataset.v)});
    pick.addEventListener('mouseleave',()=>paint(+rating.value));
    paint(5);

    const msg=document.getElementById('reviewMsg');
    rvForm.addEventListener('submit',async e=>{
      e.preventDefault();
      const d=Object.fromEntries(new FormData(rvForm).entries());
      if(d._honey)return;
      d.name=(d.name||'').trim();d.review=(d.review||'').trim();
      if(!d.name||d.review.length<10){setMsg(msg,'err','Please add your name and a review of at least 10 characters.');return}
      if(/https?:\/\/|www\./i.test(d.review)){setMsg(msg,'err','Please remove links from your review.');return}
      let last=0;try{last=+localStorage.getItem('rv_last')||0}catch(_){}
      if(Date.now()-last<60*1000){setMsg(msg,'err','You just posted a review – thank you! Please wait a moment before posting another.');return}
      const btn=rvForm.querySelector('button[type=submit]');btn.disabled=true;btn.classList.add('loading');
      const review={name:d.name.slice(0,60),service:d.service,rating:+d.rating,text:d.review.slice(0,600),date:new Date().toISOString()};
      let saved=false,errText='';
      try{
        const r=await fetch(REVIEW_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...review,_honey:d._honey||''})});
        const j=await r.json().catch(()=>({}));
        saved=r.ok&&j.ok===true; if(!saved)errText=j.error||'';
      }catch(_){}
      if(!saved&&errText){setMsg(msg,'err',esc(errText));btn.disabled=false;btn.classList.remove('loading');return}
      // email copy to Karandeep
      try{await sendEmail({
        _subject:`New ${review.rating}★ website review – ${review.name}`,_template:'table',_captcha:'false',
        Name:review.name,Service:review.service,Rating:review.rating+' / 5',Review:review.text,
        'Live on website':saved?'Yes':'No – could not save (check review.php on the hosting)'
      })}catch(_){}
      try{localStorage.setItem('rv_last',Date.now())}catch(_){}
      if(saved){all=[review,...all];shown=Math.max(shown,4);render();setMsg(msg,'ok','✅ Thank you! Your review has been posted.')}
      else setMsg(msg,'ok','✅ Thank you! Your review has been received and will appear on the website soon.');
      rvForm.reset();rating.value=5;paint(5);
      btn.disabled=false;btn.classList.remove('loading');
    });
  }

  const yr=document.getElementById('yr');if(yr)yr.textContent=new Date().getFullYear();
})();
