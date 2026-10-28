(function(){
"use strict";
var CFG=window.BB_CONFIG||{},CATS=window.BB_CATS||[],PROD=window.BB_PRODUCTS||[];
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var money=function(n){return "$"+(Math.round(n*100)/100).toFixed(n%1?2:0)};
var byId={};PROD.forEach(function(p){byId[p.id]=p});
var catBy={};CATS.forEach(function(c){catBy[c.id]=c});

/* storage */
function ls(k,v){try{if(v===undefined){return localStorage.getItem(k)}localStorage.setItem(k,v)}catch(e){return null}}
var cart=[];try{cart=JSON.parse(ls("bb_cart")||"[]")||[]}catch(e){cart=[]}
function save(){ls("bb_cart",JSON.stringify(cart));paintCount()}
function totalQty(){return cart.reduce(function(a,l){return a+l.q},0)}

/* pricing */
function unitPrice(p,vi){if(p.variants&&p.variants.length){var v=p.variants[vi||0];return v?v.price:null}return p.price}
function priceText(p){
  if(p.variants&&p.variants.length){var m=Math.min.apply(null,p.variants.map(function(v){return v.price}));return "From "+money(m)}
  if(p.price==null)return null;return money(p.price)}
function unitText(p){return p.lb?"/ lb":(p.unit==="pc"?"each":"")}
var ICON={
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2.2 11h10.6l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
};

/* shell */
var page=document.body.getAttribute("data-page")||"";
var activeCat=document.body.getAttribute("data-cat")||"";
var PH_ICON='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
var TG_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#fff"/><path fill="#27a7e7" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';
ICON.menu='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
ICON.close='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
var MIN_DISP=3;
function phone(){return CFG.phone||"+1 (555) 000-0000"}
function phoneHref(){return "tel:"+String(CFG.phoneHref||phone()).replace(/[^+\d]/g,"")}
function tgUser(){return String(CFG.telegram||"username").replace(/^@/,"")}
function header(){
  var links='<a href="index.html"'+(page==="home"?' class="on"':'')+'>Home</a>'+CATS.map(function(c){return '<a href="shop.html?cat='+c.id+'"'+(activeCat===c.id?' class="on"':'')+'>'+esc(c.label)+'</a>'}).join("")+'<a href="cart.html"'+(page==="cart"?' class="on"':'')+'>Cart</a>';
  return '<div class="topbar"><a href="'+esc(phoneHref())+'">Contact us: <b>'+esc(phone())+'</b></a></div>'
  +'<header class="top"><div class="wrap top-in">'
  +'<button class="icon-btn" id="mb" type="button" aria-label="Open menu" aria-controls="dr" aria-expanded="false">'+ICON.menu+'</button>'
  +'<a class="brand" href="index.html" aria-label="Blinks Bakery home"><img src="img/brand/wordmark.webp" alt="Blinks Bakery"></a>'
  +'<div class="top-r"><button class="icon-btn" id="sb" type="button" aria-label="Search" aria-expanded="false" aria-controls="sf">'+ICON.search+'</button>'
  +'<a class="icon-btn cart-btn" href="cart.html" aria-label="Cart">'+ICON.cart+'<span class="cart-count" id="cc"></span></a></div></div>'
  +'<form class="searchbar" id="sf" action="shop.html" role="search" hidden><div class="wrap sf-in"><input class="input" id="sq" name="q" type="search" placeholder="Search the menu" aria-label="Search the menu" autocomplete="off"><button class="btn" type="submit">Search</button></div></form></header>'
  +'<div class="drawer-bg" id="dbg" hidden></div>'
  +'<aside class="drawer" id="dr" aria-label="Menu" hidden><div class="dr-head"><img src="img/brand/logo.webp" alt=""><button class="icon-btn" id="dc" type="button" aria-label="Close menu">'+ICON.close+'</button></div><nav class="dr-nav">'+links+'</nav><div class="dr-foot"><a href="'+esc(phoneHref())+'">'+esc(phone())+'</a></div></aside>'}
function footer(){
  return '<footer class="foot"><div class="wrap"><div class="foot-grid"><img class="foot-logo" src="img/brand/logo.webp" alt="Blinks Bakery logo"><div class="foot-contact"><h4>Contact</h4><ul>'
  +'<li><a href="'+esc(phoneHref())+'"><span class="ci ci-ph">'+PH_ICON+'</span><span>'+esc(phone())+'</span></a></li>'
  +'<li><a href="https://t.me/'+esc(tgUser())+'" target="_blank" rel="noopener"><span class="ci">'+TG_ICON+'</span><span>Telegram @'+esc(tgUser())+'</span></a></li>'
  +'</ul></div></div><small>You must be 21 or older to order. Please enjoy responsibly. &copy; '+new Date().getFullYear()+' Blinks Bakery</small></div></footer>'}
function menus(){
  var mb=$("#mb"),dr=$("#dr"),bg=$("#dbg"),sb=$("#sb"),sf=$("#sf"),sq=$("#sq");
  function openD(){dr.hidden=false;bg.hidden=false;void dr.offsetWidth;dr.classList.add("open");bg.classList.add("open");mb.setAttribute("aria-expanded","true");document.body.style.overflow="hidden";$("#dc").focus()}
  function closeD(){dr.classList.remove("open");bg.classList.remove("open");mb.setAttribute("aria-expanded","false");document.body.style.overflow="";setTimeout(function(){if(!dr.classList.contains("open")){dr.hidden=true;bg.hidden=true}},260);mb.focus()}
  mb.onclick=openD;$("#dc").onclick=closeD;bg.onclick=closeD;
  sb.onclick=function(){var o=sf.hidden;sf.hidden=!o;sb.setAttribute("aria-expanded",String(o));if(o)sq.focus()};
  document.addEventListener("keydown",function(e){if(e.key!=="Escape")return;if(dr.classList.contains("open"))closeD();else if(!sf.hidden){sf.hidden=true;sb.setAttribute("aria-expanded","false");sb.focus()}});
  $$("a",dr).forEach(function(l){l.addEventListener("click",function(){document.body.style.overflow=""})})}
function mount(){
  var h=$("#hdr"),f=$("#ftr");if(h)h.outerHTML=header();if(f)f.outerHTML=footer();
  var t=document.createElement("div");t.className="toast";t.id="toast";t.setAttribute("role","status");document.body.appendChild(t);
  paintCount();menus();ageGate()}
function paintCount(){var n=totalQty(),e=$("#cc");if(e){e.textContent=n||"";e.setAttribute("data-n",n)}}
var tt;function toast(msg){var t=$("#toast");if(!t)return;t.innerHTML='<span>'+esc(msg)+'</span><a href="cart.html">View cart</a>';t.classList.add("show");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("show")},3200);var e=$("#cc");if(e){e.classList.remove("bump");void e.offsetWidth;e.classList.add("bump")}}

/* age gate */
function ageGate(){
  if(CFG.ageGate===false||ls("bb_age")==="1")return;
  var g=document.createElement("div");g.className="gate";g.setAttribute("role","dialog");g.setAttribute("aria-modal","true");g.setAttribute("aria-label","Age check");
  g.innerHTML='<div class="gate-box"><img src="img/brand/logo.webp" alt=""><h2 class="display honey">Are you 21+?</h2><p>Blinks Bakery is for adults only. Confirm your age to come on in.</p><button class="btn" id="yes">Yes, I am 21+</button><button class="btn ghost" id="no">No</button><div class="gate-no" id="gno" hidden>Sorry, you must be 21 or older.</div></div>';
  document.body.appendChild(g);document.body.style.overflow="hidden";
  $("#yes",g).onclick=function(){ls("bb_age","1");g.remove();document.body.style.overflow=""};
  $("#no",g).onclick=function(){$("#gno",g).hidden=false};
  $("#yes",g).focus()}

/* cards */
function imgOrPh(p,alt){
  if(p.images&&p.images.length)return '<img src="'+esc(p.images[0])+'" alt="'+esc(alt||p.name)+'" loading="lazy" decoding="async">';
  return '<div class="ph"><img src="img/brand/logo.webp" alt=""><span>Photo coming soon</span></div>'}
function isNew(p){var d=Date.parse(p.created);return d&&(Date.now()-d)<1000*3600*24*21}
function card(p){
  var pt=priceText(p),b="";
  if(p.deal)b+='<span class="badge b-deal">Deal</span>';
  if(isNew(p))b+='<span class="badge b-new">New</span>';
  if(p.stock>0&&p.stock<=5)b+='<span class="badge b-low">Low stock</span>';
  var tags=(p.tag?'<span class="tag">'+esc(p.tag)+'</span>':'')+(p.cat==='disposables'?'<span class="tag lb">Min 3</span>':'')+(p.lb?'<span class="tag lb">By the lb</span>':'');
  var quick=(!p.variants&&!p.choices&&pt)?'<button class="add" data-add="'+esc(p.id)+'" aria-label="Add '+esc(p.name)+' to cart">'+ICON.plus+'</button>':'<a class="add" href="product.html?id='+encodeURIComponent(p.id)+'" aria-label="Choose options for '+esc(p.name)+'">'+ICON.right+'</a>';
  return '<article class="card"><a href="product.html?id='+encodeURIComponent(p.id)+'" class="card-img" aria-label="'+esc(p.name)+'">'+imgOrPh(p)+(b?'<div class="badges">'+b+'</div>':'')+'</a><div class="card-body"><h3><a href="product.html?id='+encodeURIComponent(p.id)+'">'+esc(p.name)+'</a></h3><div class="tags">'+(p.sub?'<span class="tag">'+esc(p.sub)+'</span>':'')+tags+'</div><div class="price-row">'+(pt?'<div class="price">'+esc(pt)+'<small>'+unitText(p)+'</small></div>':'<div class="price ask">Ask for price</div>')+quick+'</div></div></article>'}

/* cart ops */
function addLine(id,vi,choice,q){
  var key=id+"|"+(vi||0)+"|"+(choice||"");
  for(var i=0;i<cart.length;i++)if(cart[i].k===key){cart[i].q+=q;save();return}
  cart.push({k:key,id:id,v:vi||0,c:choice||"",q:q});save()}
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-add]");if(!b)return;
  var p=byId[b.getAttribute("data-add")];if(!p)return;
  addLine(p.id,0,"",1);toast("Added "+p.name+(p.cat==="disposables"?" (min 3 disposables)":""))});

/* HOME */
function home(){
  var cg=$("#cats");
  if(cg)cg.innerHTML=CATS.map(function(c){return '<a class="cat" href="shop.html?cat='+c.id+'"><img src="'+esc(c.img)+'" alt="'+esc(c.label)+' category" loading="lazy"><span class="n">'+c.count+' items</span><span class="go">Shop '+esc(c.label)+'</span></a>'}).join("");
  var fr=$("#fresh");
  if(fr){var arr=PROD.filter(function(p){return p.images&&p.images.length}).slice(0,12);fr.innerHTML=arr.map(card).join("").replace(/loading="lazy"/g,"");
    var step=function(d){fr.scrollBy({left:d*270,behavior:"smooth"})};
    $("#fl").onclick=function(){step(-1)};$("#fr").onclick=function(){step(1)}}
}

/* SHOP */
function shop(){
  var q=new URLSearchParams(location.search),cat=q.get("cat")||"all";if(cat!=="all"&&!catBy[cat])cat="all";
  var st={cat:cat,q:(q.get("q")||"").trim().toLowerCase(),sort:"new",chip:"all",n:24};
  var grid=$("#grid"),cnt=$("#cnt"),more=$("#more"),chips=$("#chips");
  function chipSet(){
    var m={flower:[["all","All"],["new","New"],["deal","Deals"],["Moonrocks","Moonrocks"]],disposables:[["all","All"],["new","New"],["Authentic","Authentic"],["Replica","Replica"]]}[st.cat]||[["all","All"]];
    chips.innerHTML=m.map(function(c){return '<button class="pill'+(st.chip===c[0]?' on':'')+'" data-chip="'+esc(c[0])+'">'+esc(c[1])+'</button>'}).join("");chips.style.display=m.length>1?"":"none"}
  function list(){
    var r=PROD.filter(function(p){
      if(st.cat!=="all"&&p.cat!==st.cat)return false;
      if(st.q&&(p.name+" "+(p.sub||"")+" "+(p.tag||"")).toLowerCase().indexOf(st.q)<0)return false;
      if(st.chip==="new")return isNew(p);if(st.chip==="deal")return p.deal;
      if(st.chip!=="all")return p.tag===st.chip;return true});
    var pr=function(p){var v=unitPrice(p,0);return v==null?1e9:v};
    if(st.sort==="low")r.sort(function(a,b){return pr(a)-pr(b)});
    else if(st.sort==="high")r.sort(function(a,b){return (pr(b)===1e9?-1:pr(b))-(pr(a)===1e9?-1:pr(a))});
    else if(st.sort==="az")r.sort(function(a,b){return a.name.localeCompare(b.name)});
    return r}
  function draw(){
    var r=list(),show=r.slice(0,st.n);
    cnt.textContent=r.length+(r.length===1?" item":" items");
    grid.innerHTML=show.length?show.map(card).join(""):'';
    $("#empty").hidden=r.length>0;grid.hidden=!r.length;
    more.hidden=r.length<=st.n}
  function head(){
    var c=catBy[st.cat];
    $("#ttl").textContent=c?c.label:"The full menu";
    $("#sub").textContent=c?c.blurb:"Everything fresh out the oven.";
    var im=$("#hi");if(c){im.src=c.img;im.alt="";im.hidden=false}else im.hidden=true;
    document.title=(c?c.label:"Shop")+" | Blinks Bakery";
    $$("#hdr a, .nav a").forEach(function(a){});
  }
  chipSet();head();draw();
  $("#s").value=q.get("q")||"";
  $("#s").addEventListener("input",function(e){st.q=e.target.value.trim().toLowerCase();st.n=24;draw()});
  $("#sort").addEventListener("change",function(e){st.sort=e.target.value;st.n=24;draw()});
  chips.addEventListener("click",function(e){var b=e.target.closest("[data-chip]");if(!b)return;st.chip=b.getAttribute("data-chip");st.n=24;chipSet();draw()});
  $("#loadmore").onclick=function(){st.n+=24;draw()};
  var tabs=$("#tabs");
  tabs.innerHTML=[["all","All"]].concat(CATS.map(function(c){return [c.id,c.label]})).map(function(c){return '<button class="pill'+(st.cat===c[0]?' on':'')+'" data-cat="'+c[0]+'">'+esc(c[1])+'</button>'}).join("");
  tabs.addEventListener("click",function(e){var b=e.target.closest("[data-cat]");if(!b)return;st.cat=b.getAttribute("data-cat");st.chip="all";st.n=24;$$("#tabs .pill").forEach(function(x){x.classList.toggle("on",x===b)});chipSet();head();draw();try{history.replaceState(null,"","shop.html"+(st.cat==="all"?"":"?cat="+st.cat))}catch(_){}})
}

/* PRODUCT */
function product(){
  var id=new URLSearchParams(location.search).get("id"),p=byId[id],root=$("#pdp");
  if(!p){root.innerHTML='<div class="empty"><h3>Product not found</h3><a class="btn" href="shop.html">Back to the menu</a></div>';return}
  document.title=p.name+" | Blinks Bakery";
  var c=catBy[p.cat];
  $("#crumbs").innerHTML='<a href="index.html">Home</a> / <a href="shop.html?cat='+p.cat+'">'+esc(c?c.label:"Shop")+'</a> / '+esc(p.name);
  var imgs=p.images||[],cur=0,vi=0,ch=(p.choices&&p.choices[0])||"",qty=p.cat==="disposables"?MIN_DISP:1;
  function paint(){
    var main=imgs.length?'<img src="'+esc(imgs[cur])+'" alt="'+esc(p.name)+' photo '+(cur+1)+'">':'<div class="ph"><img src="img/brand/logo.webp" alt=""><span>Photo coming soon</span></div>';
    var nav=imgs.length>1?'<button class="gal-nav prev" data-g="-1" aria-label="Previous photo">'+ICON.left+'</button><button class="gal-nav next" data-g="1" aria-label="Next photo">'+ICON.right+'</button>':'';
    var th=imgs.length>1?'<div class="thumbs">'+imgs.map(function(s,i){return '<button class="thumb'+(i===cur?' on':'')+'" data-t="'+i+'" aria-label="Photo '+(i+1)+'"><img src="'+esc(s)+'" alt="" loading="lazy"></button>'}).join("")+'</div>':'';
    var pr=unitPrice(p,vi);
    var vh=p.variants?'<div class="opt"><h4>Size</h4><div class="chips">'+p.variants.map(function(v,i){return '<button class="pill'+(i===vi?' on':'')+'" data-v="'+i+'">'+esc(v.label)+' &middot; '+money(v.price)+'</button>'}).join("")+'</div></div>':'';
    var chh=p.choices?'<div class="opt"><h4>'+esc(p.choiceLabel||"Choose")+'</h4><div class="chips">'+p.choices.map(function(v){return '<button class="pill'+(v===ch?' on':'')+'" data-c="'+esc(v)+'">'+esc(v)+'</button>'}).join("")+'</div></div>':'';
    var tags=(p.sub?'<span class="tag">'+esc(p.sub)+'</span>':'')+(p.tag?'<span class="tag">'+esc(p.tag)+'</span>':'')+(p.lb?'<span class="tag lb">Sold by the lb</span>':'')+(p.deal?'<span class="tag">Deal</span>':'');
    var buy=pr==null?'<a class="btn lime block" href="cart.html" data-ask="1">Ask for price</a>':'<div class="qty sm" style="display:none"></div><div class="qty"><button data-q="-1" aria-label="Less">&minus;</button><input id="qin" inputmode="numeric" value="'+qty+'" aria-label="Quantity"><button data-q="1" aria-label="More">+</button></div><button class="btn" id="addb">Add to cart</button>';
    root.innerHTML='<div><div class="gal-main">'+main+nav+'</div>'+th+'</div><div class="info"><h1 class="display honey">'+esc(p.name)+'</h1>'+(tags?'<div class="tags">'+tags+'</div>':'')+(pr==null?'<div class="big-price" style="font-size:30px;color:var(--cream);text-shadow:none">Ask for price</div>':'<div class="big-price">'+money(pr)+'<small>'+unitText(p)+'</small></div>')+vh+chh+'<div class="buy">'+buy+'</div>'+(p.cat==="disposables"?'<p class="min-note">Minimum order: '+MIN_DISP+' disposables (mix and match).</p>':'')+(p.stock>0&&p.stock<=5?'<p class="stock-note">Only '+p.stock+' left</p>':'')+'<ul class="perks"><li>'+ICON.check+'Send your order, we reply with payment details</li><li>'+ICON.check+'Payment first, then we set up delivery</li><li>'+ICON.check+'21+ only</li></ul></div>'}
  paint();
  root.addEventListener("click",function(e){
    var t=e.target.closest("button,a");if(!t)return;
    if(t.dataset.g){cur=(cur+ +t.dataset.g+imgs.length)%imgs.length;paint()}
    else if(t.dataset.t){cur=+t.dataset.t;paint()}
    else if(t.dataset.v){vi=+t.dataset.v;paint()}
    else if(t.dataset.c){ch=t.dataset.c;paint()}
    else if(t.dataset.q){var i=$("#qin");qty=Math.max(1,Math.min(99,(parseInt(i.value,10)||1)+ +t.dataset.q));i.value=qty}
    else if(t.id==="addb"){qty=Math.max(1,Math.min(99,parseInt($("#qin").value,10)||1));addLine(p.id,vi,ch,qty);toast("Added "+p.name)}
    else if(t.dataset.ask){addLine(p.id,0,"",1)}});
  var rel=PROD.filter(function(x){return x.cat===p.cat&&x.id!==p.id&&x.images&&x.images.length}).slice(0,4);
  var r=$("#related");if(r&&rel.length)r.innerHTML='<div class="sec-head"><h2 class="display honey">More from '+esc(c.label)+'</h2></div><div class="grid">'+rel.map(card).join("")+'</div>'
}

/* CART */
function lineInfo(l){var p=byId[l.id];if(!p)return null;var pr=unitPrice(p,l.v);return{p:p,pr:pr,opt:[p.variants&&p.variants[l.v]?p.variants[l.v].label:"",l.c].filter(Boolean).join(", ")}}
function cartPage(){
  var box=$("#lines"),sum=$("#sum");
  function draw(){
    cart=cart.filter(function(l){return byId[l.id]});
    if(!cart.length){box.innerHTML='<div class="empty"><h3>Your cart is empty</h3><p>Fresh batches are waiting.</p><a class="btn" href="shop.html">Browse the menu</a></div>';sum.hidden=true;return}
    sum.hidden=false;var tot=0,ask=false,dq=0;cart.forEach(function(l){if(byId[l.id].cat==="disposables")dq+=l.q});var short=dq>0&&dq<MIN_DISP;var mm=$("#minmsg");mm.hidden=!short;if(short)mm.textContent="Disposables have a minimum order of "+MIN_DISP+". Add "+(MIN_DISP-dq)+" more to continue.";$("#cp").disabled=short;$("#wa").disabled=short;
    box.innerHTML=cart.map(function(l,i){var d=lineInfo(l),line=d.pr==null?null:d.pr*l.q;if(line==null)ask=true;else tot+=line;
      var im=d.p.images&&d.p.images[0]?'<img src="'+esc(d.p.images[0])+'" alt="">':'<div class="ph" style="padding:6px"><img src="img/brand/logo.webp" alt=""></div>';
      return '<div class="line">'+im+'<div><h3><a href="product.html?id='+encodeURIComponent(d.p.id)+'">'+esc(d.p.name)+'</a></h3><div class="opt-txt">'+esc(d.opt||(d.p.sub||""))+'</div><div class="ctrl"><div class="qty sm"><button data-i="'+i+'" data-d="-1" aria-label="Less">&minus;</button><input value="'+l.q+'" readonly aria-label="Quantity"><button data-i="'+i+'" data-d="1" aria-label="More">+</button></div><button class="link-btn" data-rm="'+i+'">Remove</button></div></div><div class="tot">'+(line==null?"Ask":money(line))+'</div></div>'}).join("");
    $("#sub").textContent=money(tot);$("#askn").hidden=!ask;$("#tot").textContent=money(tot)+(ask?" + ask":"");
    var wa=$("#wa");wa.hidden=!CFG.whatsapp}
  function order(){
    var n=$("#nm").value.trim(),ph=$("#ph").value.trim(),lo=$("#lo").value.trim(),nt=$("#nt").value.trim(),tot=0,out=["Blinks Bakery order",""];
    cart.forEach(function(l){var d=lineInfo(l);if(!d)return;var line=d.pr==null?null:d.pr*l.q;if(line!=null)tot+=line;
      out.push(l.q+" x "+d.p.name+(d.opt?" ("+d.opt+")":"")+" - "+(line==null?"ask price":money(line)))});
    out.push("","Total: "+money(tot));
    if(n)out.push("Name: "+n);if(ph)out.push("Phone: "+ph);if(lo)out.push("Location: "+lo);if(nt)out.push("Notes: "+nt);
    return out.join("\n")}
  box.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
    if(b.dataset.d){var l=cart[+b.dataset.i];l.q=Math.max(1,Math.min(99,l.q+ +b.dataset.d));save();draw()}
    else if(b.dataset.rm){cart.splice(+b.dataset.rm,1);save();draw()}});
  $("#wa").onclick=function(){window.open("https://wa.me/"+CFG.whatsapp+"?text="+encodeURIComponent(order()),"_blank","noopener")};
  $("#cp").onclick=function(){var t=order(),m=$("#cm");
    var done=function(){m.textContent="Order copied. Paste it in a message to us.";m.hidden=false};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){fallback(t,m)})}else fallback(t,m)};
  function fallback(t,m){var a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");m.textContent="Order copied. Paste it in a message to us."}catch(e){m.textContent="Could not copy. Select the text and copy it."}document.body.removeChild(a);m.hidden=false}
  draw()}

mount();
if(page==="home")home();else if(page==="shop")shop();else if(page==="product")product();else if(page==="cart")cartPage();
})();
