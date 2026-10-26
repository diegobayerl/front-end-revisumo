import {$,esc,dateLabel,timeLabel,stamp,dateOnly,duration,stopwatch,badge,phaseLabel,empty,field,select,rowActions} from './lib/ui.js';
import {dayKey,parseDay,shiftDay,weekDays,endOf,scheduledForDay,dailySummary,sessionElapsed} from './lib/domain.js';
import {calendarView} from './lib/calendar.js';
import {createEditors} from './lib/editors.js';

const scheduleFlows={};
const state={page:'dashboard',contestId:'',cadSubjectId:'',studyId:'',studySubjectId:'',studyTopicId:'',day:dayKey(),previewDay:shiftDay(dayKey(),1),agendaAnchor:dayKey(),agendaMode:'mes',filters:{agenda:'',notes:'',history:''},historyPage:0,phase:'foco',timerContext:{},drafts:{},concursos:[],disciplinas:[],conteudos:[],cronogramas:[],itens_cronograma:[],anotacoes:[],disponibilidades:[],pomodoro:{settings:{},sessions:[]}};
let editalPreview=null,editalBusy=false,importingStudy=false,schedulePreview=null;
let registering=false,clockOffset=0,loaded=false,clockNotice='';
const names=['concursos','disciplinas','conteudos','cronogramas','itens_cronograma','anotacoes','disponibilidades'];
const competition=id=>state.concursos.find(row=>row.id===id);
const subject=id=>state.disciplinas.find(row=>row.id===id);
const topic=id=>state.conteudos.find(row=>row.id===id);
const itemById=id=>state.itens_cronograma.find(row=>row.id===id);
const subjectName=id=>subject(id)?.nome||'Foco livre';
const topicName=id=>topic(id)?.titulo||'';
const active=()=>state.pomodoro.sessions.find(row=>['em_andamento','pausada'].includes(row.status));
const now=()=>Date.now()+clockOffset;
const subjects=()=>state.disciplinas.filter(row=>state.contestId==='all'||row.concurso_id===state.contestId);
const topics=()=>state.conteudos.filter(row=>subjects().some(d=>d.id===row.disciplina_id));
const items=()=>state.itens_cronograma.filter(row=>state.contestId==='all'||row.concurso_id===state.contestId);
const isInContest=session=>!session.disciplina_id||state.contestId==='all'||subject(session.disciplina_id)?.concurso_id===state.contestId;
const sessions=()=>state.pomodoro.sessions.filter(isInContest);
const selectedCompetition=()=>competition(state.contestId);
const add=(resource,label,extra='')=>`<button class="primary" data-add="${resource}" ${extra}>+ ${label}</button>`;
const scheduleButton=(day=state.day,label='Agendar atividade')=>`<button class="primary" data-new-block="${day}">+ ${label}</button>`;
const section=(title,body,action='',className='')=>`<section class="panel ${className}"><div class="panel-heading"><h2>${title}</h2>${action}</div>${body}</section>`;
function firstRun(){return `<section class="first-study"><div class="first-study-mark" aria-hidden="true">▤</div><span class="eyebrow">SEU PRIMEIRO PASSO</span><h2>Sem estudo cadastrado</h2><p>Envie seu edital para a IA organizar as matérias e os assuntos. Depois, adicione o que quiser estudar e planeje suas atividades.</p><button class="primary" data-page="cadastro">Criar primeiro estudo com IA</button><span class="first-study-help">Tudo começa com um estudo. O restante você organiza no seu ritmo.</span></section>`;}

function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>$('#toast').style.display='none',5000);}
async function api(path,method='GET',body){
 const response=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'include'});
 const data=await response.json();
 if(!response.ok){
  if(response.status===401){$('#workspace').hidden=true;$('#auth').hidden=false;loaded=false;}
  throw Error(data.error||'Não foi possível concluir a operação.');
 }
 return data;
}
async function allRows(path){
 const rows=[];
 for(let offset=0;;offset+=200){const batch=await api(path+'?offset='+offset);rows.push(...batch);if(batch.length<200)break;}
 return [...new Map(rows.map(row=>[row.id,row])).values()];
}
async function refresh(){
 const values=await Promise.all([...names.map(name=>allRows(name)),api('pomodoro'),allRows('pomodoro/historico')]);
 names.forEach((name,index)=>state[name]=values[index]);
 state.pomodoro=values[names.length];state.pomodoro.sessions=values[names.length+1];
 clockOffset=new Date(state.pomodoro.serverTime).getTime()-Date.now();
 if(state.contestId!=='all'&&!competition(state.contestId)){
  let saved;try{saved=localStorage.getItem('ritmo-contest');}catch{}
  state.contestId=saved==='all'?'all':competition(saved)?saved:state.concursos[0]?.id||'';
 }
 loaded=true;readRoute();render();
}
function setContest(id){
 state.contestId=id;state.cadSubjectId='';state.filters={agenda:'',notes:'',history:''};state.historyPage=0;state.timerContext={};
 try{localStorage.setItem('ritmo-contest',id);}catch{}
 render();
}
function navigate(page){const hash='#'+page;if(location.hash===hash){readRoute();render();}else location.hash=hash;window.scrollTo({top:0,behavior:'auto'});}
function readRoute(){
 const [page,id]=location.hash.slice(1).split('/');
 if(['dashboard','cadastro','cronograma','pomodoro','anotacoes','agenda','configuracoes'].includes(page))state.page=page;
 else if(page==='estudo'){
  const changed=state.page!=='estudo'||state.studyId!==id;
  state.page='estudo';state.studyId=id;const item=itemById(id);
  state.studySubjectId=item?.disciplina_id||'';if(changed)state.studyTopicId=item?.conteudo_id||'';
  if(item)state.contestId=item.concurso_id;
 }else if(page==='disciplina'){
  const changed=state.page!=='estudo'||state.studySubjectId!==id||!!state.studyId;
  state.page='estudo';state.studyId='';state.studySubjectId=id;if(changed)state.studyTopicId='';
  if(subject(id))state.contestId=subject(id).concurso_id;
 }else state.page='dashboard';
 if(['cadastro','cronograma'].includes(state.page)&&(!state.contestId||state.contestId==='all'))state.contestId=state.concursos[0]?.id||'';
}
window.addEventListener('hashchange',()=>{if(loaded){readRoute();render();}});

function studyLink(item){return `<button class="study-title" data-study="${item.id}">${esc(subjectName(item.disciplina_id))}<span>${item.tipo==='revisao'?`↻ Revisão ${item.revisao_numero} · `:''}${esc(topicName(item.conteudo_id)||'Estudo da disciplina')}</span></button>`;}
function studyRow(item){
 const session=active(),running=session?.item_cronograma_id===item.id?session:null;
 const actions=running?`<button class="primary" data-continue-study="${item.id}">Continuar estudo</button><button class="text-button danger" data-cancel-execution="${running.id}">Cancelar</button>`:`${badge(item.status)}<div class="study-actions">${item.status==='pendente'?`<button class="focus-button" data-start-block="${item.id}" title="Iniciar Pomodoro deste estudo">▷ Focar</button>`:''}${item.status==='concluido'?'':`<button class="secondary" data-edit-block="${item.id}" aria-label="Editar atividade de ${esc(subjectName(item.disciplina_id))}">Editar</button><button class="text-button danger" data-delete="itens_cronograma" data-id="${item.id}">Excluir</button>`}</div>`;
 return `<article class="study-row status-${item.status}"><span class="study-time">${timeLabel(item.inicio_previsto)}<small>${timeLabel(endOf(item))}</small></span><div class="study-description">${studyLink(item)}<small>${esc(competition(item.concurso_id)?.nome||'')} · ${duration(item.duracao_segundos)}</small></div>${running?`<div class="study-actions study-running-actions">${actions}</div>`:actions}</article>`;
}

function timerCard(compact=false,context={}){
 const session=active(),settings=state.pomodoro.settings;
 const chosen=session||{...state.timerContext,...context};
 const phase=session?.fase||state.phase;
 const chosenSubject=chosen.disciplina_id||'',chosenTopic=chosen.conteudo_id||'';
 const topicRows=chosenSubject?state.conteudos.filter(row=>row.disciplina_id===chosenSubject):topics();
 return `<section class="focus-panel ${compact?'compact-focus':''}"><div class="focus-panel-heading"><span class="eyebrow">POMODORO</span><button class="icon-button" data-settings title="Ajustar durações" aria-label="Ajustar durações do Pomodoro">⚙</button></div><div class="phase-tabs">${['foco','pausa_curta','pausa_longa'].map(value=>`<button data-phase="${value}" class="${phase===value?'active':''}" ${session?'disabled':''}>${phaseLabel[value]}</button>`).join('')}</div><div class="clock-ring" id="clock-ring"><div><strong id="timer">${stopwatch(settings[phase+'_segundos']||1500)}</strong><span id="timer-caption">Um passo de cada vez.</span></div></div>${clockNotice?`<p class="clock-notice">${esc(clockNotice)}</p>`:''}${session?`<div class="focus-context"><strong>${esc(subjectName(session.disciplina_id))}</strong><span>${esc(topicName(session.conteudo_id)||session.titulo)}</span>${session.item_cronograma_id&&!['estudo','dashboard'].includes(state.page)?'<button class="text-button" data-study="'+session.item_cronograma_id+'">Abrir este estudo →</button>':''}</div>`:state.page==='dashboard'?'':`<div class="focus-selection">${select('timer_subject','Disciplina',subjects(),{value:chosenSubject,optional:true,emptyLabel:'Foco livre'})}${select('timer_topic','Conteúdo',topicRows,{value:chosenTopic,optional:true,labelKey:'titulo',emptyLabel:'Sem conteúdo específico'})}</div>`}${(state.page==='estudo'||state.page==='dashboard'&&session)?'':`<div class="clock-actions">${session?`<button class="primary" data-timer-action="${session.status==='pausada'?'retomar':'pausar'}">${session.status==='pausada'?'▷ Retomar':'Ⅱ Pausar'}</button><button class="secondary" data-timer-action="concluir" id="finish-cycle">Concluir ciclo</button><button class="text-button danger" data-timer-action="cancelar">Cancelar</button>`:'<button class="primary" data-timer-action="iniciar">▷ Iniciar '+phaseLabel[phase].toLowerCase()+'</button>'}</div>`}<p class="focus-footnote">${settings.foco_segundos/60} min de foco · ${settings.pausa_curta_segundos/60} min de descanso</p></section>`;
}

function historyTable(rows,{compact=false}={}){
 let list=rows;
 if(!compact){const pages=Math.max(1,Math.ceil(rows.length/20));state.historyPage=Math.min(state.historyPage,pages-1);list=rows.slice(state.historyPage*20,state.historyPage*20+20);}
 if(!list.length)return empty('Seu histórico começa com o primeiro foco.','Inicie uma sessão em qualquer disciplina. O tempo e o conteúdo estudado aparecerão aqui.');
 if(compact)return `<div class="history-mini">${list.map(session=>`<div><span><strong>${esc(subjectName(session.disciplina_id))}</strong><small>${esc(topicName(session.conteudo_id)||phaseLabel[session.fase])}</small><small>${dateLabel(session.iniciada_em)} · ${timeLabel(session.iniciada_em)}</small></span><span><b>${stopwatch(sessionElapsed(session,now()))}</b>${badge(session.status)}</span></div>`).join('')}</div>`;
 return `<div class="table-scroll"><table class="history-table"><thead><tr><th>Quando</th><th>Disciplina / conteúdo</th>${compact?'':'<th>Estudo</th>'}<th>Tempo</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${list.map(session=>`<tr><td>${dateLabel(session.iniciada_em)}<small>${timeLabel(session.iniciada_em)}</small></td><td><strong>${esc(subjectName(session.disciplina_id))}</strong><small>${esc(topicName(session.conteudo_id)||phaseLabel[session.fase])}</small></td>${compact?'':'<td>'+esc(competition(subject(session.disciplina_id)?.concurso_id)?.nome||'Foco livre')+'</td>'}<td>${stopwatch(sessionElapsed(session,now()))}<small>${phaseLabel[session.fase]}</small></td><td>${badge(session.status)}</td><td><button class="text-button danger" data-delete="pomodoro" data-id="${session.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div>${!compact&&rows.length>20?`<div class="pagination"><span>${state.historyPage*20+1}–${Math.min(rows.length,(state.historyPage+1)*20)} de ${rows.length} sessões</span><button class="secondary" data-history-page="-1" ${state.historyPage===0?'disabled':''}>Anterior</button><button class="secondary" data-history-page="1" ${(state.historyPage+1)*20>=rows.length?'disabled':''}>Próxima</button></div>`:''}`;
}

function dashboard(){
 const summary=dailySummary(items(),state.day);
 const focused=sessions().filter(row=>row.fase==='foco'&&dayKey(row.iniciada_em)===state.day).reduce((sum,row)=>sum+sessionElapsed(row,now()),0);
 const overdue=items().filter(row=>row.status==='pendente'&&dayKey(row.inicio_previsto)<state.day).length;
 const preview=dailySummary(items(),state.previewDay);
 const previewLabel=state.previewDay===shiftDay(dayKey(),1)?'Amanhã':state.previewDay===dayKey()?'Hoje':dateOnly(state.previewDay);
 const previewHeading=`<span class="dashboard-preview-navigation"><button class="icon-button" data-preview-step="-1" aria-label="Dia anterior da prévia">‹‹</button><span>${previewLabel}</span><button class="icon-button" data-preview-step="1" aria-label="Próximo dia da prévia">››</button></span>`;
 const upcomingPanel=section(previewHeading,`<div class="dashboard-day-scroll">${preview.items.filter(item=>item.status!=='cancelado').map(studyRow).join('')||empty('Nenhuma atividade agendada para este dia.','Use as setas para consultar outros dias ou agende uma atividade.')}</div>`,'','dashboard-preview');
 const dayTitle=state.day===dayKey()?'Seu roteiro de hoje':new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(parseDay(state.day));
 const header=`<div class="day-navigation"><button class="icon-button" data-day-step="-1" aria-label="Dia anterior">‹</button><input type="date" id="dashboard-day" aria-label="Dia do resumo" value="${state.day}"><button class="icon-button" data-day-step="1" aria-label="Próximo dia">›</button><button class="secondary" data-day-today>Hoje</button></div>`;
 return `<div class="dashboard-toolbar"><div><span class="eyebrow">${esc(selectedCompetition()?.nome||'SEUS ESTUDOS')}</span><h2>${esc(dayTitle)}</h2></div>${header}</div><div class="daily-metrics"><div><span class="metric-icon">◫</span><strong>${summary.pending.length}</strong><span>Atividades pendentes</span></div><div><span class="metric-icon">✓</span><strong>${summary.completed.length}</strong><span>Atividades concluídas</span></div><div><span class="metric-icon">◷</span><strong>${duration(summary.seconds)}</strong><span>Tempo planejado</span></div><div><span class="metric-icon">▷</span><strong id="today-focus">${duration(focused)}</strong><span>Foco nas sessões do dia</span></div></div><div class="dashboard-layout"><div>${section(state.day===dayKey()?'Hoje':dateOnly(state.day),`<div class="dashboard-day-scroll">${summary.pending.map(studyRow).join('')||empty(summary.completed.length?'Atividades do dia concluídas.':'Nenhuma atividade agendada para este dia.',summary.completed.length?'Você pode revisar uma matéria ou planejar o próximo dia.':'Confira outro dia na seção abaixo ou agende uma atividade para hoje.')}</div>`,'' )}${upcomingPanel}${summary.completed.length?section('Concluídos no dia',summary.completed.map(studyRow).join(''),`<span class="subtle">${summary.completed.length} estudos</span>`):''}${overdue?`<button class="overdue-notice" data-overdue>◷ Você tem ${overdue} atividade(s) pendente(s) de dias anteriores. Abrir cronograma →</button>`:''}${section('Últimas sessões',historyTable(sessions().slice(0,4),{compact:true}),'<button class="text-button" data-page="pomodoro">Ver histórico →</button>')}</div><div>${timerCard(true)}<div class="quiet-tip"><span>✦</span><p>Seu roteiro começa no cronograma.<br>O foco acontece um estudo de cada vez.</p></div></div></div>`;
}

function legalReferences(content){
 const refs=content?.referencias_legais||[];
 return refs.length?`<div class="legal-references">${refs.map(ref=>{
  let safe=false;try{const url=new URL(ref.url);safe=url.protocol==='https:'&&url.hostname==='www.planalto.gov.br';}catch{}
  return `<div class="legal-reference"><strong>${esc(ref.lei)}</strong>${ref.artigos?.length?`<span>Artigos para estudar: ${esc(ref.artigos.join(', '))}</span>`:''}<small>${ref.origem==='edital'?'Referência identificada pela IA no edital':'Sugestão de estudo da IA'}${ref.verificado?' · Números dos artigos conferidos na fonte oficial':' · Confira os dispositivos na fonte oficial'}</small>${safe?`<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">Consultar lei no Planalto ↗</a>`:''}</div>`;
 }).join('')}</div>`:'';
}

function registration(){
 const course=selectedCompetition(),selected=state.disciplinas.find(row=>row.id===state.cadSubjectId&&row.concurso_id===state.contestId);
 if(!state.concursos.length||importingStudy||editalPreview)return `${state.concursos.length?'<button class="back-link" data-close-import>← Meus estudos</button>':''}${editalImportCard()}`;
 const left=`<div class="registration-list"><div class="registration-list-heading"><h2>Meus estudos</h2><button class="icon-button" data-open-import aria-label="Criar estudo com IA">+</button></div>${state.concursos.map(row=>`<button class="competition-entry ${row.id===state.contestId?'active':''}" data-choose-contest="${row.id}"><span>${esc(row.nome)}</span><small>${esc(row.banca||'Banca a definir')} · ${dateOnly(row.data_prova)}</small><i>${state.disciplinas.filter(d=>d.concurso_id===row.id).length} disciplinas</i></button>`).join('')||'<p class="list-empty">Seus estudos aparecerão aqui.</p>'}<button class="secondary" data-open-import>+ Novo estudo com IA</button></div>`;
 let right;
 if(!course)right=empty('Sem estudo cadastrado','Cadastre seu primeiro estudo. Depois, adicione as disciplinas e os conteúdos que você quer aprender.','<button class="primary" data-page="cadastro">Criar estudo com IA</button>');
 else if(selected){
  const rows=state.conteudos.filter(row=>row.disciplina_id===selected.id);
  right=`<button class="back-link" data-back-subjects>← Disciplinas de ${esc(course.nome)}</button><div class="resource-heading"><div><span class="eyebrow">CONTEÚDOS DA DISCIPLINA</span><h2>${esc(selected.nome)}</h2><p>Peso ${selected.peso} no edital · ${rows.length} conteúdos</p></div>${add('conteudos','Conteúdo',`data-subject="${selected.id}"`)}</div>${selected.descricao?`<p class="description-block">${esc(selected.descricao)}</p>`:''}<div class="topic-list">${rows.map(row=>`<article class="topic-row"><button class="topic-status ${row.status==='concluido'?'checked':''}" data-topic-status="${row.id}" data-status="${row.status==='concluido'?'pendente':'concluido'}" aria-label="${row.status==='concluido'?'Reabrir':'Concluir'} ${esc(row.titulo)}">${row.status==='concluido'?'✓':'○'}</button><div><strong>${esc(row.titulo)}</strong><p>${esc(row.descricao||'Sem descrição')}</p>${legalReferences(row)}</div>${badge(row.status)}${rowActions('conteudos',row.id)}</article>`).join('')||empty('O que cai nesta disciplina?','Use o botão + Conteúdo acima para adicionar os tópicos do edital. Eles ficarão disponíveis no agendamento e no estudo.')}</div>`;
 }else{
  const rows=subjects();
  right=`<div class="resource-heading"><div><span class="eyebrow">${esc(course.banca||'SEU OBJETIVO')}</span><h2>${esc(course.nome)}</h2><p>Prova: ${dateOnly(course.data_prova)} · ${rows.length} disciplinas</p></div>${rowActions('concursos',course.id)}</div><div class="subsection-heading"><h3>Disciplinas</h3><div class="study-actions">${state.itens_cronograma.some(item=>item.concurso_id===course.id)?`<button class="secondary" data-replan-study="${course.id}">Replanejar pendências com IA</button>`:''}${add('disciplinas','Disciplina')}</div></div><div class="subject-cards">${rows.map(row=>{
   const content=state.conteudos.filter(c=>c.disciplina_id===row.id),done=content.filter(c=>c.status==='concluido').length;
   return `<article class="subject-card"><button class="subject-card-open" data-manage-subject="${row.id}"><span class="subject-mark">▦</span><h3>${esc(row.nome)}</h3><span class="subject-subtitle">${content.length} conteúdos · ${done} concluídos</span><span class="subject-weight">Peso ${row.peso}</span><span class="subject-open-label">Abrir conteúdos →</span></button>${rowActions('disciplinas',row.id)}</article>`;
  }).join('')||empty('Adicione as disciplinas do edital.','Use o botão + Disciplina acima para começar. Depois, clique na disciplina para cadastrar seus conteúdos.')}</div>`;
 }
 return `<div class="registration-workspace">${left}<section class="registration-detail">${right}</section></div>`;
}

function editalImportCard(){
 return `<section class="ai-import-card ${editalPreview?'has-preview':''}" aria-labelledby="ai-import-title"><div class="ai-import-copy"><span class="eyebrow">INTELIGÊNCIA ARTIFICIAL</span><h2 id="ai-import-title">Cadastre seu estudo pelo edital</h2><p>Envie um PDF para extrair as disciplinas e os conteúdos. Revise a prévia antes de confirmar o cadastro.</p><p class="form-help">O arquivo será enviado ao Google Gemini para análise. O cronograma pode ser montado depois, com seus horários disponíveis.</p></div><form id="edital-upload" class="ai-import-upload">${field('cargo','Cargo ou objetivo (opcional)','text','','maxlength="300" placeholder="Ex.: Técnico administrativo"')}<label class="edital-file-picker"><input type="file" name="arquivo" accept="application/pdf,.pdf" required ${editalBusy?'disabled':''}><span class="edital-file-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg></span><strong id="edital-file-name">Selecione seu edital</strong><span id="edital-file-info">Arquivo PDF · até 30 MB</span><span class="edital-file-action">Escolher arquivo</span></label><button class="primary" ${editalBusy?'disabled':''}>${editalBusy?'Analisando edital…':'Analisar com IA'}</button><p id="edital-status" class="form-help" role="status" aria-live="polite">${editalBusy?'Analisando o edital. Isso pode levar alguns minutos; aguarde a prévia.':''}</p><p id="edital-error" class="inline-error" role="alert"></p></form>${editalPreview?`<div class="edital-preview"><div class="edital-result-heading"><span class="edital-result-badge">✓ Análise concluída</span><h3>Confira as matérias e os assuntos encontrados</h3><p>${editalPreview.disciplinas.length} matérias · ${editalPreview.disciplinas.reduce((sum,subject)=>sum+subject.conteudos.length,0)} assuntos</p><p class="form-help">O estudo ainda não foi salvo. Confirme abaixo para cadastrar. Depois, você poderá adicionar suas próprias matérias e conteúdos.</p></div>${editalPreview.uso?`<p class="form-help">${editalPreview.reutilizado?'Análise recente reaproveitada, sem nova consulta à IA.':'Consumo desta análise:'} ${Number(editalPreview.uso.entrada).toLocaleString('pt-BR')} tokens de entrada · ${Number(editalPreview.uso.saida).toLocaleString('pt-BR')} de saída.</p>`:''}${field('edital_nome','Nome do estudo','text',editalPreview.nome,'required maxlength="200"')}<p>${esc(editalPreview.banca||'Banca não identificada')} · Prova: ${dateOnly(editalPreview.data_prova)}</p>${editalPreview.observacoes?`<p class="form-help">${esc(editalPreview.observacoes)}</p>`:''}<div class="edital-subjects">${editalPreview.disciplinas.map((subject,index)=>`<details ${index===0?'open':''}><summary>${esc(subject.nome)} · ${subject.conteudos.length} conteúdos · Peso ${subject.peso}</summary><ul>${subject.conteudos.map((content,contentIndex)=>`<li>${esc(content.titulo)}${content.descricao?`<p>${esc(content.descricao)}</p>`:''}${legalReferences({referencias_legais:editalPreview.referencias?.[index]?.[contentIndex]||[]})}</li>`).join('')}</ul></details>`).join('')}</div><div class="detail-actions"><button class="primary" id="edital-confirm">Confirmar cadastro</button><button class="secondary" id="edital-discard">Descartar prévia</button></div><p id="edital-confirm-error" class="inline-error" role="alert"></p></div>`:''}</section>`;
}

function schedule(){
 const course=selectedCompetition();
 if(!course)return empty('Sem estudo cadastrado','Cadastre um estudo para começar a organizar o estudo.','<button class="primary" data-page="cadastro">Criar estudo com IA</button>');
 const list=items().filter(item=>(!state.filters.scheduleSubject||item.disciplina_id===state.filters.scheduleSubject)&&(!state.filters.scheduleStatus||item.status===state.filters.scheduleStatus)).sort((a,b)=>a.inicio_previsto.localeCompare(b.inicio_previsto));
 const groups=new Map();for(const item of list){const day=dayKey(item.inicio_previsto);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(item);}
 const availability=state.disponibilidades.filter(row=>row.concurso_id===course.id).sort((a,b)=>a.dia_semana-b.dia_semana||a.horario_inicio.localeCompare(b.horario_inicio));
 const preview=schedulePreview?.concurso_id===course.id?schedulePreview:null;
 const flow=scheduleFlows[course.id]??=( {step:items().length?4:1,draft:{inicio:dayKey(),fim:course.data_prova&&course.data_prova>dayKey()?shiftDay(course.data_prova,-1):shiftDay(dayKey(),90),minutos:50}} );
 if(!availability.length&&flow.step!==4)flow.step=1;
 if(flow.step===3&&!preview)flow.step=2;
 const availabilityPanel=`<section class="availability-panel schedule-step"><div class="panel-heading"><div><span class="eyebrow">PASSO 1</span><h2>Quando você pode estudar?</h2></div><span class="subtle">${availability.length} horários semanais</span></div><p class="form-help">Cadastre os dias da semana e os horários disponíveis. A IA usará essas janelas para montar seu cronograma.</p>${availability.map(row=>`<div class="availability-row"><strong>${['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][row.dia_semana]}</strong><span>${row.horario_inicio.slice(0,5)}–${row.horario_fim.slice(0,5)}</span>${rowActions('disponibilidades',row.id)}</div>`).join('')}${add('disponibilidades',availability.length?'Adicionar horário':'Cadastrar dias e horários')}<div class="wizard-footer"><span class="form-help">${availability.length?'Disponibilidade salva. Vamos organizar os assuntos?':'Adicione pelo menos um horário para continuar.'}</span><button class="primary" data-schedule-step="2" ${availability.length?'':'disabled'}>Continuar →</button></div></section>`;
 const planner=section('Organize com IA',`<span class="eyebrow">PASSO 2</span><p class="form-help">${availability.length?'Planeje até a véspera da prova. A IA prioriza as matérias e o sistema distribui o edital com revisões de 1, 7 e 30 dias, depois recorrentes, respeitando sua disponibilidade e 10 minutos entre blocos.':'Primeiro cadastre sua disponibilidade no passo acima para liberar o planejamento.'}</p>${flow.reorganizar?'<p class="replan-notice">Replanejamento: as pendências atrasadas e futuras entrarão na nova distribuição junto com os conteúdos adicionados. Concluídas e execuções em andamento serão preservadas. A mudança só será aplicada após confirmar a prévia.</p>':''}<form id="ai-schedule-form"><fieldset class="ai-schedule-fields" ${availability.length?'':'disabled'}><div class="settings-grid">${field('inicio','Começar em','date',flow.draft.inicio,'required')}${field('fim','Véspera da prova ou prazo final','date',flow.draft.fim,'required')}${field('minutos','Minutos por atividade','number',flow.draft.minutos,'required min="25" max="120" step="1"')}</div><div class="wizard-footer"><button class="secondary" type="button" data-schedule-step="1">← Voltar</button><button class="primary" type="submit">Gerar prévia com IA →</button></div></fieldset><p class="form-help" id="ai-schedule-status" role="status"></p><p class="inline-error" id="ai-schedule-error" role="alert"></p></form>`);
 const previewPanel=preview?section('Revise antes de adicionar à agenda',`<p class="form-help">${preview.reorganizar?`Replanejamento: ${preview.substituir?.length||0} pendências serão substituídas, incluindo ${preview.atrasadas||0} atrasadas. `:''}${preview.atividades.length} atividades propostas até ${dateOnly(preview.periodo?.fim||'')}. ${preview.resumo?`${preview.resumo.assuntos_novos} blocos de estudo · ${preview.resumo.revisoes} revisões · ${preview.resumo.horas_planejadas} horas.`:''} ${preview.restantes?`Atenção: ${preview.restantes} assuntos não couberam nos horários disponíveis. Aumente a disponibilidade para cobrir todo o edital.`:'Todos os assuntos têm estudo inicial previsto ou já registrado.'} ${preview.resumo?.revisoes_pendentes?`${preview.resumo.revisoes_pendentes} revisões devidas não couberam no período.`:''} Nenhuma atividade foi salva ainda.</p><div class="schedule-preview-list">${preview.atividades.map(row=>`<div class="schedule-preview-row"><span>${dateOnly(dayKey(row.inicio_previsto))}<small>${timeLabel(row.inicio_previsto)}–${timeLabel(endOf(row))}</small></span><div><strong>${esc(row.disciplina)}</strong><p>${row.tipo==='revisao'?`<span class="review-label">↻ Revisão ${row.revisao_numero}</span> `:''}${esc(row.titulo)}</p></div></div>`).join('')}</div><div class="detail-actions"><button class="primary" id="confirm-ai-schedule">${preview.reorganizar?'Confirmar replanejamento':'Adicionar à agenda'}</button><button class="secondary" id="discard-ai-schedule">← Ajustar planejamento</button></div><p class="inline-error" id="confirm-ai-schedule-error" role="alert"></p>`):'';
 const scheduled=`<div class="filter-bar">${filterSelect('scheduleSubject','Disciplina',subjects(),state.filters.scheduleSubject)}<label>Situação<select data-filter="scheduleStatus"><option value="">Todas</option>${['pendente','concluido','cancelado'].map(status=>`<option value="${status}" ${state.filters.scheduleStatus===status?'selected':''}>${status==='pendente'?'Pendentes':status==='concluido'?'Concluídos':'Cancelados'}</option>`).join('')}</select></label>${availability.length?scheduleButton(dayKey()):''}<button class="text-button" data-page="agenda">Ver na agenda →</button></div>${groups.size?[...groups].map(([day,rows])=>section(new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(parseDay(day)),rows.map(studyRow).join(''),availability.length?`<button class="text-button" data-new-block="${day}">+ Neste dia</button>`:'')).join(''):section('Atividades agendadas',empty('Seu cronograma aparecerá aqui.',availability.length?'Peça à IA para montar o cronograma e revise a prévia antes de adicionar à agenda.':'Comece cadastrando os dias e horários em que você pode estudar no passo 1.'))}`;
 const labels=[['Disponibilidade','Dias e horários'],['Planejamento','Preferências e IA'],['Revisão','Confira a prévia'],['Agenda','Pronto para estudar']];
 const navigation=`<nav class="schedule-flow" aria-label="Etapas do cronograma"><ol>${labels.map(([label,description],index)=>{
  const step=index+1,allowed=step===1||(step===2&&availability.length)||(step===3&&preview)||(step===4&&items().length);
  return `<li class="${flow.step===step?'current':flow.step>step?'complete':''}"><button data-schedule-step="${step}" ${allowed?'':'disabled'} ${flow.step===step?'aria-current="step"':''}><span class="schedule-flow-number">${flow.step>step?'✓':step}</span><span><strong>${label}</strong><small>${description}</small></span></button></li>`;
 }).join('')}</ol></nav>`;
 return `<div class="schedule-intro"><div><h2>Monte seu cronograma, passo a passo</h2><p>Defina sua disponibilidade, organize os assuntos e confirme sua agenda.</p></div></div>${navigation}<div class="schedule-flow-content">${flow.step===1?availabilityPanel:flow.step===2?planner:flow.step===3?previewPanel:`<div class="wizard-finished"><span>✓ Cronograma na agenda</span><div class="study-actions"><button class="secondary" data-schedule-step="1">Planejar mais atividades</button><button class="primary" data-replan-study="${course.id}">Replanejar pendências com IA</button></div></div>${scheduled}`}</div>`;
}

function filterSelect(key,label,rows,value){return `<label>${label}<select data-filter="${key}"><option value="">Todas as disciplinas</option>${rows.map(row=>`<option value="${row.id}" ${row.id===value?'selected':''}>${esc(row.nome)}</option>`).join('')}</select></label>`;}
function notesView(){
 const rows=state.anotacoes.filter(row=>!row.disciplina_id||state.contestId==='all'||subject(row.disciplina_id)?.concurso_id===state.contestId);
 const selected=state.filters.notes,discipline=subject(selected);
 if(selected&&(discipline||selected==='free')){
  const notes=rows.filter(note=>selected==='free'?!note.disciplina_id:note.disciplina_id===selected).sort((a,b)=>b.criado_em.localeCompare(a.criado_em)||a.id.localeCompare(b.id));
  return `<button class="back-link" data-notes-back>← Todas as disciplinas</button><div class="resource-heading"><div><span class="eyebrow">SUAS ANOTAÇÕES</span><h2>${esc(discipline?.nome||'Anotações livres')}</h2><p>${notes.length} anotações</p></div>${add('anotacoes','Nova anotação',discipline?`data-subject="${discipline.id}"`:'')}</div><div class="notes-lines">${notes.map(note=>noteCard(note)).join('')||empty('Nenhuma anotação nesta disciplina.','Escreva durante o estudo ou use o botão Nova anotação acima.')}</div>`;
 }
 const groups=subjects().map(discipline=>({id:discipline.id,nome:discipline.nome,notes:rows.filter(note=>note.disciplina_id===discipline.id)})).filter(group=>group.notes.length);
 const free=rows.filter(note=>!note.disciplina_id);if(free.length)groups.push({id:'free',nome:'Anotações livres',notes:free});
 return `<div class="filter-bar"><span class="filter-count">${groups.length} grupos · ${rows.length} anotações</span>${add('anotacoes','Nova anotação')}</div><div class="subject-cards">${groups.map(group=>`<article class="subject-card"><button class="subject-card-open" data-notes-discipline="${group.id}"><span class="subject-mark" aria-hidden="true">✎</span><h3>${esc(group.nome)}</h3><span class="subject-subtitle">${group.notes.length} anotações${group.id!=='free'?` · ${new Set(group.notes.map(note=>note.conteudo_id).filter(Boolean)).size} conteúdos`:''}</span><span class="subject-open-label">Abrir anotações →</span></button></article>`).join('')||empty('Suas anotações aparecerão por disciplina.','Use o botão Nova anotação acima ou escreva durante o estudo.')}</div>`;
}
function noteCard(note){return `<article class="note-card"><div class="note-card-context">${esc(note.disciplina_id?subjectName(note.disciplina_id):'Anotação livre')}</div><h3>${esc(topicName(note.conteudo_id)||note.titulo)}</h3>${note.conteudo_id&&note.titulo!==topicName(note.conteudo_id)?`<p class="note-custom-title">${esc(note.titulo)}</p>`:''}<div class="note-body">${esc(note.corpo)}</div><div class="note-card-footer"><time datetime="${esc(note.criado_em)}">${esc(stamp(note.criado_em))}</time>${rowActions('anotacoes',note.id)}</div></article>`;}

function studyView(){
 const item=itemById(state.studyId),discipline=subject(state.studySubjectId);
 if(!discipline)return empty('Estudo não encontrado.','Ele pode ter sido removido ou não pertencer à sua conta.','<button class="secondary" data-page="dashboard">Voltar ao dashboard</button>');
 const content=state.conteudos.filter(row=>row.disciplina_id===discipline.id),selected=topic(state.studyTopicId);
 const rows=state.anotacoes.filter(row=>row.disciplina_id===discipline.id&&(!row.conteudo_id||row.conteudo_id===state.studyTopicId));
 const key=discipline.id+':'+(state.studyTopicId||'livre'),draft=state.drafts[key]||{titulo:'',corpo:''};
 const execution=active();
 const currentExecution=execution&&(item?execution.item_cronograma_id===item.id:execution.disciplina_id===discipline.id)?execution:null;
 const context={disciplina_id:discipline.id,conteudo_id:state.studyTopicId||null,item_cronograma_id:item&&item.conteudo_id===(state.studyTopicId||null)?item.id:null};
 return `<div class="study-breadcrumb"><button class="text-button" data-page="dashboard">← Dashboard</button><span>${esc(competition(discipline.concurso_id)?.nome||'')} / ${esc(discipline.nome)}</span></div><div class="study-detail-layout"><div><section class="panel"><div class="study-detail-heading"><div><span class="eyebrow">${item?dateOnly(dayKey(item.inicio_previsto))+' · '+timeLabel(item.inicio_previsto)+'–'+timeLabel(endOf(item)):'ESTUDO DA DISCIPLINA'}</span><span class="study-discipline-context">${esc(discipline.nome)}</span><h2>${esc(selected?.titulo||discipline.nome)}</h2>${selected?.descricao?`<p>${esc(selected.descricao)}</p>`:!selected&&discipline.descricao?`<p>${esc(discipline.descricao)}</p>`:''}${legalReferences(selected)}</div>${item?badge(item.status):'<span class="badge">Peso '+discipline.peso+'</span>'}</div><div class="detail-actions">${currentExecution?`<button class="primary" data-study-execution="${currentExecution.status==='pausada'?'retomar':'pausar'}">${currentExecution.status==='pausada'?'Retomar':'Pausar'}</button><button class="secondary" data-study-execution="finalizar">Finalizar</button><button class="text-button danger" data-study-execution="cancelar">Cancelar</button>`:(!item||item.status==='pendente')?'<button class="primary" data-start-study>Iniciar</button>':''}</div></section><section class="panel"><div class="panel-heading"><div><h2>Comentários e anotações</h2><p class="panel-subtitle">${esc(selected?.titulo||'Anotações da disciplina')}</p></div></div><div class="study-chat" role="log" aria-label="Anotações deste estudo">${[...rows].sort((a,b)=>a.criado_em.localeCompare(b.criado_em)||a.id.localeCompare(b.id)).map(note=>`<article class="study-chat-message"><div class="study-chat-body">${esc(note.corpo)}</div><div class="study-chat-meta"><time datetime="${esc(note.criado_em)}">${esc(stamp(note.criado_em))}</time>${rowActions('anotacoes',note.id)}</div></article>`).join('')||'<p class="study-chat-empty">Registre aqui suas ideias, dúvidas e o que aprendeu.</p>'}</div><form id="study-note" class="study-chat-compose" data-draft-key="${key}"><div class="study-chat-input"><textarea name="corpo" rows="2" required maxlength="30000" aria-label="Nova anotação" placeholder="Escreva uma anotação…">${esc(draft.corpo)}</textarea><button class="primary" type="submit">Enviar</button></div><span class="subtle">Enter para enviar · Shift + Enter para uma nova linha</span><p id="note-error" class="inline-error" role="alert"></p></form></section></div><div>${timerCard(true,context)}${section('Foco nesta disciplina',historyTable(state.pomodoro.sessions.filter(row=>row.disciplina_id===discipline.id).slice(0,3),{compact:true}))}</div></div>`;
}

function pomodoroView(){
 const rows=sessions().filter(row=>!state.filters.history||row.disciplina_id===state.filters.history);
 return `<div class="pomodoro-page-clock">${timerCard(false)}<section class="focus-guide"><span class="eyebrow">UM CICLO DE CADA VEZ</span><h2>Concentração com espaço para respirar.</h2><ol><li>Escolha a disciplina e o conteúdo.</li><li>Inicie o foco e estude até o relógio terminar.</li><li>Conclua o ciclo para registrar e escolha sua pausa.</li></ol><p>Você pode pausar ou cancelar. Concluir um ciclo de foco não conclui automaticamente um estudo agendado.</p><button class="secondary" data-settings>Ajustar foco e pausas</button></section></div>${section('Histórico de estudo',`<div class="filter-bar">${filterSelect('history','Disciplina',subjects(),state.filters.history)}<span class="filter-count">${rows.length} sessões</span></div>${historyTable(rows)}`)}`;
}

function agenda(){
 const list=items().filter(item=>!state.filters.agenda||item.disciplina_id===state.filters.agenda);
 const dates=weekDays(state.agendaAnchor);
 const title=state.agendaMode==='pipeline'?'Todas as atividades':state.agendaMode==='mes'?new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(parseDay(state.agendaAnchor)):`${dateOnly(dates[0])} — ${dateOnly(dates[6])}`;
 return `<section class="agenda-panel"><div class="agenda-toolbar"><div class="agenda-date-navigation"><button class="secondary" data-calendar-today>Hoje</button>${state.agendaMode!=='pipeline'?'<button class="icon-button" data-calendar-step="-1" aria-label="Período anterior">‹</button><button class="icon-button" data-calendar-step="1" aria-label="Próximo período">›</button>':''}<h2>${esc(title)}</h2></div><div class="view-switch">${[['mes','Mês'],['semana','Semana'],['pipeline','Pipeline']].map(([mode,label])=>`<button data-agenda-mode="${mode}" class="${state.agendaMode===mode?'active':''}">${label}</button>`).join('')}</div>${scheduleButton(state.agendaAnchor)}</div><div class="agenda-filters">${filterSelect('agenda','Disciplina',subjects(),state.filters.agenda)}<span class="subtle">${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)} · ${list.length} atividades agendadas</span>${selectedCompetition()?.data_prova?'<button class="text-button" data-exam-day>Ir à data da prova →</button>':''}</div>${calendarView({items:list,competitions:state.contestId==='all'?state.concursos:state.concursos.filter(row=>row.id===state.contestId),anchor:state.agendaAnchor,mode:state.agendaMode,subjectName,topicName})}</section>`;
}

function settingsView(){
 const settings=state.pomodoro.settings,theme=document.documentElement.dataset.theme;
 return `<div class="preferences-layout">${section('Aparência',`<p class="form-help">Escolha o tema do aplicativo neste dispositivo.</p><div class="theme-options"><button class="secondary" data-set-theme="light" aria-pressed="${theme==='light'}">☀ Claro</button><button class="secondary" data-set-theme="dark" aria-pressed="${theme==='dark'}">☾ Escuro</button></div>`)}${section('Pomodoro',`<p class="form-help">Defina os tempos dos próximos ciclos.</p><form id="preferences-form"><div class="settings-grid">${[['foco_segundos','Foco (minutos)',180],['pausa_curta_segundos','Pausa curta (minutos)',60],['pausa_longa_segundos','Pausa longa (minutos)',120],['ciclos_ate_pausa_longa','Ciclos até a pausa longa',12]].map(([key,label,max])=>field(key,label,'number',key==='ciclos_ate_pausa_longa'?settings[key]:settings[key]/60,`required min="1" max="${max}" step="1"`)).join('')}</div><button class="primary" type="submit">Salvar configurações</button><p id="preferences-error" class="inline-error" role="alert"></p></form>`)}</div>`;
}

const pageTitles={configuracoes:['Configurações.','Ajuste a aparência e o seu ritmo de estudo.'],dashboard:['Seu estudo, um dia de cada vez.','O roteiro de hoje, seu foco e o que você já concluiu.'],cadastro:['Seus estudos e disciplinas.','Crie com IA e personalize suas matérias e conteúdos.'],cronograma:['Monte seu cronograma.','Escolha o que estudar e reserve um horário no seu dia.'],pomodoro:['Encontre seu ritmo de foco.','Relógio na parte superior. Seu histórico de estudo logo abaixo.'],anotacoes:['Tudo o que você quer lembrar.','Suas anotações organizadas por estudo, disciplina e conteúdo.'],agenda:['Seu estudo no calendário.','Veja os horários por mês, por semana ou em etapas.'],estudo:['Seu espaço de estudo.','Conteúdo, anotações e Pomodoro no mesmo lugar.']};
function render(){
 if(!loaded)return;
 $('#workspace').dataset.page=state.page;
 $('#workspace .page-heading').hidden=state.page==='estudo';
 const [title,description]=pageTitles[state.page];
 $('#page-title').textContent=title;$('#page-description').textContent=description;
 $('#breadcrumb').textContent='Meu espaço / '+({dashboard:'Dashboard',cadastro:'Cadastrar estudo',cronograma:'Cronograma de estudo',pomodoro:'Pomodoro',anotacoes:'Anotações',agenda:'Agenda',configuracoes:'Configurações',estudo:'Detalhes do estudo'})[state.page];
 document.querySelectorAll('nav [data-page]').forEach(button=>button.classList.toggle('selected',button.dataset.page===(state.page==='estudo'?'dashboard':state.page)));
 $('#contest-context').hidden=['cadastro','estudo','configuracoes'].includes(state.page)||!state.concursos.length;
 const allAllowed=['dashboard','agenda','anotacoes','pomodoro'].includes(state.page);
 $('#contest-select').innerHTML=(allAllowed?`<option value="all" ${state.contestId==='all'?'selected':''}>Todos os estudos</option>`:'')+state.concursos.map(row=>`<option value="${row.id}" ${row.id===state.contestId?'selected':''}>${esc(row.nome)}</option>`).join('');
 $('#contest-meta').textContent=selectedCompetition()?`${selectedCompetition().banca||'Banca a definir'} · Prova: ${dateOnly(selectedCompetition().data_prova)}`:'Seus estudos reunidos em um só lugar';
 const session=active();$('#active-focus').hidden=true;
 $('#active-focus').innerHTML=session?`<span>● ${session.status==='pausada'?'Foco pausado':'Foco em andamento'} · ${esc(subjectName(session.disciplina_id))} <b data-mini-timer></b></span><button class="text-button" ${session.item_cronograma_id?'data-study="'+session.item_cronograma_id+'"':'data-page="pomodoro"'}>Abrir sessão →</button>`:'';
 $('#page').innerHTML=!state.concursos.length&&!['cadastro','configuracoes'].includes(state.page)?firstRun():({dashboard,cadastro:registration,cronograma:schedule,pomodoro:pomodoroView,anotacoes:notesView,agenda,configuracoes:settingsView,estudo:studyView})[state.page]();
 bindPage();tick();
}

function bindPage(){
 document.querySelectorAll('[data-replan-study]').forEach(button=>button.onclick=()=>{const id=button.dataset.replanStudy;setContest(id);scheduleFlows[id]??={step:1,draft:{inicio:dayKey(),fim:selectedCompetition()?.data_prova?shiftDay(selectedCompetition().data_prova,-1):shiftDay(dayKey(),90),minutos:50}};scheduleFlows[id].step=state.disponibilidades.some(row=>row.concurso_id===id)?2:1;scheduleFlows[id].reorganizar=true;schedulePreview=null;navigate('cronograma');render();});
 document.querySelectorAll('[data-notes-discipline]').forEach(button=>button.onclick=()=>{state.filters.notes=button.dataset.notesDiscipline;render();});
 const notesBack=$('[data-notes-back]');if(notesBack)notesBack.onclick=()=>{state.filters.notes='';render();};
 document.querySelectorAll('[data-schedule-step]').forEach(button=>button.onclick=()=>{
  const flow=scheduleFlows[state.contestId];if(!flow||flow.busy)return;
  const step=Number(button.dataset.scheduleStep),available=state.disponibilidades.some(row=>row.concurso_id===state.contestId);
  if(step===2&&!available)return;if(step===3&&schedulePreview?.concurso_id!==state.contestId)return;if(step===4&&!items().length)return;
  flow.step=step;render();$('.schedule-flow')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 const planner=$('#ai-schedule-form');if(planner){planner.oninput=()=>{scheduleFlows[state.contestId].draft=Object.fromEntries(new FormData(planner));};planner.onsubmit=async event=>{
  event.preventDefault();const courseId=state.contestId,flow=scheduleFlows[courseId];flow.busy=true;const button=planner.querySelector('[type="submit"]');button.disabled=true;planner.querySelector('[data-schedule-step]').disabled=true;$('#ai-schedule-error').textContent='';$('#ai-schedule-status').textContent='Organizando os assuntos e os horários. Aguarde a prévia…';
  try{
   const data=Object.fromEntries(new FormData(planner));schedulePreview=await api('ia/cronograma','POST',{concurso_id:courseId,inicio:data.inicio,fim:data.fim,minutos:Number(data.minutos),reorganizar:flow.reorganizar||false});flow.step=3;flow.busy=false;render();$('#confirm-ai-schedule')?.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){$('#ai-schedule-error').textContent=error.message;$('#ai-schedule-status').textContent='';button.disabled=false;planner.querySelector('[data-schedule-step]').disabled=false;flow.busy=false;}
 };}
 const discardSchedule=$('#discard-ai-schedule');if(discardSchedule)discardSchedule.onclick=()=>{schedulePreview=null;scheduleFlows[state.contestId].step=2;render();};
 const confirmSchedule=$('#confirm-ai-schedule');if(confirmSchedule)confirmSchedule.onclick=async()=>{
  confirmSchedule.disabled=true;$('#confirm-ai-schedule-error').textContent='';
  try{const result=await api('ia/cronograma/confirmar','POST',{token:schedulePreview.token});schedulePreview=null;scheduleFlows[state.contestId].step=4;scheduleFlows[state.contestId].reorganizar=false;await refresh();toast(result.quantidade+' atividades adicionadas à agenda.');}
  catch(error){$('#confirm-ai-schedule-error').textContent=error.message;confirmSchedule.disabled=false;}
 };

 document.querySelectorAll('[data-open-import]').forEach(button=>button.onclick=()=>{importingStudy=true;state.cadSubjectId='';render();window.scrollTo({top:0,behavior:'smooth'});});
 const closeImport=$('[data-close-import]');if(closeImport)closeImport.onclick=()=>{importingStudy=false;editalPreview=null;render();};
 const upload=$('#edital-upload');
 if(upload)upload.elements.arquivo.onchange=()=>{
  const file=upload.elements.arquivo.files[0];
  $('#edital-file-name').textContent=file?file.name:'Selecione seu edital';
  $('#edital-file-info').textContent=file?`${(file.size/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:2})} MB · PDF`:'Arquivo PDF · até 30 MB';
  upload.querySelector('.edital-file-action').textContent=file?'Trocar arquivo':'Escolher arquivo';
  upload.querySelector('.edital-file-picker').classList.toggle('has-file',!!file);
 };

 if(upload)upload.onsubmit=async event=>{
  event.preventDefault();if(editalBusy)return;
  const file=upload.elements.arquivo.files[0],cargo=upload.elements.cargo.value;
  const error=$('#edital-error');error.textContent='';
  if(!file||file.size>30*1024*1024||!file.name.toLowerCase().endsWith('.pdf')){error.textContent='Selecione um PDF de até 30 MB.';return;}
  const button=upload.querySelector('button');editalBusy=true;button.disabled=true;button.textContent='Analisando edital…';upload.elements.arquivo.disabled=true;upload.elements.cargo.disabled=true;$('#edital-status').textContent='Analisando o edital. Isso pode levar alguns minutos; aguarde a prévia.';
  try{
   const response=await fetch('/api/ia/edital?cargo='+encodeURIComponent(cargo),{method:'POST',headers:{'Content-Type':'application/pdf'},body:file,credentials:'include'});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível analisar o edital.');
   editalPreview=data;editalBusy=false;render();$('.edital-preview')?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(failure){error.textContent=failure.message;}finally{editalBusy=false;const current=$('#edital-upload button');if(current){current.disabled=false;current.textContent='Analisar com IA';const form=$('#edital-upload');form.elements.arquivo.disabled=false;form.elements.cargo.disabled=false;$('#edital-status').textContent='';}}
 };
 const discard=$('#edital-discard');if(discard)discard.onclick=()=>{editalPreview=null;render();};
 const confirm=$('#edital-confirm');if(confirm)confirm.onclick=async()=>{
  confirm.disabled=true;$('#edital-confirm-error').textContent='';
  try{
   const nome=$('[name="edital_nome"]').value.trim();if(!nome)throw Error('Informe o nome do estudo.');
   const study=await api('ia/edital/confirmar','POST',{token:editalPreview.token,nome});
   editalPreview=null;importingStudy=false;state.contestId=study.id;state.cadSubjectId='';await refresh();toast('Estudo, disciplinas e conteúdos cadastrados com sucesso.');
  }catch(error){$('#edital-confirm-error').textContent=error.message;confirm.disabled=false;}
 };

 const preferences=$('#preferences-form');
 if(preferences)preferences.onsubmit=async event=>{
  event.preventDefault();const button=preferences.querySelector('button');button.disabled=true;$('#preferences-error').textContent='';
  try{
   const body=Object.fromEntries([...new FormData(preferences)].map(([key,value])=>[key,Number(value)*(key==='ciclos_ate_pausa_longa'?1:60)]));
   await api('pomodoro/preferencias','PUT',body);await refresh();toast('Configurações salvas.');
  }catch(error){$('#preferences-error').textContent=error.message;button.disabled=false;}
 };

 const week=$('.week-scroll');
 if(week){
  const days=weekDays(state.agendaAnchor);
  const first=items().filter(row=>(!state.filters.agenda||row.disciplina_id===state.filters.agenda)&&days.includes(dayKey(row.inicio_previsto))).sort((a,b)=>new Date(a.inicio_previsto).getHours()-new Date(b.inicio_previsto).getHours())[0];
  week.scrollTop=Math.max(0,(first?new Date(first.inicio_previsto).getHours()-1:8)*48);
 }
 const date=$('#dashboard-day');if(date)date.onchange=()=>{if(date.value){state.day=date.value;render();}};
 const ds=$('[name="timer_subject"]'),cs=$('[name="timer_topic"]');
 if(ds&&cs){
  ds.onchange=()=>{state.timerContext={disciplina_id:ds.value||null,conteudo_id:null};cs.innerHTML='<option value="">Sem conteúdo específico</option>'+state.conteudos.filter(row=>ds.value?row.disciplina_id===ds.value:topics().some(c=>c.id===row.id)).map(row=>`<option value="${row.id}">${esc(row.titulo)}</option>`).join('');};
  cs.onchange=()=>{const row=topic(cs.value);if(row)ds.value=row.disciplina_id;state.timerContext={disciplina_id:ds.value||null,conteudo_id:cs.value||null};};
 }
 const chat=$('.study-chat');if(chat)chat.scrollTop=chat.scrollHeight;
 const form=$('#study-note');
 if(form){
  form.elements.corpo.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!form.querySelector('button').disabled)form.requestSubmit();}};
  form.oninput=()=>{state.drafts[form.dataset.draftKey]={corpo:form.elements.corpo.value};};
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('button.primary');button.disabled=true;
   try{const body=form.elements.corpo.value.trim();if(!body)throw Error('Escreva sua anotação.');await api('anotacoes','POST',{titulo:(topicName(state.studyTopicId)||'Anotação de '+subjectName(state.studySubjectId)).slice(0,200),corpo:body,disciplina_id:state.studySubjectId,conteudo_id:state.studyTopicId||null});delete state.drafts[form.dataset.draftKey];await refresh();toast('Anotação salva neste estudo.');}catch(error){$('#note-error').textContent=error.message;button.disabled=false;}
  };
 }
}
function tick(){
 const session=active(),phase=session?.fase||state.phase,planned=session?.duracao_planejada_segundos||state.pomodoro.settings[phase+'_segundos']||1500;
 const remaining=session?Math.max(0,planned-sessionElapsed(session,now())):planned;
 if($('#timer'))$('#timer').textContent=stopwatch(remaining);
 if($('#timer-caption'))$('#timer-caption').textContent=session?(remaining===0?'Ciclo completo. Registre sua sessão.':session.status==='pausada'?'Pausado. Retome quando quiser.':'Uma coisa de cada vez.'):'Pronto para começar?';
 if($('#clock-ring'))$('#clock-ring').style.setProperty('--clock-progress',`${(1-remaining/planned)*360}deg`);
 if($('#finish-cycle'))$('#finish-cycle').disabled=remaining>0;
 document.querySelectorAll('[data-mini-timer]').forEach(element=>element.textContent=stopwatch(remaining));
 document.querySelectorAll('[data-session-countdown]').forEach(element=>{if(element.dataset.sessionCountdown===session?.id)element.textContent=stopwatch(remaining);});
 if($('#today-focus'))$('#today-focus').textContent=duration(sessions().filter(row=>row.fase==='foco'&&dayKey(row.iniciada_em)===state.day).reduce((sum,row)=>sum+sessionElapsed(row,now()),0));
}
setInterval(tick,1000);

const editors=createEditors({state,api,refresh,toast,navigate,onCreatedCompetition:id=>{state.contestId=id;state.cadSubjectId='';navigate('cadastro');},onCreatedResource:(resource,row)=>{if(!['disciplinas','conteudos'].includes(resource))return;schedulePreview=null;const courseId=resource==='disciplinas'?row?.concurso_id:subject(row?.disciplina_id)?.concurso_id;if(courseId&&state.itens_cronograma.some(item=>item.concurso_id===courseId))toast(resource==='disciplinas'?'Disciplina adicionada. Cadastre os conteúdos e use Replanejar pendências com IA.':'Conteúdo adicionado. Use Replanejar pendências com IA para atualizar todo o estudo.');}});
function openSchedule(day=dayKey(),id){if(!id&&!state.disponibilidades.some(row=>row.concurso_id===state.contestId)){toast('Cadastre primeiro seus dias e horários disponíveis.');navigate('cronograma');return;}if(!state.concursos.length){toast('Cadastre um estudo para agendar seus estudos.');navigate('cadastro');return;}editors.open('schedule',id,{day});}
async function startFocus(context){
 if(active())throw Error('Já existe uma sessão aberta. Pause, conclua ou cancele essa sessão antes de iniciar outra.');
 const result=await api('pomodoro/iniciar','POST',{fase:state.phase,...context,titulo:topicName(context.conteudo_id)||subjectName(context.disciplina_id)||'Foco livre'});
 state.timerContext={disciplina_id:result.disciplina_id,conteudo_id:result.conteudo_id,item_cronograma_id:result.item_cronograma_id};clockNotice='';await refresh();
}
async function timerAction(action){
 if(action==='iniciar'){
  const context={disciplina_id:$('[name="timer_subject"]')?.value||null,conteudo_id:$('[name="timer_topic"]')?.value||null};
  if(state.page==='estudo'){
   const item=itemById(state.studyId);if(item&&item.disciplina_id===context.disciplina_id&&item.conteudo_id===context.conteudo_id)context.item_cronograma_id=item.id;
  }
  await startFocus(context);return;
 }
 const session=active();if(!session)return;
 await api(`pomodoro/${session.id}/${action}`,'POST',{});
 await refresh();
 if(action==='concluir'){
  if(session.fase==='foco'){
   const history=[...state.pomodoro.sessions].sort((a,b)=>b.iniciada_em.localeCompare(a.iniciada_em));let count=0;
   for(const row of history){if(row.fase==='pausa_longa'&&row.status==='concluida')break;if(row.fase==='foco'&&row.status==='concluida')count++;}
   state.phase=count>=state.pomodoro.settings.ciclos_ate_pausa_longa?'pausa_longa':'pausa_curta';
  }else state.phase='foco';
  clockNotice='Ciclo registrado. Próximo: '+phaseLabel[state.phase].toLowerCase()+'.';render();
 }
}

document.addEventListener('change',event=>{
 const key=event.target.dataset.filter;if(key){state.filters[key]=event.target.value;state.historyPage=0;render();}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 try{
  if(button.dataset.page)navigate(button.dataset.page);
  if(button.dataset.chooseContest){setContest(button.dataset.chooseContest);}
  if(button.dataset.manageSubject){state.cadSubjectId=button.dataset.manageSubject;render();}
  if(button.hasAttribute('data-back-subjects')){state.cadSubjectId='';render();}
  if(button.dataset.study)navigate('estudo/'+button.dataset.study);
  if(button.dataset.studySubject)navigate('disciplina/'+button.dataset.studySubject);
  if(button.dataset.selectTopic){state.studyTopicId=button.dataset.selectTopic;render();}
  if(button.dataset.add){
   const resource=button.dataset.add;
   if(resource==='concursos'){importingStudy=true;navigate('cadastro');return;}
   if(['disciplinas','disponibilidades'].includes(resource)&&!selectedCompetition())return toast('Selecione ou cadastre um estudo primeiro.');
   const defaults={concurso_id:state.contestId,disciplina_id:button.dataset.subject||state.cadSubjectId};
   editors.open(resource,undefined,defaults);
  }
  if(button.dataset.edit)editors.open(button.dataset.edit,button.dataset.id);
  if(button.dataset.delete){
   const messages={concursos:'Excluir este estudo e todas as disciplinas, conteúdos, atividades, anotações e sessões Pomodoro vinculadas?',disciplinas:'Excluir esta disciplina e todos os conteúdos, atividades, anotações e sessões Pomodoro vinculadas?',conteudos:'Excluir este conteúdo e todas as atividades, anotações e sessões Pomodoro vinculadas?',itens_cronograma:'Excluir esta atividade e suas sessões Pomodoro vinculadas?',pomodoro:'Excluir esta sessão do histórico Pomodoro?'};
   if(!confirm((messages[button.dataset.delete]||'Excluir este registro?')+' Essa ação não pode ser desfeita.'))return;
   button.disabled=true;await api(button.dataset.delete+'/'+button.dataset.id+'?cascade=true','DELETE');await refresh();toast('Registro excluído.');
  }
  if(button.dataset.newBlock)openSchedule(button.dataset.newBlock);
  if(button.dataset.editBlock)openSchedule(undefined,button.dataset.editBlock);
  if(button.dataset.itemStatus){button.disabled=true;await api('itens_cronograma/'+button.dataset.itemStatus,'PATCH',{status:button.dataset.status});await refresh();toast(button.dataset.status==='concluido'?'Atividade do dia concluída.':'Agendamento atualizado.');}
  if(button.dataset.topicStatus){button.disabled=true;await api('conteudos/'+button.dataset.topicStatus,'PATCH',{status:button.dataset.status});await refresh();}
  if(button.dataset.previewStep){state.previewDay=shiftDay(state.previewDay,Number(button.dataset.previewStep));render();}
  if(button.dataset.dashboardDate){state.day=button.dataset.dashboardDate;render();}
  if(button.dataset.dayStep){state.day=shiftDay(state.day,Number(button.dataset.dayStep));render();}
  if(button.hasAttribute('data-day-today')){state.day=dayKey();render();}
  if(button.hasAttribute('data-overdue')){state.filters.scheduleStatus='pendente';navigate('cronograma');}
  if(button.dataset.phase){state.phase=button.dataset.phase;clockNotice='';render();}
  if(button.hasAttribute('data-settings'))editors.open('settings');
  if(button.hasAttribute('data-start-study')){
   button.disabled=true;state.phase='foco';const item=itemById(state.studyId);
   await startFocus({disciplina_id:item?.disciplina_id||state.studySubjectId,conteudo_id:item?.conteudo_id||state.studyTopicId||null,item_cronograma_id:item?.id||null});
  }
  if(button.dataset.studyExecution){
   const session=active(),item=itemById(state.studyId);
   if(!session||(item?session.item_cronograma_id!==item.id:session.disciplina_id!==state.studySubjectId))throw Error('Não há execução ativa desta atividade.');
   button.disabled=true;
   await timerAction(button.dataset.studyExecution);
   if(button.dataset.studyExecution==='finalizar'){navigate('dashboard');toast('Atividade finalizada e tempo de estudo registrado.');}
   if(button.dataset.studyExecution==='cancelar'){navigate('dashboard');toast('Execução cancelada. Você pode iniciar a atividade novamente.');}
  }
  if(button.dataset.timerAction){button.disabled=true;await timerAction(button.dataset.timerAction);}
  if(button.dataset.continueStudy){
   const session=active();
   if(session?.item_cronograma_id!==button.dataset.continueStudy)throw Error('Esta atividade não possui uma execução ativa.');
   button.disabled=true;if(session.status==='pausada')await timerAction('retomar');
   navigate('estudo/'+button.dataset.continueStudy);
  }
  if(button.dataset.cancelExecution){
   if(active()?.id!==button.dataset.cancelExecution)throw Error('Esta execução já foi encerrada.');
   button.disabled=true;await timerAction('cancelar');toast('Execução cancelada. A atividade continua cadastrada.');
  }
  if(button.dataset.startBlock){const item=itemById(button.dataset.startBlock);state.phase='foco';button.disabled=true;await startFocus({item_cronograma_id:item.id,disciplina_id:item.disciplina_id,conteudo_id:item.conteudo_id});navigate('estudo/'+item.id);}
  if(button.dataset.agendaMode){state.agendaMode=button.dataset.agendaMode;render();}
  if(button.dataset.calendarStep){const direction=Number(button.dataset.calendarStep);if(state.agendaMode==='semana')state.agendaAnchor=shiftDay(state.agendaAnchor,7*direction);else{const date=parseDay(state.agendaAnchor);date.setDate(1);date.setMonth(date.getMonth()+direction);state.agendaAnchor=dayKey(date);}render();}
  if(button.hasAttribute('data-calendar-today')){state.agendaAnchor=dayKey();render();}
  if(button.dataset.calendarDay){state.agendaMode='semana';state.agendaAnchor=button.dataset.calendarDay;render();}
  if(button.hasAttribute('data-exam-day')){state.agendaAnchor=selectedCompetition().data_prova;state.agendaMode='mes';render();}
  if(button.dataset.historyPage){state.historyPage+=Number(button.dataset.historyPage);render();}
 }catch(error){button.disabled=false;toast(error.message);}
});

$('#contest-select').onchange=event=>setContest(event.target.value);
$('#toggle-auth').onclick=()=>{registering=!registering;$('#name-field').hidden=!registering;$('#name-field input').required=registering;$('#auth-title').textContent=registering?'Comece no seu ritmo.':'Bom ter você aqui.';$('#auth-sub').textContent=registering?'Seu estudo, suas disciplinas e seu progresso em um só lugar.':'Entre para continuar de onde parou.';$('#auth-submit').textContent=registering?'Criar meu espaço →':'Entrar no meu espaço →';$('#toggle-auth').textContent=registering?'Já tenho conta':'Ainda não tenho conta';$('#auth-form [name="senha"]').autocomplete=registering?'new-password':'current-password';$('#auth-error').textContent='';};
if(new URLSearchParams(location.search).get('cadastro')==='1')$('#toggle-auth').click();
async function enter(){const user=await api('me');$('#username').textContent=user.nome;$('#avatar').textContent=user.nome[0].toUpperCase();await refresh();$('#auth').hidden=true;$('#workspace').hidden=false;}
$('#auth-form').onsubmit=async event=>{event.preventDefault();const button=$('#auth-submit');button.disabled=true;$('#auth-error').textContent='';try{const data=Object.fromEntries(new FormData(event.target));if(!registering)delete data.nome;await api('auth/'+(registering?'cadastro':'login'),'POST',data);event.target.reset();if(registering)location.hash='#dashboard';await enter();}catch(error){$('#auth-error').textContent=error.message;}finally{button.disabled=false;}};
$('#logout').onclick=async()=>{try{await api('auth/logout','POST',{});location.reload();}catch(error){toast(error.message);}};
$('#today').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'numeric',month:'long'}).format(new Date());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)refresh().catch(error=>toast(error.message));});
enter().catch(error=>{if(error.message!=='Entre na sua conta.')$('#auth-error').textContent='Não foi possível conectar ao seu espaço. Verifique se o servidor está disponível.';});
