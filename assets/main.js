/* Solutions Insurance Group – shared scripts */
(function(){
  // header background on scroll
  const header=document.getElementById('header');
  const onScroll=()=>header&&header.classList.toggle('scrolled',window.scrollY>10);
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  // mobile menu
  const menuBtn=document.getElementById('menuBtn'),navLinks=document.getElementById('navLinks');
  if(menuBtn){
    menuBtn.addEventListener('click',()=>{const o=navLinks.classList.toggle('show');menuBtn.setAttribute('aria-expanded',o)});
  }
  // products dropdown (click for touch / mobile)
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

  // ===== CLIENT REVIEWS (home page) =====
  // Add Karandeep's real client reviews here. The reviews section appears automatically
  // once at least one review is added. Example:
  //   {q:"“Karandeep found me a better rate on my car and home.”", n:"Client Name", t:"Auto & Home Insurance"},
  const REVIEWS=[
  ];
  const qEl=document.getElementById('tQuote');
  if(qEl&&REVIEWS.length){
    document.getElementById('reviews').hidden=false;
    const dots=document.getElementById('tDots'),nEl=document.getElementById('tName'),tEl=document.getElementById('tType'),av=document.getElementById('tAv');
    let cur=0,timer;
    if(REVIEWS.length>1)REVIEWS.forEach((_,i)=>{const b=document.createElement('button');b.setAttribute('aria-label','Show review '+(i+1));b.onclick=()=>{show(i);restart()};dots.appendChild(b)});
    function show(i){cur=i;const r=REVIEWS[i];qEl.textContent=r.q;nEl.textContent=r.n;tEl.textContent=r.t;av.textContent=r.n.split(' ').map(w=>w[0]).join('').slice(0,2);[...dots.children].forEach((d,j)=>d.classList.toggle('on',j===i))}
    function restart(){clearInterval(timer);if(REVIEWS.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches)timer=setInterval(()=>show((cur+1)%REVIEWS.length),6000)}
    show(0);restart();
  }

  // Contact form → opens email app with the details filled in
  // (To receive submissions directly, connect the form to Formspree / Zoho Forms / your backend.)
  const form=document.getElementById('contactForm');
  if(form){
    const params=new URLSearchParams(location.search);
    if(params.get('type')){const s=form.querySelector('[name=type]');[...s.options].forEach(o=>{if(o.value===params.get('type'))s.value=o.value})}
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const d=Object.fromEntries(new FormData(form).entries());
      const body=`Name: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nInsurance type: ${d.type}\n\n${d.message||''}`;
      location.href=`mailto:ksing@ssinsurance.ca?subject=${encodeURIComponent('Quote request – '+d.type)}&body=${encodeURIComponent(body)}`;
      document.getElementById('formOk').classList.add('show');
    });
  }

  const yr=document.getElementById('yr');if(yr)yr.textContent=new Date().getFullYear();
})();
