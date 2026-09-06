import './style.css';
import {
  PDFDocument, StandardFonts, rgb,
  PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const app = document.querySelector('#app');
const APP_SESSION_VERSION = '4.1-font-controls';

const editor = {
  pdfBytes: null,
  pdfjs: null,
  fileName: 'documento.pdf',
  scale: 1.25,
  mode: 'edit',
  edits: [],
  formValues: {},
  formStyles: {},
  selectedFieldName: null,
  undo: [],
  selectedId: null,
  dirty: false,
  detectedLines: {},
};

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

function shell(){
  app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <strong>RJP PDF Editor Universal</strong>
      <span id="docName">Nenhum PDF aberto</span>
    </div>
    <div class="toolbar">
      <label class="button primary">Abrir PDF<input id="fileInput" type="file" accept="application/pdf,.pdf" hidden></label>
      <button id="makeEditableBtn" disabled>⚡ Tornar editável</button>
      <button id="ocrBtn" disabled>OCR páginas digitalizadas</button>
      <button id="ocrSettingsBtn" title="Configuração OCR">⚙ OCR</button>
      <span class="sep"></span>
      <button id="editMode" class="active">Editar texto</button>
      <button id="addMode">Adicionar texto</button>
      <button id="checkMode">✓ Marcar</button>
      <button id="undoBtn">Desfazer</button>
      <button id="deleteBtn" disabled>Apagar</button>
      <span class="sep"></span>
      <label class="font-control" title="Tipo de letra">Fonte
        <select id="fontFamily" disabled>
          <option value="Helvetica">Helvetica / Arial</option>
          <option value="HelveticaBold">Helvetica Negrito</option>
          <option value="HelveticaOblique">Helvetica Itálico</option>
          <option value="TimesRoman">Times Roman</option>
          <option value="TimesRomanBold">Times Negrito</option>
          <option value="TimesRomanItalic">Times Itálico</option>
          <option value="Courier">Courier</option>
          <option value="CourierBold">Courier Negrito</option>
        </select>
      </label>
      <label class="font-control" title="Tamanho da letra">Tamanho
        <input id="fontSize" type="number" min="5" max="72" step="1" value="10" disabled>
      </label>
      <button id="fontSmaller" title="Diminuir letra" disabled>A−</button>
      <button id="fontLarger" title="Aumentar letra" disabled>A+</button>
      <span class="sep"></span>
      <button id="zoomOut">−</button><span id="zoomLabel">125%</span><button id="zoomIn">+</button>
      <span class="sep"></span>
      <button id="saveBtn" class="primary" disabled>Guardar PDF editável</button>
      <button id="shareBtn" disabled>Partilhar</button>
      <button id="closeBtn" disabled>Fechar</button>
    </div>
  </header>
  <div id="status" class="status">Abre qualquer PDF. Texto existente, formulários e PDFs digitalizados podem ser convertidos em campos editáveis.</div>
  <main id="workspace" class="workspace empty">
    <div class="dropzone">
      <div class="dropicon">PDF</div>
      <h2>Abre ou arrasta um PDF</h2>
      <p>PDF normal: clica no texto para editar ou usa “Tornar editável”.<br>PDF digitalizado: usa “OCR páginas digitalizadas”.</p>
    </div>
  </main>`;
}

function bindUI(){
  const input = document.querySelector('#fileInput');
  input.addEventListener('change', e => e.target.files[0] && openFile(e.target.files[0]));
  document.querySelector('#makeEditableBtn').onclick = makeWholePdfEditable;
  document.querySelector('#ocrBtn').onclick = ocrScannedPages;
  document.querySelector('#ocrSettingsBtn').onclick = configureOcr;
  document.querySelector('#editMode').onclick = () => setMode('edit');
  document.querySelector('#addMode').onclick = () => setMode('add');
  document.querySelector('#checkMode').onclick = () => setMode('check');
  document.querySelector('#undoBtn').onclick = undo;
  document.querySelector('#deleteBtn').onclick = deleteSelected;
  document.querySelector('#fontFamily').onchange = e => applyFontFamily(e.target.value);
  document.querySelector('#fontSize').onchange = e => applyFontSize(Number(e.target.value));
  document.querySelector('#fontSize').oninput = e => applyFontSize(Number(e.target.value), true);
  document.querySelector('#fontSmaller').onclick = () => nudgeFontSize(-1);
  document.querySelector('#fontLarger').onclick = () => nudgeFontSize(1);
  document.querySelector('#zoomOut').onclick = () => setZoom(editor.scale - .15);
  document.querySelector('#zoomIn').onclick = () => setZoom(editor.scale + .15);
  document.querySelector('#saveBtn').onclick = savePdf;
  document.querySelector('#shareBtn').onclick = shareCurrentPdf;
  document.querySelector('#closeBtn').onclick = closePdf;

  const ws = document.querySelector('#workspace');
  ['dragenter','dragover'].forEach(ev=>ws.addEventListener(ev,e=>{e.preventDefault();ws.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>ws.addEventListener(ev,e=>{e.preventDefault();ws.classList.remove('drag');}));
  ws.addEventListener('drop', e => {
    const f = [...e.dataTransfer.files].find(f=>f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf'));
    if(f) openFile(f);
  });
  window.addEventListener('keydown', e => {
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault(); if(editor.pdfBytes) savePdf();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault(); undo();}
    if((e.key==='Delete'||e.key==='Backspace') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) deleteSelected();
    if(e.key==='Escape') selectEdit(null);
  });
}

function status(t){ document.querySelector('#status').textContent = t; }
function setMode(mode){
  editor.mode=mode; selectEdit(null);
  ['edit','add','check'].forEach(m=>document.querySelector(`#${m}Mode`)?.classList.toggle('active',m===mode));
  document.querySelector('#workspace').dataset.mode=mode;
  status(mode==='edit'?'Modo editar: clica diretamente num texto existente.':mode==='add'?'Modo adicionar: clica na página para criar um novo campo.':'Modo marcar: clica onde queres adicionar uma marca.');
}
function updateChrome(){
  const has=!!editor.pdfBytes;
  document.querySelector('#docName').textContent=has?`${editor.fileName}${editor.dirty?' • alterado':''}`:'Nenhum PDF aberto';
  ['saveBtn','shareBtn','closeBtn','makeEditableBtn','ocrBtn'].forEach(id=>document.querySelector(`#${id}`).disabled=!has);
  document.querySelector('#deleteBtn').disabled=!editor.selectedId;
  const textTarget = getSelectedTextTarget();
  ['fontFamily','fontSize','fontSmaller','fontLarger'].forEach(id=>{const el=document.querySelector(`#${id}`);if(el)el.disabled=!textTarget;});
  if(textTarget){
    const style=getTargetStyle(textTarget);
    const ff=document.querySelector('#fontFamily'),fs=document.querySelector('#fontSize');
    if(ff)ff.value=style.fontName||'Helvetica';
    if(fs)fs.value=Math.round(style.fontSize||10);
  }
  document.querySelector('#zoomLabel').textContent=`${Math.round(editor.scale*100)}%`;
}

function dbOpen(){
  return new Promise((resolve,reject)=>{const r=indexedDB.open('rjp-pdf-editor-universal',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('session'))r.result.createObjectStore('session');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function dbSet(k,v){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction('session','readwrite');tx.objectStore('session').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
async function dbGet(k){const db=await dbOpen();return new Promise((res,rej)=>{const r=db.transaction('session').objectStore('session').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function dbClear(){const db=await dbOpen();return new Promise((res,rej)=>{const tx=db.transaction('session','readwrite');tx.objectStore('session').clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
let persistTimer;
function persistSoon(){clearTimeout(persistTimer);persistTimer=setTimeout(async()=>{try{await dbSet('meta',{v:APP_SESSION_VERSION,fileName:editor.fileName,edits:editor.edits,formValues:editor.formValues,formStyles:editor.formStyles,scale:editor.scale});if(editor.pdfBytes)await dbSet('pdf',editor.pdfBytes);}catch(e){console.warn(e);}},300);}

async function openFile(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  await loadPdf(bytes,file.name,true);
}
async function loadPdf(bytes,name='documento.pdf',fresh=false){
  try{
    status('A abrir PDF…');
    editor.pdfBytes=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    editor.fileName=name;
    editor.detectedLines={};
    if(fresh){editor.edits=[];editor.formValues={};editor.formStyles={};editor.selectedFieldName=null;editor.undo=[];editor.dirty=false;await dbClear();}
    editor.pdfjs=await pdfjsLib.getDocument({data:editor.pdfBytes.slice()}).promise;
    updateChrome(); await renderAll(); persistSoon();
    const textPages=Object.values(editor.detectedLines).filter(x=>x.length).length;
    status(`PDF aberto: ${editor.pdfjs.numPages} página(s). Texto detetado em ${textPages} página(s).`);
  }catch(e){console.error(e);alert('Não foi possível abrir este PDF: '+e.message);status('Erro ao abrir PDF.');}
}

async function renderAll(){
  const ws=document.querySelector('#workspace');ws.innerHTML='';ws.classList.remove('empty');ws.dataset.mode=editor.mode;
  editor.detectedLines={};
  for(let n=1;n<=editor.pdfjs.numPages;n++) await renderPage(n,ws);
}

function groupTextItems(items,viewport){
  const rows=[];
  for(const item of items){
    if(!item.str?.trim()) continue;
    const tx=pdfjsLib.Util.transform(viewport.transform,item.transform);
    const fs=Math.max(5,Math.hypot(tx[2],tx[3]));
    const x=tx[4], y=tx[5]-fs, w=Math.max(item.width*editor.scale,fs*.5), h=fs*1.18;
    const cy=y+h/2;
    let row=rows.find(r=>Math.abs(r.cy-cy)<Math.max(3,fs*.45));
    if(!row){row={cy,items:[]};rows.push(row);} row.items.push({x,y,w,h,fs,text:item.str});
  }
  return rows.map(r=>{
    r.items.sort((a,b)=>a.x-b.x);
    const x=Math.min(...r.items.map(i=>i.x)), y=Math.min(...r.items.map(i=>i.y));
    const x2=Math.max(...r.items.map(i=>i.x+i.w)), y2=Math.max(...r.items.map(i=>i.y+i.h));
    const text=r.items.map(i=>i.text).join(' ').replace(/\s+/g,' ').trim();
    const fs=r.items.reduce((a,i)=>a+i.fs,0)/r.items.length;
    return {x,y,w:x2-x,h:y2-y,fs,text};
  }).filter(r=>r.text);
}

async function renderPage(pageNum,ws){
  const pdfPage=await editor.pdfjs.getPage(pageNum), viewport=pdfPage.getViewport({scale:editor.scale});
  const section=document.createElement('section');section.className='pdf-page';section.dataset.page=pageNum;section.style.width=`${viewport.width}px`;section.style.height=`${viewport.height}px`;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width*devicePixelRatio);canvas.height=Math.ceil(viewport.height*devicePixelRatio);canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
  await pdfPage.render({canvasContext:canvas.getContext('2d'),viewport,transform:devicePixelRatio!==1?[devicePixelRatio,0,0,devicePixelRatio,0,0]:null,annotationMode:pdfjsLib.AnnotationMode?.DISABLE??0}).promise;
  section.appendChild(canvas);
  const formLayer=document.createElement('div');formLayer.className='form-layer';section.appendChild(formLayer);await renderFormFields(pdfPage,viewport,formLayer);
  const textLayer=document.createElement('div');textLayer.className='text-hit-layer';section.appendChild(textLayer);
  try{
    const tc=await pdfPage.getTextContent();
    const lines=groupTextItems(tc.items,viewport); editor.detectedLines[pageNum]=lines;
    for(const line of lines){
      const b=document.createElement('button');b.type='button';b.className='text-hit';b.title=`Editar: ${line.text}`;Object.assign(b.style,{left:`${line.x}px`,top:`${line.y}px`,width:`${line.w}px`,height:`${line.h}px`});
      b.onclick=ev=>{ev.stopPropagation();if(editor.mode==='edit')createReplacement(pageNum,viewport,line);};textLayer.appendChild(b);
    }
  }catch(e){editor.detectedLines[pageNum]=[];console.warn('Text layer',e);}
  const editLayer=document.createElement('div');editLayer.className='edit-layer';section.appendChild(editLayer);
  section.addEventListener('click',ev=>{if(ev.target!==section&&ev.target!==canvas&&ev.target!==editLayer)return;const r=section.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;if(editor.mode==='add')addTextAt(pageNum,viewport,x,y);else if(editor.mode==='check')addCheckAt(pageNum,viewport,x,y);else selectEdit(null);});
  renderEditsForPage(pageNum,viewport,editLayer);ws.appendChild(section);
}

async function renderFormFields(pdfPage,viewport,layer){
  let annotations=[];try{annotations=await pdfPage.getAnnotations({intent:'display'});}catch(e){console.warn(e);}
  for(const ann of annotations){
    if(ann.subtype!=='Widget'||!ann.fieldName||!ann.rect)continue;
    const rect=viewport.convertToViewportRectangle(ann.rect),left=Math.min(rect[0],rect[2]),top=Math.min(rect[1],rect[3]),width=Math.max(8,Math.abs(rect[2]-rect[0])),height=Math.max(8,Math.abs(rect[3]-rect[1]));
    const current=Object.prototype.hasOwnProperty.call(editor.formValues,ann.fieldName)?editor.formValues[ann.fieldName]:ann.fieldValue;
    let el;
    if(ann.fieldType==='Btn'&&(ann.checkBox||(!ann.radioButton&&!ann.pushButton))){el=document.createElement('input');el.type='checkbox';el.className='pdf-form-checkbox';el.checked=current===true||(current&&current!=='Off'&&current!=='/Off');el.onchange=()=>{editor.formValues[ann.fieldName]=el.checked;markDirty();};}
    else if(ann.fieldType==='Tx'){el=ann.multiLine?document.createElement('textarea'):document.createElement('input');if(el.tagName==='INPUT')el.type='text';el.className='pdf-form-text';el.value=(current??'').toString().replace(/^None$/,'');el.spellcheck=false;const detectedSize=Number(ann.defaultAppearanceData?.fontSize)||Math.max(6,Math.min(36,(height/editor.scale)*.58));if(!editor.formStyles[ann.fieldName])editor.formStyles[ann.fieldName]={fontSize:detectedSize,fontName:'Helvetica'};el.oninput=()=>{editor.formValues[ann.fieldName]=el.value;markDirty();};el.onfocus=()=>selectFormField(ann.fieldName,el);el.onclick=()=>selectFormField(ann.fieldName,el);}
    else if(ann.fieldType==='Ch'){el=document.createElement('select');el.className='pdf-form-select';for(const opt of ann.options||[]){const o=document.createElement('option'),val=typeof opt==='string'?opt:(opt.exportValue??opt.displayValue??'');o.value=val;o.textContent=typeof opt==='string'?opt:(opt.displayValue??opt.exportValue??'');el.appendChild(o);}el.value=(current??'').toString();el.onchange=()=>{editor.formValues[ann.fieldName]=el.value;markDirty();};}
    else continue;
    el.dataset.field=ann.fieldName;el.title=ann.alternativeText||ann.fieldName;Object.assign(el.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`});if(ann.fieldType==='Tx'){const st=editor.formStyles[ann.fieldName]||{};applyPreviewFont(el,st.fontName||'Helvetica',st.fontSize||10);}layer.appendChild(el);
  }
}

function viewportRectToPdf(viewport,x,y,w,h){const [x1,y1]=viewport.convertToPdfPoint(x,y+h),[x2,y2]=viewport.convertToPdfPoint(x+w,y);return{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};}
function createReplacement(page,viewport,r){const pdf=viewportRectToPdf(viewport,r.x,r.y,r.w,r.h);const exists=editor.edits.find(e=>e.page===page&&e.kind==='replace'&&Math.abs(e.x-pdf.x)<2&&Math.abs(e.y-pdf.y)<2);if(exists){selectEdit(exists.id);return;}pushUndo();const e={id:uid(),kind:'replace',page,...pdf,text:r.text,original:r.text,fontSize:Math.max(6,r.fs/editor.scale),fontName:'Helvetica',mask:true};editor.edits.push(e);markDirty();refreshPage(page,e.id);}
function addTextAt(page,viewport,x,y){pushUndo();const [px,py]=viewport.convertToPdfPoint(x,y);editor.edits.push({id:uid(),kind:'text',page,x:px,y:py-3,w:180,h:22,text:'',fontSize:10,fontName:'Helvetica',mask:false});markDirty();refreshPage(page,editor.edits.at(-1).id);}
function addCheckAt(page,viewport,x,y){pushUndo();const [px,py]=viewport.convertToPdfPoint(x,y);editor.edits.push({id:uid(),kind:'check',page,x:px,y:py-4,w:15,h:15,text:'X',fontSize:12,fontName:'HelveticaBold',mask:false});markDirty();refreshPage(page,editor.edits.at(-1).id);}
function pushUndo(){editor.undo.push(JSON.stringify(editor.edits));if(editor.undo.length>30)editor.undo.shift();}
function undo(){if(!editor.undo.length)return;editor.edits=JSON.parse(editor.undo.pop());editor.selectedId=null;markDirty();renderAll();}
function deleteSelected(){if(!editor.selectedId)return;const e=editor.edits.find(x=>x.id===editor.selectedId);if(!e)return;pushUndo();editor.edits=editor.edits.filter(x=>x.id!==editor.selectedId);editor.selectedId=null;markDirty();refreshPage(e.page);}
function selectEdit(id){editor.selectedId=id;editor.selectedFieldName=null;document.querySelectorAll('.edit-box').forEach(el=>el.classList.toggle('selected',el.dataset.id===id));document.querySelectorAll('.pdf-form-text.selected-field').forEach(el=>el.classList.remove('selected-field'));updateChrome();if(id)setTimeout(()=>document.querySelector(`.edit-box[data-id="${CSS.escape(id)}"] textarea`)?.focus(),0);}
function selectFormField(name,el){
  editor.selectedId=null;editor.selectedFieldName=name;
  document.querySelectorAll('.edit-box.selected').forEach(x=>x.classList.remove('selected'));
  document.querySelectorAll('.pdf-form-text.selected-field').forEach(x=>x.classList.remove('selected-field'));
  if(el)el.classList.add('selected-field');
  updateChrome();
}
function getSelectedTextTarget(){
  if(editor.selectedId){const e=editor.edits.find(x=>x.id===editor.selectedId);if(e&&e.kind!=='check')return {type:'edit',edit:e};}
  if(editor.selectedFieldName)return {type:'form',name:editor.selectedFieldName};
  return null;
}
function getTargetStyle(target){
  if(target?.type==='edit')return {fontSize:Number(target.edit.fontSize)||10,fontName:target.edit.fontName||'Helvetica'};
  if(target?.type==='form')return editor.formStyles[target.name]||{fontSize:10,fontName:'Helvetica'};
  return {fontSize:10,fontName:'Helvetica'};
}
function cssFontSpec(name='Helvetica'){
  const map={
    Helvetica:['Arial, Helvetica, sans-serif','400','normal'],HelveticaBold:['Arial, Helvetica, sans-serif','700','normal'],HelveticaOblique:['Arial, Helvetica, sans-serif','400','italic'],HelveticaBoldOblique:['Arial, Helvetica, sans-serif','700','italic'],
    TimesRoman:['"Times New Roman", Times, serif','400','normal'],TimesRomanBold:['"Times New Roman", Times, serif','700','normal'],TimesRomanItalic:['"Times New Roman", Times, serif','400','italic'],TimesRomanBoldItalic:['"Times New Roman", Times, serif','700','italic'],
    Courier:['"Courier New", Courier, monospace','400','normal'],CourierBold:['"Courier New", Courier, monospace','700','normal'],CourierOblique:['"Courier New", Courier, monospace','400','italic']
  };return map[name]||map.Helvetica;
}
function applyPreviewFont(el,name,size){const [family,weight,style]=cssFontSpec(name);el.style.fontFamily=family;el.style.fontWeight=weight;el.style.fontStyle=style;if(size)el.style.fontSize=`${Math.max(5,size)*editor.scale}px`;}
function applyFontFamily(name){const t=getSelectedTextTarget();if(!t)return;if(t.type==='edit'){t.edit.fontName=name;const ta=document.querySelector(`.edit-box[data-id="${CSS.escape(t.edit.id)}"] textarea`);if(ta)applyPreviewFont(ta,name,t.edit.fontSize);}else{const st=editor.formStyles[t.name]||(editor.formStyles[t.name]={fontSize:10,fontName:'Helvetica'});st.fontName=name;const el=document.querySelector(`.pdf-form-text[data-field="${CSS.escape(t.name)}"]`);if(el)applyPreviewFont(el,name,st.fontSize);}markDirty();updateChrome();}
function applyFontSize(size,live=false){size=clamp(Number(size)||10,5,72);const t=getSelectedTextTarget();if(!t)return;if(t.type==='edit'){t.edit.fontSize=size;const ta=document.querySelector(`.edit-box[data-id="${CSS.escape(t.edit.id)}"] textarea`);if(ta){applyPreviewFont(ta,t.edit.fontName||'Helvetica',size);ta.style.fontSize=`${Math.max(8,size*editor.scale)}px`;}}else{const st=editor.formStyles[t.name]||(editor.formStyles[t.name]={fontSize:10,fontName:'Helvetica'});st.fontSize=size;const el=document.querySelector(`.pdf-form-text[data-field="${CSS.escape(t.name)}"]`);if(el)applyPreviewFont(el,st.fontName||'Helvetica',size);}markDirty();if(!live)updateChrome();}
function nudgeFontSize(delta){const t=getSelectedTextTarget();if(!t)return;const st=getTargetStyle(t);applyFontSize((Number(st.fontSize)||10)+delta);}
function standardFontKey(name='Helvetica'){
  const map={Helvetica:StandardFonts.Helvetica,HelveticaBold:StandardFonts.HelveticaBold,HelveticaOblique:StandardFonts.HelveticaOblique,HelveticaBoldOblique:StandardFonts.HelveticaBoldOblique,TimesRoman:StandardFonts.TimesRoman,TimesRomanBold:StandardFonts.TimesRomanBold,TimesRomanItalic:StandardFonts.TimesRomanItalic,TimesRomanBoldItalic:StandardFonts.TimesRomanBoldItalic,Courier:StandardFonts.Courier,CourierBold:StandardFonts.CourierBold,CourierOblique:StandardFonts.CourierOblique};return map[name]||StandardFonts.Helvetica;
}
function markDirty(){editor.dirty=true;updateChrome();persistSoon();}
async function refreshPage(page,id){await renderAll();if(id)selectEdit(id);}
function renderEditsForPage(page,viewport,layer){
  editor.edits.filter(e=>e.page===page).forEach(e=>{const rect=viewport.convertToViewportRectangle([e.x,e.y,e.x+e.w,e.y+e.h]),left=Math.min(rect[0],rect[2]),top=Math.min(rect[1],rect[3]),width=Math.max(18,Math.abs(rect[2]-rect[0])),height=Math.max(18,Math.abs(rect[3]-rect[1]));const box=document.createElement('div');box.className='edit-box';box.dataset.id=e.id;Object.assign(box.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`});if(e.mask)box.classList.add('masked');const ta=document.createElement('textarea');ta.value=e.text;ta.spellcheck=false;applyPreviewFont(ta,e.fontName||'Helvetica',Math.max(5,e.fontSize||10));ta.style.fontSize=`${Math.max(8,(e.fontSize||10)*editor.scale)}px`;ta.rows=1;ta.onclick=ev=>{ev.stopPropagation();selectEdit(e.id)};ta.oninput=()=>{e.text=ta.value;markDirty();};box.appendChild(ta);const resize=document.createElement('span');resize.className='resize';box.appendChild(resize);box.addEventListener('pointerdown',ev=>{if(ev.target===ta)return;ev.stopPropagation();selectEdit(e.id);const start={cx:ev.clientX,cy:ev.clientY,left,top,width,height},resizing=ev.target===resize;box.setPointerCapture(ev.pointerId);const move=mv=>{const dx=mv.clientX-start.cx,dy=mv.clientY-start.cy;if(resizing){box.style.width=`${Math.max(24,start.width+dx)}px`;box.style.height=`${Math.max(18,start.height+dy)}px`;}else{box.style.left=`${start.left+dx}px`;box.style.top=`${start.top+dy}px`;}};const up=()=>{box.removeEventListener('pointermove',move);box.removeEventListener('pointerup',up);const p=viewportRectToPdf(viewport,parseFloat(box.style.left),parseFloat(box.style.top),parseFloat(box.style.width),parseFloat(box.style.height));pushUndo();Object.assign(e,p);markDirty();};box.addEventListener('pointermove',move);box.addEventListener('pointerup',up);});layer.appendChild(box);});
}

async function makeWholePdfEditable(){
  if(!editor.pdfjs)return;
  const total=Object.values(editor.detectedLines).reduce((a,b)=>a+b.length,0);
  if(!total){alert('Este PDF parece ser digitalizado. Usa “OCR páginas digitalizadas”.');return;}
  if(total>500 && !confirm(`Foram detetadas ${total} linhas de texto. Criar muitos campos pode tornar o PDF pesado. Continuar?`))return;
  pushUndo(); let added=0;
  for(let page=1;page<=editor.pdfjs.numPages;page++){
    const pdfPage=await editor.pdfjs.getPage(page),viewport=pdfPage.getViewport({scale:editor.scale});
    for(const line of editor.detectedLines[page]||[]){
      const pdf=viewportRectToPdf(viewport,line.x,line.y,line.w,line.h);
      const exists=editor.edits.some(e=>e.page===page&&e.kind==='replace'&&Math.abs(e.x-pdf.x)<2&&Math.abs(e.y-pdf.y)<2);
      if(!exists){editor.edits.push({id:uid(),kind:'replace',page,...pdf,text:line.text,original:line.text,fontSize:Math.max(6,line.fs/editor.scale),mask:true});added++;}
    }
  }
  if(added){markDirty();await renderAll();status(`${added} campos editáveis criados. Revê e guarda como PDF editável.`);}else status('O texto já estava convertido em campos editáveis.');
}

function getOcrSettings(){
  return {endpoint:localStorage.getItem('rjp_ocr_endpoint')||'',token:localStorage.getItem('rjp_ocr_token')||''};
}
async function configureOcr(){
  const cur=getOcrSettings();
  const endpoint=prompt('Endpoint OCR Pro (/exec):',cur.endpoint);if(endpoint===null)return;
  const token=prompt('Token do proxy:',cur.token);if(token===null)return;
  localStorage.setItem('rjp_ocr_endpoint',endpoint.trim());localStorage.setItem('rjp_ocr_token',token.trim());status('Configuração OCR guardada neste computador.');
}
async function callOcr(dataUrl){
  const {endpoint,token}=getOcrSettings();if(!endpoint)throw new Error('Configura primeiro o endpoint OCR no botão ⚙ OCR.');
  const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,imageBase64:dataUrl.split(',')[1],mimeType:'image/jpeg',languageHints:['pt','pt-PT'],mode:'document'})});
  const data=await res.json().catch(()=>({error:`Resposta inválida HTTP ${res.status}`}));if(data.error)throw new Error(typeof data.error==='string'?data.error:JSON.stringify(data.error));return data;
}
function paragraphBoxesFromVision(full){
  const out=[];
  for(const p of full?.pages||[])for(const b of p.blocks||[])for(const para of b.paragraphs||[]){
    const words=[];for(const w of para.words||[]){let s='';for(const sym of w.symbols||[])s+=sym.text||'';if(s)words.push(s);}const text=words.join(' ').trim();if(!text)continue;
    const v=para.boundingBox?.vertices||[];if(v.length<2)continue;const xs=v.map(x=>x.x||0),ys=v.map(x=>x.y||0);out.push({text,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)});
  }
  return out;
}
async function ocrScannedPages(){
  if(!editor.pdfjs)return;const {endpoint}=getOcrSettings();if(!endpoint){await configureOcr();if(!getOcrSettings().endpoint)return;}
  let added=0;pushUndo();
  try{
    for(let page=1;page<=editor.pdfjs.numPages;page++){
      if((editor.detectedLines[page]||[]).length)continue;
      status(`OCR: página ${page}/${editor.pdfjs.numPages}…`);
      const pg=await editor.pdfjs.getPage(page),vp=pg.getViewport({scale:2.5}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      const data=await callOcr(c.toDataURL('image/jpeg',.95));const boxes=paragraphBoxesFromVision(data.fullTextAnnotation);
      const pdfVp=pg.getViewport({scale:2.5});
      for(const b of boxes){const pdf=viewportRectToPdf(pdfVp,b.x,b.y,b.w,b.h);editor.edits.push({id:uid(),kind:'replace',page,...pdf,text:b.text,original:b.text,fontSize:Math.max(7,(b.h/2.5)*.6),fontName:'Helvetica',mask:true});added++;}
    }
    if(added){markDirty();await renderAll();status(`OCR concluído: ${added} blocos convertidos em campos editáveis.`);}else status('Não foram encontradas páginas digitalizadas sem texto.');
  }catch(e){console.error(e);alert('OCR falhou: '+e.message);status('Erro no OCR.');}
}

async function setZoom(v){editor.scale=clamp(v,.6,2.5);updateChrome();if(editor.pdfjs)await renderAll();persistSoon();}
function pdfSafeText(value=''){return String(value??'').replace(/[☑☒✓✔]/g,'X').replace(/[☐□]/g,'').replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...').normalize('NFKC').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,'');}

async function savePdf(){
  if(!editor.pdfBytes)return;const btn=document.querySelector('#saveBtn'),old=btn.textContent;btn.disabled=true;btn.textContent='A guardar…';
  try{
    const doc=await PDFDocument.load(editor.pdfBytes,{ignoreEncryption:false}),form=doc.getForm(),pages=doc.getPages();const embeddedFonts={};const getFont=async(name='Helvetica')=>embeddedFonts[name]||(embeddedFonts[name]=await doc.embedFont(standardFontKey(name)));const defaultFont=await getFont('Helvetica');
    const styledNames=new Set([...Object.keys(editor.formValues),...Object.keys(editor.formStyles)]);
    for(const name of styledNames){
      const field=form.getFieldMaybe(name);if(!field)continue;const hasValue=Object.prototype.hasOwnProperty.call(editor.formValues,name),value=editor.formValues[name];try{if(field instanceof PDFTextField){if(hasValue)field.setText(pdfSafeText(value));const st=editor.formStyles[name];if(st){try{field.setFontSize(clamp(Number(st.fontSize)||10,5,72));}catch(_){ }try{field.updateAppearances(await getFont(st.fontName||'Helvetica'));}catch(err){console.warn('aparência campo',name,err);}}}else if(hasValue&&field instanceof PDFCheckBox)value?field.check():field.uncheck();else if(hasValue&&(field instanceof PDFDropdown||field instanceof PDFOptionList))field.select(pdfSafeText(value));else if(hasValue&&field instanceof PDFRadioGroup&&value)field.select(pdfSafeText(value));}catch(e){console.warn(name,e);}
    }
    for(const e of editor.edits){
      const p=pages[e.page-1];if(!p)continue;
      const safe=pdfSafeText(e.kind==='check'?'X':e.text),fieldName=`RJP_${e.kind}_${e.id.replace(/[^a-zA-Z0-9]/g,'')}`;
      if(e.mask)p.drawRectangle({x:e.x-1,y:e.y-1,width:e.w+2,height:e.h+2,color:rgb(1,1,1),borderWidth:0});
      if(e.kind==='check'){
        try{const cb=form.createCheckBox(fieldName);cb.addToPage(p,{x:e.x,y:e.y,width:Math.max(10,e.w),height:Math.max(10,e.h),borderWidth:0});cb.check();}catch(err){console.warn('checkbox',err);}
      }else{
        try{
          const f=form.createTextField(fieldName);if(e.h>(e.fontSize||10)*1.8||safe.includes('\n'))f.enableMultiline();f.setText(safe);try{f.setFontSize(clamp(Number(e.fontSize)||10,5,72));}catch(_){ }
          const opts={x:e.x,y:e.y,width:Math.max(12,e.w),height:Math.max(12,e.h),borderWidth:0,textColor:rgb(0,0,0)};if(e.mask)opts.backgroundColor=rgb(1,1,1);f.addToPage(p,opts);try{f.updateAppearances(await getFont(e.fontName||'Helvetica'));}catch(err){console.warn('fonte campo',err);}
        }catch(err){console.warn('campo editável',err);}
      }
    }
    try{
      for(const fld of form.getFields()){
        if(fld instanceof PDFTextField){
          const n=fld.getName();
          if(!editor.formStyles[n]){try{fld.updateAppearances(defaultFont);}catch(_){}}
        }
      }
    }catch(e){console.warn('appearances',e);}
    const out=await doc.save();editor.pdfBytes=new Uint8Array(out);editor.edits=[];editor.formValues={};editor.formStyles={};editor.selectedFieldName=null;editor.undo=[];editor.dirty=false;await dbSet('pdf',editor.pdfBytes);await dbSet('meta',{v:APP_SESSION_VERSION,fileName:editor.fileName,edits:[],formValues:{},formStyles:{},scale:editor.scale});
    const name=editedFileName(editor.fileName);downloadBytes(out,name);editor.pdfjs=await pdfjsLib.getDocument({data:editor.pdfBytes.slice()}).promise;await renderAll();updateChrome();status('PDF editável guardado. Os campos permanecem editáveis quando voltares a abrir o ficheiro.');btn.textContent='Guardado ✓';setTimeout(()=>btn.textContent=old,1500);
  }catch(e){console.error(e);alert('Erro ao guardar PDF: '+e.message);status('Erro ao guardar.');}finally{btn.disabled=false;}
}
function downloadBytes(bytes,name='documento.pdf'){const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),blob=new Blob([data],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function editedFileName(name='documento.pdf'){const base=String(name).replace(/\.pdf$/i,'').replace(/[\\/:*?"<>|]+/g,'_').trim()||'documento';return `${base}_EDITAVEL.pdf`;}
async function shareCurrentPdf(){if(!editor.pdfBytes)return;try{const name=editedFileName(editor.fileName);if(navigator.share){const file=new File([editor.pdfBytes],name,{type:'application/pdf'});if(!navigator.canShare||navigator.canShare({files:[file]})){await navigator.share({title:'RJP PDF Editor Universal',files:[file]});return;}}downloadBytes(editor.pdfBytes,name);}catch(e){if(e?.name!=='AbortError')alert('Não foi possível partilhar: '+e.message);}}
async function closePdf(){if(editor.dirty&&!confirm('Há alterações não guardadas. Fechar mesmo assim?'))return;editor.pdfBytes=null;editor.pdfjs=null;editor.edits=[];editor.formValues={};editor.formStyles={};editor.undo=[];editor.selectedId=null;editor.selectedFieldName=null;editor.dirty=false;editor.detectedLines={};await dbClear();document.querySelector('#workspace').innerHTML='<div class="dropzone"><div class="dropicon">PDF</div><h2>Abre ou arrasta um PDF</h2><p>PDF normal: usa “Tornar editável”. PDF digitalizado: usa OCR.</p></div>';document.querySelector('#workspace').classList.add('empty');updateChrome();status('Nenhum PDF aberto.');}
async function restore(){try{const meta=await dbGet('meta'),bytes=await dbGet('pdf');if(meta?.v===APP_SESSION_VERSION&&bytes){editor.edits=meta.edits||[];editor.formValues=meta.formValues||{};editor.formStyles=meta.formStyles||{};editor.scale=meta.scale||1.25;editor.dirty=editor.edits.length>0||Object.keys(editor.formValues).length>0||Object.keys(editor.formStyles).length>0;await loadPdf(bytes,meta.fileName||'documento.pdf',false);status('Sessão anterior restaurada.');return;}await dbClear();}catch(e){console.warn(e);}}

shell();bindUI();setMode('edit');updateChrome();restore();
