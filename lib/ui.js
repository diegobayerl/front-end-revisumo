export const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const $=selector=>document.querySelector(selector);
export const dateLabel=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(value));
export const timeLabel=value=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export const stamp=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
export const dateOnly=value=>value?value.split('-').reverse().join('/'):'A definir';
export function duration(seconds){const minutes=Math.floor(seconds/60);return minutes>=60?`${Math.floor(minutes/60)}h${minutes%60?' '+minutes%60+'min':''}`:`${minutes} min`;}
export function stopwatch(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export const statusLabel={pendente:'Pendente',concluido:'Concluído',cancelado:'Cancelado',em_estudo:'Em estudo',em_andamento:'Em andamento',pausada:'Pausada',concluida:'Concluída',cancelada:'Cancelada'};
export const phaseLabel={foco:'Foco',pausa_curta:'Pausa curta',pausa_longa:'Pausa longa'};
export function badge(status){return `<span class="badge status-${status}">${statusLabel[status]||esc(status)}</span>`;}
export function empty(title,text,action=''){return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">◫</span><h3>${title}</h3><p>${text}</p>${action}</div>`;}
export function field(name,label,type='text',value='',extra='') {return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
export function select(name,label,rows,{value='',optional=false,labelKey='nome',emptyLabel}={}) {
 return `<label>${label}<select name="${name}" ${optional?'':'required'}><option value="">${emptyLabel||(optional?'Opcional':'Selecione')}</option>${rows.map(row=>`<option value="${row.id}" ${row.id===value?'selected':''}>${esc(row[labelKey])}</option>`).join('')}</select></label>`;
}
export function textarea(name,label,value='',limit=30000){return `<label>${label}<textarea name="${name}" maxlength="${limit}">${esc(value)}</textarea></label>`;}
export function localInput(value){const date=new Date(value);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;}
export function rowActions(resource,id){return `<div class="row-actions"><button data-edit="${resource}" data-id="${id}">Editar</button><button class="danger" data-delete="${resource}" data-id="${id}">Excluir</button></div>`;}
