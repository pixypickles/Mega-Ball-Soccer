/* Big Ball Soccer prototype - v0.1
 * A: kick / volley, B: jump, C: hold to charge, D: unused
 */
const SOCCER_DURATION=90,SOCCER_GOALS=3;
const SOCCER_TOP=170,SOCCER_BOTTOM=880,SOCCER_GOAL_TOP=410,SOCCER_GOAL_BOTTOM=640;
let soccerBall=null,soccerPlayers=[],soccerKeepers=[],soccerScore=[0,0],soccerTime=0,soccerFinished=false;
let soccerMessage='',soccerMessageLife=0,soccerEffects=[];

function soccerReset(afterGoal=false){
 soccerBall={x:500,y:525,z:0,vx:afterGoal?0:80*(Math.random()<.5?-1:1),vy:0,vz:0,r:63,spin:0,squash:0,lastTeam:-1};
 soccerPlayers=[
  soccerMakePlayer(selectedTypes[0]||'knight',0,265,525),
  soccerMakePlayer('knight',1,735,525)
 ];
 soccerKeepers=[soccerMakeKeeper(0,78,525),soccerMakeKeeper(1,922,525)];
 soccerEffects.length=0;
}
function soccerMakePlayer(type,team,x,y){return {type,team,x,y,z:0,vx:0,vy:0,vz:0,r:27,aimX:team? -1:1,aimY:0,charge:0,kickCd:0,kickTime:0,jumpCd:0,stun:0,down:0,invuln:0,state:'idle'}}
function soccerMakeKeeper(team,x,y){return {team,x,y,homeX:x,homeY:y,z:0,vx:0,vy:0,vz:0,r:31,down:0,dive:0,invuln:0,state:'ready'}}
function setupSoccerBattle(){
 resetCombatInput();heroes=[new Hero(selectedTypes[0]||'knight',220,525)];heroIndex=0;boss={hp:1,maxHp:1,dead:false,x:500,y:525,r:1};
 shots.length=particles.length=walls.length=slashes.length=minions.length=lasers.length=0;
 soccerScore=[0,0];soccerTime=0;soccerFinished=false;soccerMessage='大玉サッカー　KICK OFF!';soccerMessageLife=1.5;soccerReset();soccerSetButtonLabels();
}
function soccerSetButtonLabels(){
 const a=document.getElementById('a'),b=document.getElementById('b'),c=document.getElementById('c'),d=document.getElementById('d');
 if(a)a.innerHTML='<b>A</b>キック';if(b)b.innerHTML='<b>B</b>ジャンプ';if(c)c.innerHTML='<b>C</b>力溜め';if(d)d.innerHTML='<b>D</b>未使用';
 const help=document.querySelector('.help');if(help)help.textContent='移動：WASD / 矢印　A：キック　B：ジャンプ　C：長押しで力溜め';
}
function soccerRestoreButtonLabels(){
 const a=document.getElementById('a'),b=document.getElementById('b'),c=document.getElementById('c'),d=document.getElementById('d');
 if(a)a.innerHTML='<b>A</b>攻撃';if(b)b.innerHTML='<b>B</b>特殊';if(c)c.innerHTML='<b>C</b>補助';if(d)d.innerHTML='<b>D</b>交代';
}
function soccerInputVector(){
 let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;
 let y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joy.y;
 const l=Math.hypot(x,y);return l>1?{x:x/l,y:y/l}:{x,y};
}
function soccerChargeTier(v){return v>=1?4:v>=.75?3:v>=.5?2:v>=.25?1:0}
function soccerKickPower(p,just=false){const tier=soccerChargeTier(p.charge);return (390+tier*95)*(just?1.32:1)}
function soccerTryKick(p){
 if(p.kickCd>0||p.down>0||p.stun>0)return;
 p.kickCd=.28;p.kickTime=.18;p.state='kick';
 const dx=soccerBall.x-p.x,dy=soccerBall.y-p.y,dz=soccerBall.z-(p.z+22),dist=Math.hypot(dx,dy);
 if(dist>p.r+soccerBall.r+42||Math.abs(dz)>105)return;
 const incoming=soccerBall.vx*(p.x-soccerBall.x)+soccerBall.vy*(p.y-soccerBall.y)>0;
 const closeWindow=dist<p.r+soccerBall.r+20&&Math.hypot(soccerBall.vx,soccerBall.vy)>220;
 const just=incoming&&closeWindow;
 let dir=norm(p.aimX|| (p.team?-1:1),p.aimY||0);
 if(just){const back=norm(-soccerBall.vx,-soccerBall.vy);dir=norm(dir.x*.55+back.x*.45,dir.y*.55+back.y*.45)}
 const power=soccerKickPower(p,just);
 soccerBall.vx=dir.x*power;soccerBall.vy=dir.y*power;soccerBall.vz=Math.max(145,105+soccerChargeTier(p.charge)*35+(p.z>0?115:0));soccerBall.lastTeam=p.team;soccerBall.squash=.16;
 const use=[0,.12,.22,.34,.48][soccerChargeTier(p.charge)];p.charge=Math.max(0,p.charge-use);
 soccerEffects.push({kind:just?'just':'kick',x:soccerBall.x,y:soccerBall.y,life:.35,max:.35,team:p.team});
 burst(soccerBall.x,soccerBall.y,p.team?'#ff9fac':'#9fe4ff',just?18:10,just?240:160);
 if(just){soccerMessage='JUST KICK!';soccerMessageLife=.55}
}
function soccerJump(p){if(p.jumpCd>0||p.down>0||p.stun>0||p.z>1)return;p.vz=650;p.jumpCd=.38;p.state='jump'}
function soccerMovePlayer(p,dt,input){
 p.kickCd=Math.max(0,p.kickCd-dt);p.kickTime=Math.max(0,p.kickTime-dt);p.jumpCd=Math.max(0,p.jumpCd-dt);p.stun=Math.max(0,p.stun-dt);p.down=Math.max(0,p.down-dt);p.invuln=Math.max(0,p.invuln-dt);
 if(p.down>0){p.state='down';p.vx*=Math.pow(.9,dt*60);p.vy*=Math.pow(.9,dt*60)}
 else if(p.stun>0){p.state='stumble';p.vx*=Math.pow(.88,dt*60);p.vy*=Math.pow(.88,dt*60)}
 else{
  const charging=p.team===0?keys.has('KeyL'):p.chargeIntent;
  if(charging)p.charge=Math.min(1,p.charge+dt*.28);
  const speed=charging?175:285;
  p.vx+=(input.x*speed-p.vx)*Math.min(1,dt*11);p.vy+=(input.y*speed-p.vy)*Math.min(1,dt*11);
  if(Math.hypot(input.x,input.y)>.12){p.aimX=input.x;p.aimY=input.y;p.state=p.z>0?'jump':'run'}else p.state=p.z>0?'jump':'idle';
 }
 p.x+=p.vx*dt;p.y+=p.vy*dt;p.vz-=1450*dt;p.z+=p.vz*dt;if(p.z<0){p.z=0;p.vz=0}
 p.x=clamp(p.x,105,895);p.y=clamp(p.y,SOCCER_TOP+20,SOCCER_BOTTOM-20);
}
function soccerCpuInput(p){
 const bx=soccerBall.x+soccerBall.vx*.18,by=soccerBall.y+soccerBall.vy*.18;
 let tx=bx,ty=by;if(soccerBall.x>720){tx=soccerBall.x-75;ty=soccerBall.y}
 const n=norm(tx-p.x,ty-p.y);p.chargeIntent=Math.hypot(soccerBall.x-p.x,soccerBall.y-p.y)>260&&p.charge<.82;
 const dist=Math.hypot(soccerBall.x-p.x,soccerBall.y-p.y);
 if(dist<p.r+soccerBall.r+36&&p.kickCd<=0)soccerTryKick(p);
 if(soccerBall.z>70&&dist<145&&p.z===0&&p.jumpCd<=0)soccerJump(p);
 return n;
}
function soccerHitPerson(p,isKeeper=false){
 if(p.invuln>0)return;
 const dx=p.x-soccerBall.x,dy=p.y-soccerBall.y,dist=Math.hypot(dx,dy),min=p.r+soccerBall.r;
 if(dist>=min||soccerBall.z>105+p.z)return;
 const n=dist>.01?{x:dx/dist,y:dy/dist}:{x:p.team?-1:1,y:0};const speed=Math.hypot(soccerBall.vx,soccerBall.vy);
 const overlap=min-dist;p.x+=n.x*overlap*.55;p.y+=n.y*overlap*.55;
 if(speed>45){
  if(speed<180&&!isKeeper){p.stun=Math.max(p.stun,.24);p.vx=n.x*105;p.vy=n.y*105;p.state='stumble'}
  else{p.down=Math.max(p.down,isKeeper?1.15:Math.min(1.25,.45+speed/600));p.invuln=p.down+.35;p.vx=n.x*Math.min(430,speed*.72);p.vy=n.y*Math.min(430,speed*.72);p.vz=isKeeper?260:180;p.state='down'}
  soccerBall.vx*=isKeeper?.48:.70;soccerBall.vy*=isKeeper?.48:.70;soccerBall.vz=Math.max(soccerBall.vz,190+Math.min(210,speed*.28));soccerBall.squash=.18;
  burst(p.x,p.y,isKeeper?'#fff0a8':'#ffffff',10,170);
 }
}
function soccerUpdateKeeper(k,dt){
 k.down=Math.max(0,k.down-dt);k.dive=Math.max(0,k.dive-dt);k.invuln=Math.max(0,k.invuln-dt);
 if(k.down>0){k.state='down';k.x+=k.vx*dt;k.y+=k.vy*dt;k.vx*=Math.pow(.9,dt*60);k.vy*=Math.pow(.9,dt*60)}
 else{
  const towardGoal=k.team===0?soccerBall.vx<0:soccerBall.vx>0;
  const close=k.team===0?soccerBall.x<310:soccerBall.x>690;
  const targetY=clamp(soccerBall.y,SOCCER_GOAL_TOP+25,SOCCER_GOAL_BOTTOM-25);
  const react=towardGoal&&close?targetY:k.homeY;
  const dy=react-k.y;k.vy=clamp(dy*7,-430,430);k.y+=k.vy*dt;k.x+=(k.homeX-k.x)*Math.min(1,dt*5);
  if(towardGoal&&close&&Math.abs(dy)>35){k.dive=.22;k.state='dive'}else k.state='ready';
 }
 k.y=clamp(k.y,SOCCER_GOAL_TOP+18,SOCCER_GOAL_BOTTOM-18);k.z=Math.max(0,k.z+k.vz*dt);k.vz-=1400*dt;if(k.z<=0){k.z=0;k.vz=0}
 soccerHitPerson(k,true);
}
function soccerResolvePlayerSeparation(){
 for(let i=0;i<soccerPlayers.length;i++)for(let j=i+1;j<soccerPlayers.length;j++){const a=soccerPlayers[i],b=soccerPlayers[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),m=a.r+b.r;if(d<m&&d>.01){const nx=dx/d,ny=dy/d,o=(m-d)*.5;a.x-=nx*o;a.y-=ny*o;b.x+=nx*o;b.y+=ny*o}}
}
function soccerUpdateBall(dt){
 soccerBall.vz-=900*dt;soccerBall.x+=soccerBall.vx*dt;soccerBall.y+=soccerBall.vy*dt;soccerBall.z+=soccerBall.vz*dt;
 soccerBall.vx*=Math.pow(.995,dt*60);soccerBall.vy*=Math.pow(.995,dt*60);soccerBall.spin+=Math.hypot(soccerBall.vx,soccerBall.vy)*dt*.009;soccerBall.squash=Math.max(0,soccerBall.squash-dt);
 if(soccerBall.z<0){soccerBall.z=0;if(Math.abs(soccerBall.vz)>75){soccerBall.vz=-soccerBall.vz*.67;soccerBall.squash=.12}else soccerBall.vz=0;soccerBall.vx*=.985;soccerBall.vy*=.985}
 if(soccerBall.y-soccerBall.r<SOCCER_TOP){soccerBall.y=SOCCER_TOP+soccerBall.r;soccerBall.vy=Math.abs(soccerBall.vy)*.78;soccerBall.squash=.1}
 if(soccerBall.y+soccerBall.r>SOCCER_BOTTOM){soccerBall.y=SOCCER_BOTTOM-soccerBall.r;soccerBall.vy=-Math.abs(soccerBall.vy)*.78;soccerBall.squash=.1}
 const goalMouth=soccerBall.y>SOCCER_GOAL_TOP&&soccerBall.y<SOCCER_GOAL_BOTTOM;
 if(!goalMouth){if(soccerBall.x-soccerBall.r<55){soccerBall.x=55+soccerBall.r;soccerBall.vx=Math.abs(soccerBall.vx)*.74}else if(soccerBall.x+soccerBall.r>945){soccerBall.x=945-soccerBall.r;soccerBall.vx=-Math.abs(soccerBall.vx)*.74}}
}
function updateSoccerGame(dt){
 if(soccerFinished)return;if(soccerMessageLife>0)soccerMessageLife-=dt;soccerTime+=dt;
 const human=soccerPlayers[0],cpu=soccerPlayers[1],input=soccerInputVector();
 if(pressed.has('KeyJ')){soccerTryKick(human);pressed.delete('KeyJ')}if(pressed.has('KeyK')){soccerJump(human);pressed.delete('KeyK')}
 soccerMovePlayer(human,dt,input);soccerMovePlayer(cpu,dt,soccerCpuInput(cpu));soccerResolvePlayerSeparation();soccerUpdateBall(dt);
 for(const p of soccerPlayers)soccerHitPerson(p,false);for(const k of soccerKeepers)soccerUpdateKeeper(k,dt);
 for(let i=soccerEffects.length-1;i>=0;i--){soccerEffects[i].life-=dt;if(soccerEffects[i].life<=0)soccerEffects.splice(i,1)}
 if(soccerBall.x<-soccerBall.r&&soccerBall.y>SOCCER_GOAL_TOP&&soccerBall.y<SOCCER_GOAL_BOTTOM){soccerScore[1]++;soccerGoal()}
 else if(soccerBall.x>1000+soccerBall.r&&soccerBall.y>SOCCER_GOAL_TOP&&soccerBall.y<SOCCER_GOAL_BOTTOM){soccerScore[0]++;soccerGoal()}
 if(soccerTime>=SOCCER_DURATION)finishSoccer();updateUI();released.clear();
}
function soccerGoal(){soccerMessage='GOAL!';soccerMessageLife=1.25;if(Math.max(...soccerScore)>=SOCCER_GOALS){finishSoccer();return}soccerReset(true)}
function finishSoccer(){if(soccerFinished)return;soccerFinished=true;running=false;soccerRestoreButtonLabels();const win=soccerScore[0]>soccerScore[1],draw=soccerScore[0]===soccerScore[1];notice(draw?'DRAW':win?'大玉サッカー 勝利！':'大玉サッカー 敗北…',draw?'#fff':'#ffe77a',2600);setTimeout(()=>ui.start.style.display='grid',1800)}
function soccerFieldPath(){ctx.beginPath();ctx.rect(55,SOCCER_TOP,890,SOCCER_BOTTOM-SOCCER_TOP)}
function soccerDrawActor(p,keeper=false){
 const lift=p.z||0,down=p.down>0;ctx.save();ctx.globalAlpha=p.invuln>0&&Math.floor(p.invuln*12)%2?.55:1;
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(p.x,p.y+22,keeper?31:27,10,0,0,Math.PI*2);ctx.fill();
 ctx.translate(p.x,p.y-lift*.36);if(down)ctx.rotate(p.team?-.75:.75);else if(p.state==='dive')ctx.rotate(p.vy<0?-.65:.65);
 const im=keeper?null:sprites['hero_'+p.type];if(!keeper&&drawSprite(im,0,0,72,82,p.team===1)){}else{ctx.fillStyle=keeper?'#f2ca55':p.team?'#db5d70':'#4d9fdf';ctx.beginPath();ctx.arc(0,0,keeper?30:27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(keeper?'GK':'P',0,5)}
 if(!keeper){ctx.strokeStyle=p.team?'#ff8093':'#68c5ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,p.r+4,0,Math.PI*2);ctx.stroke()}
 ctx.restore();
}
function drawSoccerGame(){
 ctx.save();ctx.fillStyle='#17242b';ctx.fillRect(0,100,1000,900);ctx.fillStyle='#527d45';ctx.fillRect(55,SOCCER_TOP,890,SOCCER_BOTTOM-SOCCER_TOP);
 for(let y=SOCCER_TOP;y<SOCCER_BOTTOM;y+=90){ctx.fillStyle=((y-SOCCER_TOP)/90)%2<1?'rgba(255,255,255,.035)':'rgba(0,0,0,.025)';ctx.fillRect(55,y,890,90)}
 ctx.strokeStyle='#eef5e8';ctx.lineWidth=4;ctx.strokeRect(55,SOCCER_TOP,890,SOCCER_BOTTOM-SOCCER_TOP);ctx.beginPath();ctx.moveTo(500,SOCCER_TOP);ctx.lineTo(500,SOCCER_BOTTOM);ctx.stroke();ctx.beginPath();ctx.arc(500,525,105,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='rgba(87,160,220,.35)';ctx.fillRect(0,SOCCER_GOAL_TOP,55,SOCCER_GOAL_BOTTOM-SOCCER_GOAL_TOP);ctx.fillStyle='rgba(220,80,100,.35)';ctx.fillRect(945,SOCCER_GOAL_TOP,55,SOCCER_GOAL_BOTTOM-SOCCER_GOAL_TOP);
 ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.strokeRect(0,SOCCER_GOAL_TOP,55,SOCCER_GOAL_BOTTOM-SOCCER_GOAL_TOP);ctx.strokeRect(945,SOCCER_GOAL_TOP,55,SOCCER_GOAL_BOTTOM-SOCCER_GOAL_TOP);
 for(const e of soccerEffects){const t=Math.max(0,e.life/e.max);ctx.save();ctx.globalAlpha=t;ctx.strokeStyle=e.kind==='just'?'#fff3a5':e.team?'#ff9aaa':'#9ee8ff';ctx.lineWidth=e.kind==='just'?12:7;ctx.beginPath();ctx.arc(e.x,e.y,75+(1-t)*70,0,Math.PI*2);ctx.stroke();ctx.restore()}
 soccerKeepers.forEach(k=>soccerDrawActor(k,true));soccerPlayers.forEach(p=>soccerDrawActor(p,false));
 const b=soccerBall,lift=b.z*.42,sq=b.squash>0?Math.sin(b.squash/.18*Math.PI):0;ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(b.x,b.y+28,55*(1-lift/700),18*(1-lift/700),0,0,Math.PI*2);ctx.fill();ctx.translate(b.x,b.y-lift);ctx.rotate(b.spin);ctx.scale(1+sq*.13,1-sq*.13);ctx.fillStyle='#f4f0dd';ctx.strokeStyle='#d6d0b8';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#8fb1a8';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.moveTo(-58,0);ctx.lineTo(58,0);ctx.moveTo(0,-58);ctx.lineTo(0,58);ctx.stroke();ctx.restore();
 const p=soccerPlayers[0],tier=soccerChargeTier(p.charge);ctx.fillStyle='rgba(5,10,15,.72)';ctx.fillRect(275,915,450,48);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(275,915,450,48);ctx.fillStyle=tier===4?'#ffe46a':'#74d6ff';ctx.fillRect(281,921,438*p.charge,36);ctx.fillStyle='#fff';ctx.font='bold 19px sans-serif';ctx.textAlign='center';ctx.fillText(`POWER ${Math.round(p.charge*100)}%　Lv.${tier}`,500,947);
 ctx.font='bold 34px sans-serif';ctx.fillText(`${soccerScore[0]}  -  ${soccerScore[1]}`,500,120);ctx.font='bold 19px sans-serif';ctx.fillText(`残り ${Math.max(0,SOCCER_DURATION-soccerTime).toFixed(1)}秒　3点先取`,500,150);
 if(soccerMessageLife>0){ctx.fillStyle='#fff3a8';ctx.font='bold 42px sans-serif';ctx.fillText(soccerMessage,500,275)}
 ctx.fillStyle='#eef6ff';ctx.font='bold 16px sans-serif';ctx.fillText('A キック／タイミングよく返球　B 超ジャンプ　C 長押しで力を蓄積（離しても維持）',500,990);ctx.restore();
}
