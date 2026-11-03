const express=require('express'),http=require('http'),{Server}=require('socket.io');
const SU=['oros','copas','espadas','bastos'],ORD=[12,11,10,1,7,6,5,4,3,2];
const ov=r=>10-ORD.indexOf(r),is4B=c=>c.s=='bastos'&&c.r==4,cs=c=>c.s[0]+c.r;
function createGame(){
 let G={ph:'lobby',n:4,horns:1,tk:[null,null,null,null],sn:['Bot 1','Bot 2','Bot 3','Bot 4'],pts:[0,0],hw:[0,0],dealer:3};
 const clients=new Map();let hostTok=null;
 const tm=i=>i%2,isH=i=>!!G.tk[i],seatsOf=t=>[...Array(G.n).keys()].filter(i=>tm(i)==t);
 const inFam=c=>c.s==G.trump||is4B(c)||(c.s=='oros'&&c.r==11);
function str(c,lead){
 if(is4B(c))return 1000;
 if(c.s==G.trump&&c.r==3)return 900;
 if(c.s=='oros'&&c.r==11)return 800;
 if(c.s==G.trump&&c.r==2)return 700;
 if(c.s==G.trump)return 500+ov(c.r);
 if(lead&&c.s==lead)return 100+ov(c.r);
 return 0}
function allowed(h,t){if(!inFam(t[0].c))return h;return h.some(c=>inFam(c)&&!is4B(c))?h.filter(inFam):h}
const strong=i=>G.hands[i].filter(c=>str(c,null)>=500).length;
const avgS=t=>{const s=seatsOf(t);return s.reduce((a,i)=>a+strong(i),0)/s.length};

 function snapFor(tok){const g=G,o={ph:g.ph,n:g.n,horns:g.horns,sn:g.sn,tk:g.tk.map(x=>!!x),me:g.tk.indexOf(tok),host:tok===hostTok};
  if(g.ph=='play')Object.assign(o,{pts:g.pts,hw:g.hw,dealer:g.dealer,hid:g.hid,tc:cs(g.tc),v:g.value,tr:g.tr,tb:g.table.map(x=>[x.p,cs(x.c)]),turn:g.turn,ver:g.ver,msg:g.msg,busy:g.busy,sent:g.sent,
   h:g.hands.map((h,i)=>h.map(c=>g.tk[i]===tok?cs(c):'x')),dlg:g.dlg});
  return o}
 function rs(){clients.forEach((tok,s)=>s.emit('st',snapFor(tok)))}
 function handle(a){const g=G,i=g.tk.indexOf(a.tok);
 if(a.t=='hi'){if(i<0&&g.ph=='lobby'){const f=g.tk.findIndex(x=>!x);if(f>=0){g.tk[f]=a.tok;g.sn[f]=String(a.name||'Jugador').slice(0,12)}}return rs()}
 if(i<0)return;
 if(g.ph=='lobby'){if(a.t=='sit'&&!g.tk[a.seat]&&a.seat<g.n){g.tk[a.seat]=g.tk[i];g.sn[a.seat]=g.sn[i];g.tk[i]=null;g.sn[i]='Bot '+(i+1);rs()}return}
 if(a.t=='ans'&&g.dlg&&g.fn){if(g.dlg.k!='end'&&tm(i)!=g.dlg.t)return;const f=g.fn;g.fn=null;g.dlg=null;return f(a.v)}
 if(g.dlg||g.busy||g.turn!=i)return;
 if(a.t=='play'){const c=g.hands[i].find(c=>cs(c)==a.id);if(c)play(i,c)}
 if(a.t=='send'&&!g.sent)send(i)}
function cfgSet(k,v){const g=G;if(k=='horns')g.horns=v;else{const hu=[];g.tk.forEach((t,i)=>t&&hu.push([t,g.sn[i]]));g.n=v;g.tk=[];g.sn=[];
 for(let i=0;i<v;i++){const h=hu[i];g.tk.push(h?h[0]:null);g.sn.push(h?h[1]:'Bot '+(i+1))}}rs()}
/* ---------- juego (lo lleva el anfitrión) ---------- */
function newHand(){const g=G,rk=g.n==4?[1,2,3,4,7,10,11,12]:[1,2,3,4,5,6,7,10,11,12];let d=[];g.ph='play';
 SU.forEach(s=>rk.forEach(r=>d.push({s,r})));
 for(let i=d.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[d[i],d[j]]=[d[j],d[i]]}
 g.hands=[];for(let i=0;i<g.n;i++)g.hands.push(d.splice(0,5));
 g.tc=d[0];g.trump=g.tc.s;g.hands.forEach(h=>h.sort((a,b)=>SU.indexOf(a.s)-SU.indexOf(b.s)||ov(b.r)-ov(a.r)));
 g.value=3;g.tr=[0,0];g.table=[];g.turn=(g.dealer+1)%g.n;g.busy=true;g.sent=false;g.dlg=null;g.fn=null;g.hid=(g.hid||0)+1;
 const a=g.pts[0]==24,b=g.pts[1]==24;g.ver=a&&b?2:a?0:b?1:null;
 g.msg=`Reparte ${g.sn[g.dealer]}…`;rs();
 setTimeout(()=>{if(G!==g)return;g.msg=g.ver===2?'24–24: mano a muerte súbita':'';if(g.ver===0||g.ver===1)verAsk(g.ver);else next()},1900)}
function verSkip(t){const g=G;g.pts[1-t]++;g.dealer=(g.dealer+1)%g.n;g.dlg={k:'end',x:'ver',t};g.fn=()=>newHand();rs()}
function verAsk(t){const g=G;
 if(seatsOf(t).some(isH)){g.dlg={k:'ver',t};g.fn=v=>v?(g.msg='',next()):verSkip(t);rs()}
 else if(avgS(t)>=1.6||Math.random()<.2){g.msg='El otro equipo juega al VER';next()}else verSkip(t)}
function next(){const g=G;if(g.table.length==g.n){g.busy=true;rs();return setTimeout(()=>{if(G===g)resolve()},900)}
 g.sent=false;if(isH(g.turn)){g.busy=false;rs();return}g.busy=true;rs();setTimeout(()=>{if(G===g)bot()},850)}
function sendP(s){return [0,0,.02,.07,.14,.22][Math.min(strong(s),5)]}
function bot(){const g=G,s=g.turn;if(!g.sent&&g.value<=9&&Math.random()<sendP(s))return send(s);play(s,botPick(s))}
function botPick(s){const g=G,h=g.hands[s],t=g.table;
 if(!t.length){const o=[...h].sort((a,b)=>str(b,b.s)-str(a,a.s));return Math.random()<.65?o[0]:o[o.length-1]}
 const ls=inFam(t[0].c)?null:t[0].c.s;let b=t[0];t.forEach(x=>{if(str(x.c,ls)>str(b.c,ls))b=x});
 const bs=str(b.c,ls),pw=b.p%2==s%2,last=t.length==g.n-1,al=allowed(h,t);
 const wins=al.filter(c=>str(c,ls)>bs).sort((a,b)=>str(a,ls)-str(b,ls));
 const low=[...al].sort((a,b)=>str(a,ls)-str(b,ls)||ov(a.r)-ov(b.r));
 if(pw&&(last||bs>=500))return low[0];
 return wins.length?wins[0]:low[0]}
function play(s,c){const g=G;g.busy=true;g.msg='';const h=g.hands[s];
 const ren=g.table.length>0&&!allowed(h,g.table).includes(c);
 h.splice(h.indexOf(c),1);g.table.push({p:s,c});g.turn=(s+1)%g.n;rs();
 if(ren)return setTimeout(()=>{if(G===g)end(1-tm(s),g.value,{r:'ren',p:s})},1200);
 setTimeout(()=>{if(G===g)next()},650)}
function resolve(){const g=G,t=g.table,ls=inFam(t[0].c)?null:t[0].c.s;let b=t[0];
 t.forEach(x=>{if(str(x.c,ls)>str(b.c,ls))b=x});
 const w=b.p,wt=tm(w);g.tr[wt]++;g.msg=`${g.sn[w]} gana la baza`;rs();
 setTimeout(()=>{if(G!==g)return;g.msg='';g.table=[];if(g.tr[wt]>=3)return end(wt,g.value,null);g.turn=w;next()},1400)}
function send(s){const g=G,t=tm(s),o=1-t,nv=g.value+3;g.sent=true;g.busy=true;
 const ok=()=>{g.value=nv;g.msg=`Aceptan: la mano vale ${nv}`;if(isH(s)){g.busy=false;rs()}else{rs();setTimeout(()=>{if(G===g)bot()},800)}};
 const no=()=>end(t,g.value,{r:'rej',p:s});
 if(seatsOf(o).some(isH)){g.msg='';g.dlg={k:'send',t:o,s,nv};g.fn=v=>v?ok():no();rs()}
 else{g.msg=`${g.sn[s]} ¡envía!`;rs();setTimeout(()=>{if(G!==g)return;(avgS(o)>=1.5||Math.random()<.2)?ok():no()},1000)}}
function end(w,v,why){const g=G;g.busy=true;let horn=false,done=false;
 if(g.ver===2||g.ver===w){g.hw[w]++;g.pts=[0,0];horn=true}
 else{g.pts[w]+=v;if(g.pts[w]>24){g.hw[w]++;g.pts=[0,0];horn=true}}
 done=horn&&g.hw[w]>=g.horns;g.dealer=(g.dealer+1)%g.n;g.msg='';
 g.dlg={k:'end',w,v,why,horn,done};g.fn=()=>{if(done){g.ph='lobby';g.dlg=null;g.pts=[0,0];g.hw=[0,0];g.dealer=g.n-1;rs()}else newHand()};rs()}


 function add(s,tok,name){if(!hostTok)hostTok=tok;clients.set(s,tok);handle({t:'hi',tok,name});rs()}
 function cfg(tok,a){if(tok!==hostTok||G.ph!='lobby')return;const v=+a.v;if(a.k=='n'&&(v==4||v==6))cfgSet('n',v);if(a.k=='horns'&&(v==1||v==2))cfgSet('horns',v)}
 function start(tok){if(tok===hostTok&&G.ph=='lobby'){G.pts=[0,0];G.hw=[0,0];G.dealer=G.n-1;newHand()}}
 function drop(s,tok){clients.delete(s);setTimeout(()=>{if([...clients.values()].includes(tok))return;
  const i=G.tk.indexOf(tok);if(i>=0){G.tk[i]=null;G.sn[i]=G.ph=='lobby'?'Bot '+(i+1):G.sn[i]+' (bot)'}
  if(tok===hostTok){const o=[...clients.values()][0];if(o)hostTok=o}
  if(i>=0&&G.ph=='play'&&G.turn==i&&!G.busy&&!G.dlg)next();else rs()},20000)}
 return {add,drop,handle,cfg,start,size:()=>clients.size};
}
const app=express();app.use(express.static(__dirname+'/public'));
const srv=http.createServer(app),io=new Server(srv),rooms=new Map();
io.on('connection',s=>{let room=null,tok=null;
 s.on('join',d=>{d=d||{};const code=String(d.code||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12);
  if(!code||!d.tok)return s.emit('err','Código de sala no válido');
  tok=String(d.tok).slice(0,16);let r=rooms.get(code);if(!r){r=createGame();rooms.set(code,r)}
  room=r;r.add(s,tok,String(d.name||'Jugador').slice(0,12))});
 s.on('act',a=>{if(room&&a)room.handle({t:a.t,id:a.id,v:a.v,seat:a.seat,tok})});
 s.on('cfg',a=>room&&a&&room.cfg(tok,a));
 s.on('start',()=>room&&room.start(tok));
 s.on('disconnect',()=>{if(!room)return;const r=room;r.drop(s,tok);setTimeout(()=>{if(!r.size())for(const [k,v] of rooms)if(v===r)rooms.delete(k)},600000)})});
srv.listen(process.env.PORT||3000,()=>console.log('PABLO en el puerto '+(process.env.PORT||3000)));
