// Mantém compatibilidade com os links antigos do aplicativo.
if(/^#(?:dashboard|cadastro|cronograma|pomodoro|anotacoes|agenda|configuracoes|estudo|disciplina)(?:\/|$)/.test(location.hash))location.replace('/app'+location.hash);
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');menu.textContent=open?'×':'☰';nav.classList.toggle('open',open);});
nav.addEventListener('click',event=>{if(event.target.closest('a')){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');menu.textContent='☰';nav.classList.remove('open');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&nav.classList.contains('open')){menu.click();menu.focus();}});
document.querySelector('#year').textContent=String(new Date().getFullYear());
