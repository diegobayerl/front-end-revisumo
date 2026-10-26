import {$,esc,field,select,textarea,localInput} from './ui.js';
import {dayKey,endOf} from './domain.js';

export function createEditors({state,api,refresh,toast,navigate,onCreatedCompetition,onCreatedResource}){
 let current;
 const competitions=()=>state.concursos;
 const subjectOptions=competitionId=>state.disciplinas.filter(d=>d.concurso_id===competitionId);
 const contentOptions=disciplineId=>state.conteudos.filter(c=>c.disciplina_id===disciplineId);
 const competitionId=()=>state.contestId!=='all'?state.contestId:state.concursos[0]?.id||'';

 function open(resource,id,defaults={}){
  const row=id?(resource==='schedule'?state.itens_cronograma:state[resource])?.find(row=>row.id===id):defaults;
  if(!row)return toast('Registro não encontrado.');
  current={resource,id,defaults};
  let fields='',title='';
  if(resource==='concursos'){
   title=id?'Editar estudo':'Cadastrar estudo';
   fields=field('nome','Nome do estudo','text',row.nome||'','required maxlength="200" placeholder="Ex.: Tribunal Regional — Técnico"')+field('banca','Banca (opcional)','text',row.banca||'','maxlength="200"')+field('data_prova','Data da prova (opcional)','date',row.data_prova||'')+select('fuso_horario','Fuso dos horários disponíveis',['America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Belem','America/Noronha'].map(id=>({id,nome:id})),{value:row.fuso_horario||'America/Sao_Paulo'});
  }
  if(resource==='disciplinas'){
   title=id?'Editar disciplina':'Adicionar disciplina';
   fields=field('nome','Nome da disciplina','text',row.nome||'','required maxlength="200"')+field('peso','Peso no edital','number',row.peso||1,'required min="1" max="100" step="1"')+textarea('descricao','Descrição (opcional)',row.descricao||'',5000);
  }
  if(resource==='conteudos'){
   title=id?'Editar conteúdo':'Adicionar conteúdo';
   fields=field('titulo','Título do conteúdo','text',row.titulo||'','required maxlength="200"')+textarea('descricao','Descrição / material de estudo',row.descricao||'',5000);
   if(id)fields+=select('status','Situação',[{id:'pendente',nome:'Pendente'},{id:'em_estudo',nome:'Em estudo'},{id:'concluido',nome:'Concluído'}],{value:row.status||'pendente'});
  }
  if(resource==='anotacoes'){
   title=id?'Editar anotação':'Nova anotação';
   fields=select('concurso_id','Estudo',competitions(),{value:row.disciplina_id?state.disciplinas.find(d=>d.id===row.disciplina_id)?.concurso_id:competitionId(),optional:true,emptyLabel:'Anotação livre'})+select('disciplina_id','Disciplina',state.disciplinas,{value:row.disciplina_id||'',optional:true})+select('conteudo_id','Conteúdo',state.conteudos,{value:row.conteudo_id||'',labelKey:'titulo',optional:true})+field('titulo','Título','text',row.titulo||'','required maxlength="200"')+textarea('corpo','Sua anotação',row.corpo||'');
  }
  if(resource==='disponibilidades'){
   title=id?'Editar horário disponível':'Adicionar horário disponível';
   const days=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
   const dayFields=id?select('dia_semana','Dia da semana',days.map((nome,id)=>({id:String(id),nome})),{value:String(row.dia_semana??1)}):`<fieldset class="availability-days"><legend>Dias da semana</legend><p class="form-help">Selecione os dias que terão o mesmo horário.</p><div>${days.map((name,day)=>`<label><input type="checkbox" name="dias_semana" value="${day}">${name}</label>`).join('')}</div></fieldset>`;
   fields=dayFields+field('horario_inicio','Das','time',row.horario_inicio?.slice(0,5)||'19:00','required')+field('horario_fim','Até','time',row.horario_fim?.slice(0,5)||'21:00','required');
  }
  if(resource==='settings'){
   title='Ajustar Pomodoro';
   fields='<div class="settings-grid">'+[['foco_segundos','Foco (min)',180],['pausa_curta_segundos','Pausa curta (min)',60],['pausa_longa_segundos','Pausa longa (min)',120],['ciclos_ate_pausa_longa','Focos até pausa longa',12]].map(([key,label,max])=>field(key,label,'number',key==='ciclos_ate_pausa_longa'?state.pomodoro.settings[key]:state.pomodoro.settings[key]/60,`required min="1" max="${max}" step="1"`)).join('')+'</div>';
  }
  if(resource==='schedule'){
   title=id?'Editar atividade agendada':'Agendar atividade';
   const item=id?state.itens_cronograma.find(item=>item.id===id):row;
   const selectedCompetition=item.concurso_id||competitionId();
   let start=item.inicio_previsto?localInput(item.inicio_previsto):`${defaults.day||dayKey()}T19:00`;
   let finish=item.inicio_previsto?localInput(endOf(item)):`${defaults.day||dayKey()}T19:50`;
   fields=select('concurso_id','Estudo',competitions(),{value:selectedCompetition})+
    select('disciplina_id','Disciplina',subjectOptions(selectedCompetition),{value:item.disciplina_id||defaults.disciplina_id||''})+
    select('conteudo_id','Conteúdo',contentOptions(item.disciplina_id||defaults.disciplina_id),{value:item.conteudo_id||defaults.conteudo_id||'',labelKey:'titulo',optional:true,emptyLabel:'Estudar a disciplina sem conteúdo específico'})+
    '<div class="settings-grid">'+field('inicio_previsto','Início do estudo','datetime-local',start,'required')+field('fim_previsto','Fim do estudo','datetime-local',finish,'required')+'</div>';
  }
  $('#modal-title').textContent=title;$('#fields').innerHTML=fields;$('#form-error').textContent='';
  $('#editor').querySelector('button.primary').textContent=resource==='schedule'?'Salvar agendamento':'Salvar';
  bindDependents();$('#modal').showModal();
 }

 function bindDependents(){
  const form=$('#editor'),course=form.elements.concurso_id,subject=form.elements.disciplina_id,content=form.elements.conteudo_id;
  if(current.resource==='schedule'&&current.id)course.disabled=true;
  const replace=(element,rows,labelKey,empty)=>{if(!element)return;element.innerHTML=`<option value="">${empty}</option>`+rows.map(row=>`<option value="${row.id}">${esc(row[labelKey])}</option>`).join('');};
  if(course&&subject){
   course.onchange=()=>{replace(subject,subjectOptions(course.value),'nome','Selecione');replace(content,[],'titulo','Opcional');};
   // Mantém o valor salvo quando a anotação é editada.
   const selected=subject.value;
   replace(subject,subjectOptions(course.value),'nome',current.resource==='schedule'?'Selecione':'Opcional');subject.value=selected;
  }
  if(subject&&content){
   subject.onchange=()=>replace(content,contentOptions(subject.value),'titulo',current.resource==='schedule'?'Sem conteúdo específico':'Opcional');
   const selected=content.value;replace(content,contentOptions(subject.value),'titulo','Opcional');content.value=selected;
  }
 }

 $('#close-modal').onclick=()=>$('#modal').close();
 $('#editor').onsubmit=async event=>{
  event.preventDefault();const button=event.target.querySelector('button.primary');button.disabled=true;$('#form-error').textContent='';
  try{
   const data=Object.fromEntries(new FormData(event.target));let result;
   if(current.resource==='schedule'){
    const start=new Date(data.inicio_previsto),finish=new Date(data.fim_previsto),seconds=(finish-start)/1000;
    if(!Number.isFinite(seconds)||seconds<60||seconds>86400)throw Error('O fim deve ser posterior ao início. Use uma duração de 1 minuto a 24 horas.');
    const conflict=state.itens_cronograma.find(item=>item.id!==current.id&&item.status!=='cancelado'&&new Date(item.inicio_previsto)<finish&&start<endOf(item));
    if(conflict)throw Error('Já existe uma atividade nesse intervalo. Escolha outro horário.');
    const body={concurso_id:data.concurso_id||(current.id?state.itens_cronograma.find(item=>item.id===current.id).concurso_id:null),disciplina_id:data.disciplina_id||null,conteudo_id:data.conteudo_id||null,inicio_previsto:start.toISOString(),duracao_segundos:seconds};
    if(current.id){
     result=await api('itens_cronograma/'+current.id,'PATCH',body);
    }else result=await api('planejamento','POST',body);
   }else if(current.resource==='settings'){
    const body=Object.fromEntries(Object.entries(data).map(([key,value])=>[key,Number(value)*(key==='ciclos_ate_pausa_longa'?1:60)]));
    await api('pomodoro/preferencias','PUT',body);
   }else{
    if(current.resource==='disciplinas'){data.concurso_id=current.defaults.concurso_id||competitionId();data.peso=Number(data.peso);}
    if(current.resource==='conteudos')data.disciplina_id=current.id?state.conteudos.find(c=>c.id===current.id).disciplina_id:current.defaults.disciplina_id;
    if(current.resource==='disponibilidades'){
     data.concurso_id=competitionId();
     if(data.horario_fim<=data.horario_inicio)throw Error('O horário final deve ser posterior ao inicial.');
     if(current.id)data.dia_semana=Number(data.dia_semana);
     else{
      const days=new FormData(event.target).getAll('dias_semana').map(Number);
      if(!days.length)throw Error('Selecione pelo menos um dia da semana.');
      delete data.dias_semana;
      result=await api('disponibilidades/lote','POST',{...data,dias_semana:days});
     }
    }
    if(current.resource==='anotacoes'){
     delete data.concurso_id;data.disciplina_id=data.disciplina_id||null;data.conteudo_id=data.conteudo_id||null;
     if(!data.corpo.trim())throw Error('Escreva o texto da anotação.');
    }
    if(current.resource==='concursos')data.data_prova=data.data_prova||null;
    if(!(current.resource==='disponibilidades'&&!current.id))result=await api(current.resource+(current.id?'/'+current.id:''),current.id?'PATCH':'POST',data);
   }
   $('#modal').close();
   if(current.resource==='concursos'&&!current.id)onCreatedCompetition(result.id);
   await refresh();toast(current.resource==='schedule'?'Atividade agendada. Ela já aparece na agenda e no resumo do dia.':'Salvo com sucesso.');if(!current.id)onCreatedResource?.(current.resource,result);
  }catch(error){$('#form-error').textContent=error.message;}finally{button.disabled=false;}
 };
 return {open};
}
