export function dayKey(value=new Date()) {
  const date=new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function parseDay(value) {
  const [year,month,day]=value.split('-').map(Number);
  return new Date(year,month-1,day,12);
}
export function shiftDay(value,amount) {
  const date=parseDay(value);date.setDate(date.getDate()+amount);return dayKey(date);
}
export function weekDays(value) {
  const date=parseDay(value),first=shiftDay(value,-((date.getDay()+6)%7));
  return Array.from({length:7},(_,index)=>shiftDay(first,index));
}
export function monthDays(value) {
  const date=parseDay(value);date.setDate(1);
  const first=weekDays(dayKey(date))[0];
  return Array.from({length:42},(_,index)=>shiftDay(first,index));
}
export function endOf(item) { return new Date(new Date(item.inicio_previsto).getTime()+item.duracao_segundos*1000); }
export function scheduledForDay(items,day) {
  return items.filter(item=>dayKey(item.inicio_previsto)===day).sort((a,b)=>a.inicio_previsto.localeCompare(b.inicio_previsto)||a.id.localeCompare(b.id));
}
export function dailySummary(items,day) {
  const all=scheduledForDay(items,day),scheduled=all.filter(item=>item.status!=='cancelado');
  return {items:all,pending:scheduled.filter(item=>item.status==='pendente'),completed:scheduled.filter(item=>item.status==='concluido'),seconds:scheduled.reduce((sum,item)=>sum+item.duracao_segundos,0)};
}
export function sessionElapsed(session,now=Date.now()) {
  const current=session.status==='em_andamento'?Math.max(0,Math.floor((now-new Date(session.retomada_em||session.iniciada_em).getTime())/1000)):0;
  return Math.min(session.duracao_planejada_segundos,session.tempo_acumulado_segundos+current);
}
// Divide estudos que atravessam meia-noite e separa eventos sobrepostos em faixas.
export function daySegments(items,day) {
  const date=parseDay(day);date.setHours(0,0,0,0);
  const start=date.getTime(),next=new Date(date);next.setDate(next.getDate()+1);
  const finish=next.getTime();
  const minute=value=>value<=start?0:value>=finish?1440:new Date(value).getHours()*60+new Date(value).getMinutes()+new Date(value).getSeconds()/60;
  const segments=items.map(item=>{
    const from=Math.max(start,new Date(item.inicio_previsto).getTime()),to=Math.min(finish,endOf(item).getTime());
    return from<to?{item,startMinute:minute(from),endMinute:minute(to)}:null;
  }).filter(Boolean).sort((a,b)=>a.startMinute-b.startMinute||a.endMinute-b.endMinute);
  let group=[],maximum=-1;
  const result=[];
  function flush(){
    const lanes=[];
    for(const event of group){
      let lane=lanes.findIndex(end=>end<=event.startMinute);
      if(lane<0)lane=lanes.length;
      lanes[lane]=event.endMinute;event.lane=lane;
    }
    result.push(...group.map(event=>({...event,lanes:lanes.length})));group=[];
  }
  for(const event of segments){
    if(group.length&&event.startMinute>=maximum){flush();maximum=-1;}
    group.push(event);maximum=Math.max(maximum,event.endMinute);
  }
  flush();return result;
}
