import './style.css';
import { PDFDocument, StandardFonts, rgb, PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { initScanner } from './scanner.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const app = document.querySelector('#app');

const APP_SESSION_VERSION = '3.0-ocr-all-pages';
const DEFAULT_TEMPLATE_NAME = 'Ficha_atendimento_Patricia_PDF_PREENCHIVEL_SEM_ESPACO_RGPD.pdf';
const DEFAULT_TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/${DEFAULT_TEMPLATE_NAME}`;

const editor = {
  pdfBytes: null,
  pdfjs: null,
  fileName: 'documento.pdf',
  scale: 1.35,
  mode: 'edit',
  edits: [],
  formValues: {},
  undo: [],
  selectedId: null,
  dirty: false,
};

function uid(){ return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function esc(s=''){ return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function dbOpen(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('rjp-pdf-editor',1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('session')) req.result.createObjectStore('session'); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function dbSet(key,val){ const db=await dbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction('session','readwrite'); tx.objectStore('session').put(val,key); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
async function dbGet(key){ const db=await dbOpen(); return new Promise((res,rej)=>{ const r=db.transaction('session').objectStore('session').get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function dbClear(){ const db=await dbOpen(); return new Promise((res,rej)=>{ const tx=db.transaction('session','readwrite'); tx.objectStore('session').clear(); tx.oncomplete=res; tx.onerror=()=>rej(tx.error); }); }
let persistTimer;
function persistSoon(){ clearTimeout(persistTimer); persistTimer=setTimeout(async()=>{ try{ await dbSet('meta',{appSessionVersion:APP_SESSION_VERSION,fileName:editor.fileName,edits:editor.edits,formValues:editor.formValues,scale:editor.scale}); if(editor.pdfBytes) await dbSet('pdf', editor.pdfBytes); }catch(e){console.warn('AutoSave',e);} },350); }

function shell(){
  app.innerHTML=`
  <header class="topbar">
    <div class="brand"><strong>RJP PDF Editor</strong><span id="docName">Nenhum PDF aberto</span></div>
    <div class="toolbar">
      <button id="newFormBtn" class="primary">Nova ficha</button>
      <button id="scanBtn" class="scanner-main">📥 Importar / OCR ficha antiga</button>
      <label class="button">Abrir outro PDF<input id="fileInput" type="file" accept="application/pdf,.pdf" hidden></label>
      <button id="editMode" class="active">Editar texto</button>
      <button id="addMode">Adicionar texto</button>
      <button id="checkMode">✓ Marcar</button>
      <button id="undoBtn" title="Ctrl+Z">Desfazer</button>
      <button id="deleteBtn" disabled>Apagar</button>
      <span class="sep"></span>
      <button id="zoomOut">−</button><span id="zoomLabel">135%</span><button id="zoomIn">+</button>
      <span class="sep"></span>
      <button id="saveBtn" class="primary" disabled>Guardar PDF</button>
      <button id="shareBtn" disabled>Partilhar</button>
      <button id="closeBtn" disabled>Repor ficha</button>
    </div>
  </header>
  <div id="status" class="status">A carregar a Ficha de Atendimento...</div>
  <main id="workspace" class="workspace empty"><div class="dropzone"><div class="dropicon">PDF</div><h2>Ficha de Atendimento</h2><p>A ficha abre automaticamente na WebApp e fica pronta para edição.</p></div></main>`;
}

function bindUI(){
  const fileInput=document.querySelector('#fileInput');
  document.querySelector('#newFormBtn').onclick=()=>openDefaultTemplate(true);
  fileInput.addEventListener('change',e=>e.target.files[0]&&openFile(e.target.files[0]));
  document.querySelector('#editMode').onclick=()=>setMode('edit');
  document.querySelector('#addMode').onclick=()=>setMode('add');
  document.querySelector('#checkMode').onclick=()=>setMode('check');
  document.querySelector('#undoBtn').onclick=undo;
  document.querySelector('#deleteBtn').onclick=deleteSelected;
  document.querySelector('#zoomIn').onclick=()=>setZoom(editor.scale+0.15);
  document.querySelector('#zoomOut').onclick=()=>setZoom(editor.scale-0.15);
  document.querySelector('#saveBtn').onclick=savePdf;
  document.querySelector('#shareBtn').onclick=shareCurrentPdf;
  document.querySelector('#closeBtn').onclick=closePdf;
  const ws=document.querySelector('#workspace');
  ['dragenter','dragover'].forEach(ev=>ws.addEventListener(ev,e=>{e.preventDefault();ws.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>ws.addEventListener(ev,e=>{e.preventDefault();ws.classList.remove('drag');}));
  ws.addEventListener('drop',e=>{ const f=[...e.dataTransfer.files].find(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')); if(f) openFile(f); });
  window.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault(); if(editor.pdfBytes) savePdf();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault(); undo();}
    if((e.key==='Delete'||e.key==='Backspace') && document.activeElement?.tagName!=='TEXTAREA' && document.activeElement?.tagName!=='INPUT'){ deleteSelected(); }
    if(e.key==='Escape') selectEdit(null);
  });
}

function setMode(mode){
  editor.mode=mode; selectEdit(null);
  ['edit','add','check'].forEach(m=>document.querySelector(`#${m}Mode`)?.classList.toggle('active',m===mode));
  document.querySelector('#workspace').dataset.mode=mode;
  status(mode==='edit'?'Modo editar: clica num texto existente.':mode==='add'?'Modo adicionar: clica num ponto da página.':'Modo marcar: clica onde queres colocar ✓.');
}
function status(t){ document.querySelector('#status').textContent=t; }
function updateChrome(){
  document.querySelector('#docName').textContent=editor.pdfBytes?`${editor.fileName}${editor.dirty?' • alterado':''}`:'Nenhum PDF aberto';
  document.querySelector('#saveBtn').disabled=!editor.pdfBytes;
  document.querySelector('#closeBtn').disabled=!editor.pdfBytes;
  document.querySelector('#shareBtn').disabled=!editor.pdfBytes;
  document.querySelector('#deleteBtn').disabled=!editor.selectedId;
  document.querySelector('#zoomLabel').textContent=`${Math.round(editor.scale*100)}%`;
}

async function openDefaultTemplate(fresh=true){
  try{
    status('A carregar a Ficha de Atendimento...');
    const res=await fetch(DEFAULT_TEMPLATE_URL,{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes=new Uint8Array(await res.arrayBuffer());
    if(fresh) await dbClear();
    await loadPdf(bytes,DEFAULT_TEMPLATE_NAME,fresh);
    status('Ficha de Atendimento aberta. Preenche diretamente os campos; também podes editar/adicionar texto livre.');
  }catch(e){
    console.error('Template',e);
    status('Não foi possível carregar a ficha por defeito. Usa “Abrir outro PDF”.');
  }
}

async function openFile(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  await loadPdf(bytes,file.name,true);
}
async function loadPdf(bytes,name='documento.pdf',fresh=false){
  try{
    status('A abrir PDF…');
    editor.pdfBytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    editor.fileName=name;
    if(fresh){ editor.edits=[]; editor.formValues={}; editor.undo=[]; editor.dirty=false; }
    editor.pdfjs=await pdfjsLib.getDocument({data:editor.pdfBytes.slice()}).promise;
    updateChrome(); await renderAll(); persistSoon();
    status(`PDF aberto: ${editor.pdfjs.numPages} página(s). Clica diretamente no texto para editar.`);
  }catch(e){ console.error(e); alert('Não foi possível abrir este PDF: '+e.message); status('Erro ao abrir PDF.'); }
}

async function renderAll(){
  const ws=document.querySelector('#workspace'); ws.innerHTML=''; ws.classList.remove('empty'); ws.dataset.mode=editor.mode;
  for(let n=1;n<=editor.pdfjs.numPages;n++) await renderPage(n,ws);
}

async function renderPage(pageNum,ws){
  const pdfPage=await editor.pdfjs.getPage(pageNum); const viewport=pdfPage.getViewport({scale:editor.scale});
  const section=document.createElement('section'); section.className='pdf-page'; section.dataset.page=pageNum;
  section.style.width=`${viewport.width}px`; section.style.height=`${viewport.height}px`;
  const canvas=document.createElement('canvas'); canvas.width=Math.ceil(viewport.width*devicePixelRatio); canvas.height=Math.ceil(viewport.height*devicePixelRatio); canvas.style.width=`${viewport.width}px`; canvas.style.height=`${viewport.height}px`;
  const ctx=canvas.getContext('2d'); await pdfPage.render({canvasContext:ctx, viewport, transform:devicePixelRatio!==1?[devicePixelRatio,0,0,devicePixelRatio,0,0]:null, annotationMode: pdfjsLib.AnnotationMode?.DISABLE ?? 0}).promise;
  section.appendChild(canvas);
  const formLayer=document.createElement('div'); formLayer.className='form-layer'; section.appendChild(formLayer);
  await renderFormFields(pdfPage,pageNum,viewport,formLayer);
  const textLayer=document.createElement('div'); textLayer.className='text-hit-layer'; section.appendChild(textLayer);
  try{
    const tc=await pdfPage.getTextContent();
    for(const item of tc.items){ if(!item.str?.trim()) continue; const tx=pdfjsLib.Util.transform(viewport.transform,item.transform); const fs=Math.max(5,Math.hypot(tx[2],tx[3])); const x=tx[4], y=tx[5]-fs; const w=Math.max(item.width*editor.scale,fs*.6), h=fs*1.18;
      const span=document.createElement('button'); span.type='button'; span.className='text-hit'; span.title=`Editar: ${item.str}`;
      Object.assign(span.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
      span.onclick=(ev)=>{ev.stopPropagation(); if(editor.mode==='edit') createReplacement(pageNum,viewport,{x,y,w,h,text:item.str,fs});};
      textLayer.appendChild(span);
    }
  }catch(e){ console.warn('Text layer',e); }
  const editLayer=document.createElement('div'); editLayer.className='edit-layer'; section.appendChild(editLayer);
  section.addEventListener('click',ev=>{ if(ev.target!==section&&ev.target!==canvas&&ev.target!==editLayer) return; const r=section.getBoundingClientRect(); const x=ev.clientX-r.left,y=ev.clientY-r.top; if(editor.mode==='add') addTextAt(pageNum,viewport,x,y); else if(editor.mode==='check') addCheckAt(pageNum,viewport,x,y); else selectEdit(null); });
  renderEditsForPage(pageNum,viewport,editLayer); ws.appendChild(section);
}

async function renderFormFields(pdfPage,pageNum,viewport,layer){
  let annotations=[];
  try{ annotations=await pdfPage.getAnnotations({intent:'display'}); }catch(e){ console.warn('Form annotations',e); annotations=[]; }
  const renderedFields=new Set();
  for(const ann of annotations){
    if(ann.subtype!=='Widget' || !ann.fieldName || !ann.rect) continue;
    const rect=viewport.convertToViewportRectangle(ann.rect);
    const left=Math.min(rect[0],rect[2]), top=Math.min(rect[1],rect[3]);
    const width=Math.max(8,Math.abs(rect[2]-rect[0])), height=Math.max(8,Math.abs(rect[3]-rect[1]));
    const current=Object.prototype.hasOwnProperty.call(editor.formValues,ann.fieldName)?editor.formValues[ann.fieldName]:ann.fieldValue;
    let el;
    if(ann.fieldType==='Btn' && (ann.checkBox || (!ann.radioButton && !ann.pushButton))){
      el=document.createElement('input'); el.type='checkbox'; el.className='pdf-form-checkbox';
      el.checked=current===true || (current && current!=='Off' && current!=='/Off');
      el.addEventListener('change',()=>{editor.formValues[ann.fieldName]=el.checked; markDirty();});
    }else if(ann.fieldType==='Tx'){
      el=ann.multiLine?document.createElement('textarea'):document.createElement('input');
      if(el.tagName==='INPUT') el.type='text';
      el.className='pdf-form-text'; el.value=(current??'').toString().replace(/^None$/,'');
      el.spellcheck=false;
      el.addEventListener('input',()=>{editor.formValues[ann.fieldName]=el.value; markDirty();});
    }else if(ann.fieldType==='Ch'){
      el=document.createElement('select'); el.className='pdf-form-select';
      const options=ann.options||[];
      for(const opt of options){ const o=document.createElement('option'); const val=typeof opt==='string'?opt:(opt.exportValue??opt.displayValue??''); o.value=val; o.textContent=typeof opt==='string'?opt:(opt.displayValue??opt.exportValue??''); el.appendChild(o); }
      el.value=(current??'').toString(); el.addEventListener('change',()=>{editor.formValues[ann.fieldName]=el.value; markDirty();});
    }else continue;
    el.dataset.field=ann.fieldName; el.title=ann.alternativeText||ann.fieldName;
    Object.assign(el.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`});
    if(ann.fieldType==='Tx') el.style.fontSize=`${Math.max(8,Math.min(16,height*.58))}px`;
    layer.appendChild(el);
    renderedFields.add(ann.fieldName);
  }

  // Campo invisível multilinha sob "Observações" do Agregado Familiar (página 1).
  // Mantém apenas as linhas originais impressas no PDF; não desenha caixa nem placeholder.
  if(pageNum===1){
    const name='P1_observacoes_agregado';
    if(!renderedFields.has(name)){
      // Coordenadas PDF aproximadas da zona das linhas originais abaixo do título Observações.
      const pdfRect=[54.0,120.0,541.0,286.0];
      const rect=viewport.convertToViewportRectangle(pdfRect);
      const left=Math.min(rect[0],rect[2]), top=Math.min(rect[1],rect[3]);
      const width=Math.max(8,Math.abs(rect[2]-rect[0])), height=Math.max(8,Math.abs(rect[3]-rect[1]));
      const el=document.createElement('textarea');
      el.className='pdf-form-text transparent-notes-field';
      el.value=(editor.formValues[name]??'').toString();
      el.dataset.field=name;
      el.title='Observações do Agregado Familiar';
      el.spellcheck=true;
      el.placeholder='';
      Object.assign(el.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,fontSize:`${Math.max(9,10*editor.scale)}px`});
      el.addEventListener('input',()=>{editor.formValues[name]=el.value; markDirty();});
      layer.appendChild(el);
    }
  }

  // Fallback robusto para as 4 células de Observações da Situação Económica.
  // Alguns viewers/PDF.js podem omitir widgets muito baixos; estas coordenadas
  // vêm do AcroForm do modelo e garantem que continuam sempre editáveis.
  if(pageNum===3){
    const obsFallback=[
      ['P3_texto_092',[141.0,111.36096,509.0,122.21698]],
      ['P3_texto_093',[85.15,95.91095,509.15,106.76697]],
      ['P3_texto_094',[85.15,82.11096,509.15,92.96698]],
      ['P3_texto_095',[85.15,68.310977,509.15,79.16699]],
    ];
    for(const [name,pdfRect] of obsFallback){
      if(renderedFields.has(name)) continue;
      const rect=viewport.convertToViewportRectangle(pdfRect);
      const left=Math.min(rect[0],rect[2]), top=Math.min(rect[1],rect[3]);
      const width=Math.max(8,Math.abs(rect[2]-rect[0])), height=Math.max(8,Math.abs(rect[3]-rect[1]));
      const el=document.createElement('input'); el.type='text'; el.className='pdf-form-text observation-cell';
      el.value=(editor.formValues[name]??'').toString(); el.dataset.field=name; el.title='Observações'; el.spellcheck=false;
      Object.assign(el.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,fontSize:`${Math.max(8,Math.min(16,height*.58))}px`});
      el.addEventListener('input',()=>{editor.formValues[name]=el.value; markDirty();});
      layer.appendChild(el);
    }
  }
}

function viewportRectToPdf(viewport,x,y,w,h){
  const [x1,y1]=viewport.convertToPdfPoint(x,y+h); const [x2,y2]=viewport.convertToPdfPoint(x+w,y); return {x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};
}
function createReplacement(page,viewport,r){
  const pdf=viewportRectToPdf(viewport,r.x,r.y,r.w,r.h);
  const exists=editor.edits.find(e=>e.page===page&&e.kind==='replace'&&Math.abs(e.x-pdf.x)<2&&Math.abs(e.y-pdf.y)<2&&e.original===r.text);
  if(exists){selectEdit(exists.id);return;}
  pushUndo(); const e={id:uid(),kind:'replace',page,...pdf,text:r.text,original:r.text,fontSize:Math.max(7,r.fs/editor.scale),mask:true}; editor.edits.push(e); markDirty(); refreshPage(page,e.id);
}
function addTextAt(page,viewport,x,y){
  pushUndo(); const [px,py]=viewport.convertToPdfPoint(x,y); const e={id:uid(),kind:'text',page,x:px,y:py-3,w:170,h:20,text:'',fontSize:10,mask:false}; editor.edits.push(e); markDirty(); refreshPage(page,e.id);
}
function addCheckAt(page,viewport,x,y){
  pushUndo(); const [px,py]=viewport.convertToPdfPoint(x,y); const e={id:uid(),kind:'check',page,x:px,y:py-4,w:16,h:16,text:'✓',fontSize:13,mask:false}; editor.edits.push(e); markDirty(); refreshPage(page,e.id);
}
function pushUndo(){ editor.undo.push(JSON.stringify(editor.edits)); if(editor.undo.length>40) editor.undo.shift(); }
function undo(){ if(!editor.undo.length)return; editor.edits=JSON.parse(editor.undo.pop()); editor.selectedId=null; markDirty(); renderAll(); }
function deleteSelected(){ if(!editor.selectedId)return; const e=editor.edits.find(x=>x.id===editor.selectedId); if(!e)return; pushUndo(); editor.edits=editor.edits.filter(x=>x.id!==editor.selectedId); editor.selectedId=null; markDirty(); refreshPage(e.page); }
function selectEdit(id){ editor.selectedId=id; document.querySelectorAll('.edit-box').forEach(el=>el.classList.toggle('selected',el.dataset.id===id)); updateChrome(); if(id) setTimeout(()=>document.querySelector(`.edit-box[data-id="${CSS.escape(id)}"] textarea`)?.focus(),0); }
function markDirty(){ editor.dirty=true; updateChrome(); persistSoon(); }

async function refreshPage(page,id){ await renderAll(); if(id) selectEdit(id); }
function renderEditsForPage(page,viewport,layer){
  editor.edits.filter(e=>e.page===page).forEach(e=>{
    const rect=viewport.convertToViewportRectangle([e.x,e.y,e.x+e.w,e.y+e.h]); const left=Math.min(rect[0],rect[2]), top=Math.min(rect[1],rect[3]), width=Math.max(18,Math.abs(rect[2]-rect[0])), height=Math.max(18,Math.abs(rect[3]-rect[1]));
    const box=document.createElement('div'); box.className='edit-box'; box.dataset.id=e.id; Object.assign(box.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`}); if(e.mask) box.classList.add('masked');
    const ta=document.createElement('textarea'); ta.value=e.text; ta.spellcheck=false; ta.style.fontSize=`${Math.max(8,e.fontSize*editor.scale)}px`; ta.rows=1; ta.addEventListener('click',ev=>{ev.stopPropagation();selectEdit(e.id)}); ta.addEventListener('input',()=>{e.text=ta.value;markDirty();}); box.appendChild(ta);
    const resize=document.createElement('span'); resize.className='resize'; box.appendChild(resize);
    box.addEventListener('pointerdown',ev=>{
      if(ev.target===ta)return; ev.stopPropagation(); selectEdit(e.id); const start={cx:ev.clientX,cy:ev.clientY,left,top,width,height}; const resizing=ev.target===resize; box.setPointerCapture(ev.pointerId);
      const move=mv=>{ const dx=mv.clientX-start.cx,dy=mv.clientY-start.cy; if(resizing){box.style.width=`${Math.max(24,start.width+dx)}px`;box.style.height=`${Math.max(18,start.height+dy)}px`;} else {box.style.left=`${start.left+dx}px`;box.style.top=`${start.top+dy}px`;}};
      const up=up=>{ box.removeEventListener('pointermove',move); box.removeEventListener('pointerup',up); const L=parseFloat(box.style.left),T=parseFloat(box.style.top),W=parseFloat(box.style.width),H=parseFloat(box.style.height); const p=viewportRectToPdf(viewport,L,T,W,H); pushUndo(); Object.assign(e,p); markDirty(); };
      box.addEventListener('pointermove',move); box.addEventListener('pointerup',up);
    });
    layer.appendChild(box);
  });
}

async function setZoom(v){ editor.scale=clamp(v,.65,2.5); updateChrome(); if(editor.pdfjs) await renderAll(); persistSoon(); }

async function savePdf(){
  if(!editor.pdfBytes)return; const btn=document.querySelector('#saveBtn'); const old=btn.textContent; btn.disabled=true; btn.textContent='A guardar…';
  try{
    const doc=await PDFDocument.load(editor.pdfBytes,{ignoreEncryption:false});
    const form=doc.getForm();
    const font=await doc.embedFont(StandardFonts.Helvetica);
    // Garante que o campo invisível de Observações da página 1 fica persistente no PDF guardado.
    if(Object.prototype.hasOwnProperty.call(editor.formValues,'P1_observacoes_agregado')){
      try{
        let f=form.getTextField('P1_observacoes_agregado');
      }catch(_){
        const f=form.createTextField('P1_observacoes_agregado');
        f.enableMultiline();
        const pg=doc.getPages()[0];
        f.addToPage(pg,{x:54,y:120,width:487,height:166,borderWidth:0,textColor:rgb(0,0,0),backgroundColor:rgb(1,1,1),borderColor:rgb(1,1,1)});
      }
    }
    for(const [name,value] of Object.entries(editor.formValues)){
      const field=form.getFieldMaybe(name); if(!field) continue;
      try{
        if(field instanceof PDFTextField) field.setText(String(value??''));
        else if(field instanceof PDFCheckBox) value?field.check():field.uncheck();
        else if(field instanceof PDFDropdown || field instanceof PDFOptionList) field.select(String(value??''));
        else if(field instanceof PDFRadioGroup && value) field.select(String(value));
      }catch(err){ console.warn('Campo PDF',name,err); }
    }
    try{ form.updateFieldAppearances(font); }catch(e){ console.warn('Appearances',e); }
    const pages=doc.getPages();
    for(const e of editor.edits){ const p=pages[e.page-1]; if(!p)continue; if(e.mask) p.drawRectangle({x:e.x-1,y:e.y-1,width:e.w+2,height:e.h+2,color:rgb(1,1,1),borderWidth:0});
      const text=e.kind==='check'?'X':String(e.text??''); if(!text)continue; const fs=clamp(Number(e.fontSize)||10,6,36); const maxWidth=Math.max(8,e.w-2); const lines=wrapText(text,font,fs,maxWidth); let yy=e.y+e.h-fs*1.05; for(const line of lines){ if(yy<e.y-fs*.2)break; p.drawText(line,{x:e.x+1,y:yy,size:fs,font,color:rgb(0,0,0)}); yy-=fs*1.18; }
    }
    const out=await doc.save(); editor.pdfBytes=new Uint8Array(out); editor.edits=[]; editor.formValues={}; editor.undo=[]; editor.dirty=false; await dbSet('pdf',editor.pdfBytes); await dbSet('meta',{appSessionVersion:APP_SESSION_VERSION,fileName:editor.fileName,edits:[],formValues:{},scale:editor.scale});
    const savedName=editedFileName(editor.fileName);
    downloadBytes(out,savedName);
    editor.pdfjs=await pdfjsLib.getDocument({data:editor.pdfBytes.slice()}).promise; await renderAll(); updateChrome(); status('PDF guardado. O documento continua aberto e podes continuar a editar.'); btn.textContent='Guardado ✓'; setTimeout(()=>btn.textContent=old,1500);
  }catch(e){console.error(e);alert('Erro ao guardar PDF: '+e.message);status('Erro ao guardar.');}
  finally{btn.disabled=false;}
}

function editedFileName(name='documento.pdf'){
  const base=String(name).replace(/\.pdf$/i,'').replace(/[\/:*?"<>|]+/g,'_').trim()||'documento';
  return `${base}_preenchido.pdf`;
}
async function shareCurrentPdf(){
  if(!editor.pdfBytes)return;
  try{
    const name=editedFileName(editor.fileName);
    if(navigator.share){
      const file=new File([editor.pdfBytes],name,{type:'application/pdf'});
      if(!navigator.canShare || navigator.canShare({files:[file]})){
        await navigator.share({title:'RJP PDF Editor',files:[file]}); return;
      }
    }
    downloadBytes(editor.pdfBytes,name);
  }catch(e){ if(e?.name!=='AbortError'){ console.error(e); alert('Não foi possível partilhar o PDF: '+e.message); } }
}

function wrapText(text,font,size,maxWidth){ const out=[]; for(const para of text.replace(/\r/g,'').split('\n')){ const words=para.split(/\s+/); let line=''; for(const w of words){ const test=line?line+' '+w:w; if(font.widthOfTextAtSize(test,size)<=maxWidth) line=test; else {if(line)out.push(line); line=w;} } out.push(line); } return out; }

async function closePdf(){ if(editor.dirty&&!confirm('Há alterações ainda não guardadas no PDF. Repor a ficha na mesma?'))return; editor.pdfBytes=null;editor.pdfjs=null;editor.edits=[];editor.formValues={};editor.undo=[];editor.selectedId=null;editor.dirty=false;await dbClear(); updateChrome(); await openDefaultTemplate(true); }

async function restore(){
  try{
    const meta=await dbGet('meta'), bytes=await dbGet('pdf');
    // Invalida sessões de versões anteriores para nunca voltar a mostrar a ficha antiga.
    if(meta?.appSessionVersion !== APP_SESSION_VERSION){
      await dbClear();
      await openDefaultTemplate(true);
      return;
    }
    if(bytes&&meta){ editor.edits=meta.edits||[]; editor.formValues=meta.formValues||{}; editor.scale=meta.scale||1.35; editor.dirty=editor.edits.length>0||Object.keys(editor.formValues).length>0; await loadPdf(bytes,meta.fileName||DEFAULT_TEMPLATE_NAME,false); status('Sessão anterior restaurada automaticamente.'); return; }
  }catch(e){console.warn(e);}
  await openDefaultTemplate(true);
}

shell(); bindUI(); initScanner({editor,markDirty,renderAll,status}); setMode('edit'); updateChrome(); restore();
