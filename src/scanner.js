import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

const scan = {
  pages: [],
  active: 0,
  preset: 'handwriting',
  resultText: '',
  confidence: null,
  worker: null,
  busy: false,
};

const FIELD_MAP = {
  nome: 'P1_texto_010',
  dataNascimento: ['P1_texto_011'],
  naturalidade: 'P1_texto_012',
  biCc: 'P1_texto_013',
  arquivo: 'P1_texto_015',
  estadoCivil: 'P1_texto_016',
  nacionalidade: 'P1_texto_017',
  beneficiario: 'P1_texto_018',
  contribuinte: 'P1_texto_019',
  morada: 'P1_texto_020',
  codigoPostal1: 'P1_texto_021',
  codigoPostal2: 'P1_texto_022',
  localidade: 'P1_texto_023',
  contactos: 'P1_texto_024',
};

function e(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function modal(){
  if(document.querySelector('#scannerModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div id="scannerModal" class="scanner-modal" hidden>
    <div class="scanner-panel">
      <header class="scanner-head"><div><strong>RJP Scanner Pro</strong><small>Digitalização + OCR de fichas manuscritas</small></div><button id="scanClose" aria-label="Fechar">✕</button></header>
      <div class="scanner-actions">
        <label class="button primary">📥 Importar ficheiros<input id="scanFiles" type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp" multiple hidden></label>
        <label class="button">📁 Importar pasta<input id="scanFolder" type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp" webkitdirectory directory multiple hidden></label>
        <label class="button">📷 Fotografar<input id="scanCamera" type="file" accept="image/*" capture="environment" hidden></label>
        <button id="scanRotate">↻ Rodar</button>
        <button id="scanAutoCrop">✂ Auto recorte</button>
        <select id="scanPreset"><option value="handwriting">Manuscrito</option><option value="document">Documento</option><option value="photo">Fotografia</option></select>
        <button id="scanEnhance">✨ Melhorar</button>
        <span class="sep"></span>
        <button id="scanOcr" class="primary">OCR Local</button>
        <button id="scanOcrPro">OCR Pro</button>
        <button id="scanSettings">⚙ OCR Pro</button>
      </div>
      <div id="scanStatus" class="scanner-status scan-dropzone">Arrasta para aqui PDFs ou imagens digitalizadas, ou usa “Importar ficheiros”.</div>
      <div class="scanner-body">
        <aside><div id="scanThumbs" class="scan-thumbs"></div></aside>
        <section class="scan-stage"><canvas id="scanCanvas"></canvas><div class="scan-hint">Dica: fotografa a folha direita, sem sombras e ocupando quase todo o enquadramento.</div></section>
        <section class="ocr-review">
          <div class="review-head"><strong>Texto reconhecido</strong><span id="scanConfidence"></span></div>
          <textarea id="scanText" spellcheck="false" placeholder="O texto reconhecido aparece aqui para revisão antes de preencher a ficha."></textarea>
          <div id="scanExtracted" class="extracted"></div>
          <div class="review-buttons"><button id="scanExtract">Extrair campos</button><button id="scanFill" class="primary">Preencher ficha atual</button><button id="scanCopy">Copiar texto</button></div>
        </section>
      </div>
    </div>
  </div>
  <dialog id="ocrSettingsDialog" class="ocr-dialog">
    <form method="dialog"><h3>OCR Pro — endpoint seguro</h3><p>Para manuscritos difíceis, podes ligar um proxy Google Cloud Vision/Document AI. A chave fica no servidor, nunca no GitHub.</p>
      <label>Endpoint<input id="ocrEndpoint" placeholder="https://script.google.com/macros/s/.../exec"></label>
      <label>Token do proxy<input id="ocrToken" type="password" autocomplete="off"></label>
      <div class="dialog-actions"><button value="cancel">Cancelar</button><button id="ocrSaveSettings" value="default" class="primary">Guardar</button></div>
    </form>
  </dialog>`);
}

function setStatus(t){const n=document.querySelector('#scanStatus');if(n)n.textContent=t;}
function dataUrlFromBlob(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
function imageFromUrl(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});}
async function canvasToBlob(canvas,type='image/jpeg',quality=.94){return new Promise(r=>canvas.toBlob(r,type,quality));}

async function fileToPages(file){
  if(file.type==='application/pdf'||file.name?.toLowerCase().endsWith('.pdf')){
    const bytes=new Uint8Array(await file.arrayBuffer());
    const doc=await pdfjsLib.getDocument({data:bytes}).promise; const out=[];
    for(let p=1;p<=doc.numPages;p++){
      const pg=await doc.getPage(p), vp=pg.getViewport({scale:2}); const c=document.createElement('canvas'); c.width=vp.width;c.height=vp.height;
      await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      out.push({id:crypto.randomUUID(),name:`${file.name} — pág. ${p}`,dataUrl:c.toDataURL('image/jpeg',.95),rotation:0,enhanced:false});
    } return out;
  }
  return [{id:crypto.randomUUID(),name:file.name||'Fotografia',dataUrl:await dataUrlFromBlob(file),rotation:0,enhanced:false}];
}

async function drawActive(){
  const p=scan.pages[scan.active], c=document.querySelector('#scanCanvas'); if(!p||!c){return;}
  const img=await imageFromUrl(p.dataUrl); const rot=((p.rotation%360)+360)%360; const swap=rot===90||rot===270;
  c.width=swap?img.naturalHeight:img.naturalWidth;c.height=swap?img.naturalWidth:img.naturalHeight;
  const x=c.getContext('2d');x.save();x.translate(c.width/2,c.height/2);x.rotate(rot*Math.PI/180);x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);x.restore();
  renderThumbs();
}
function renderThumbs(){
  const n=document.querySelector('#scanThumbs'); if(!n)return;n.innerHTML=scan.pages.map((p,i)=>`<button class="scan-thumb ${i===scan.active?'active':''}" data-i="${i}"><img src="${p.dataUrl}"><span>${i+1}</span></button>`).join('');
  n.querySelectorAll('.scan-thumb').forEach(b=>b.onclick=()=>{scan.active=Number(b.dataset.i);drawActive();});
}
async function addFiles(files){
  setStatus('A importar páginas…');
  for(const f of files) scan.pages.push(...await fileToPages(f));
  if(scan.pages.length){scan.active=scan.pages.length-1;await drawActive();setStatus(`${scan.pages.length} página(s) pronta(s). Escolhe “Melhorar” e depois OCR.`);}
}

function otsu(data){
  const hist=new Uint32Array(256);for(let i=0;i<data.length;i+=4){const y=(.299*data[i]+.587*data[i+1]+.114*data[i+2])|0;hist[y]++;}
  const total=data.length/4;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,max=0,t=127;
  for(let i=0;i<256;i++){wB+=hist[i];if(!wB)continue;const wF=total-wB;if(!wF)break;sB+=i*hist[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)**2;if(v>max){max=v;t=i;}}return t;
}
function applyPreset(c,preset){
  const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;
  if(preset==='photo'){for(let i=0;i<d.length;i+=4){for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,(d[i+k]-128)*1.12+138));}}
  else {const t=otsu(d);for(let i=0;i<d.length;i+=4){let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(preset==='handwriting'){y=(y-128)*1.55+145;y=y<t*1.08?0:255;}else{y=(y-128)*1.3+140;y=y<t?18:250;}d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,y));}}
  x.putImageData(im,0,0);
}
function autoCropCanvas(c){
  const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;let minX=c.width,minY=c.height,maxX=0,maxY=0,hit=0;
  const step=Math.max(2,Math.floor(Math.min(c.width,c.height)/800));
  for(let y=0;y<c.height;y+=step)for(let xx=0;xx<c.width;xx+=step){const i=(y*c.width+xx)*4,lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(lum<225){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y);hit++;}}
  if(hit<100)return false;const mx=(maxX-minX)*.035,my=(maxY-minY)*.035;minX=Math.max(0,minX-mx);minY=Math.max(0,minY-my);maxX=Math.min(c.width,maxX+mx);maxY=Math.min(c.height,maxY+my);
  if((maxX-minX)*(maxY-minY)<c.width*c.height*.25)return false;const tmp=document.createElement('canvas');tmp.width=maxX-minX;tmp.height=maxY-minY;tmp.getContext('2d').drawImage(c,minX,minY,tmp.width,tmp.height,0,0,tmp.width,tmp.height);c.width=tmp.width;c.height=tmp.height;c.getContext('2d').drawImage(tmp,0,0);return true;
}
async function commitCanvas(){const c=document.querySelector('#scanCanvas'),p=scan.pages[scan.active];if(!p)return;p.dataUrl=c.toDataURL('image/jpeg',.96);p.rotation=0;p.enhanced=true;renderThumbs();}

async function runLocalOcr(){
  if(!scan.pages.length)return; if(scan.busy)return;scan.busy=true;const btn=document.querySelector('#scanOcr');btn.disabled=true;
  try{
    if(!scan.worker){setStatus('A iniciar OCR português… na primeira utilização pode descarregar o modelo linguístico.');scan.worker=await createWorker('por');}
    let all='',weighted=0,count=0;
    for(let i=0;i<scan.pages.length;i++){
      scan.active=i;await drawActive();setStatus(`OCR local: página ${i+1}/${scan.pages.length}…`);
      const c=document.querySelector('#scanCanvas');const r=await scan.worker.recognize(c);all+=(i?`\n\n--- PÁGINA ${i+1} ---\n`:'')+(r.data.text||'');weighted+=(r.data.confidence||0);count++;
    }
    scan.resultText=all.trim();scan.confidence=count?weighted/count:null;document.querySelector('#scanText').value=scan.resultText;document.querySelector('#scanConfidence').textContent=scan.confidence!=null?`Confiança média ${scan.confidence.toFixed(0)}%`:'';extractAndShow();setStatus('OCR concluído. Revê o texto antes de preencher a ficha.');
  }catch(err){console.error(err);setStatus('Falha no OCR local: '+err.message);alert('OCR local falhou. Para manuscritos difíceis, configura OCR Pro.');}
  finally{scan.busy=false;btn.disabled=false;}
}
async function runProOcr(){
  if(!scan.pages.length)return;const endpoint=localStorage.getItem('rjp.ocr.endpoint')||'',token=localStorage.getItem('rjp.ocr.token')||'';if(!endpoint){openSettings();return;}
  try{scan.busy=true;let all='';for(let i=0;i<scan.pages.length;i++){scan.active=i;await drawActive();setStatus(`OCR Pro: página ${i+1}/${scan.pages.length}…`);const c=document.querySelector('#scanCanvas');const dataUrl=c.toDataURL('image/jpeg',.92);const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,imageBase64:dataUrl.split(',')[1],mimeType:'image/jpeg',languageHints:['pt']})});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(data.error)throw new Error(data.error);all+=(i?`\n\n--- PÁGINA ${i+1} ---\n`:'')+(data.text||'');}scan.resultText=all.trim();document.querySelector('#scanText').value=scan.resultText;document.querySelector('#scanConfidence').textContent='OCR Pro';extractAndShow();setStatus('OCR Pro concluído. Revê os dados reconhecidos.');}catch(err){console.error(err);alert('OCR Pro: '+err.message);setStatus('Falha no OCR Pro.');}finally{scan.busy=false;}
}
function lineValue(text,label,nextLabels=[]){
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const stop=nextLabels.length?`(?=${nextLabels.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}|$)`:'$';const m=text.match(new RegExp(`${escaped}\\s*[:\-]?\\s*([^\\n]{1,160}?)${stop}`,'i'));return m?.[1]?.replace(/[_]{2,}/g,' ').trim()||'';
}
function extractFields(text){
  const clean=text.replace(/\r/g,'').replace(/[ \t]+/g,' ');
  const out={};
  out.nome=lineValue(clean,'Nome',['Data de Nascimento','Data Nascimento','Naturalidade']);
  out.dataNascimento=lineValue(clean,'Data de Nascimento',['Naturalidade','B.I','B. I','C.C']);
  out.naturalidade=lineValue(clean,'Naturalidade',['B.I','B. I','C.C','Estado Civil']);
  out.biCc=lineValue(clean,'B.I. / C.C.',['Emitido','Validade','Arquivo','Estado Civil'])||lineValue(clean,'B.I / C.C',['Emitido','Validade','Arquivo']);
  out.estadoCivil=lineValue(clean,'Estado Civil',['Nacionalidade','Beneficiário']);
  out.nacionalidade=lineValue(clean,'Nacionalidade',['Beneficiário','Contribuinte']);
  out.beneficiario=lineValue(clean,'Beneficiário n.º',['Contribuinte','Morada']);
  out.contribuinte=lineValue(clean,'Contribuinte n.º',['Morada','Código Postal']);
  out.morada=lineValue(clean,'Morada',['Código Postal','Contactos']);
  const cp=clean.match(/(?:Código\s*Postal|C[oó]d\.?)\s*[:\-]?\s*(\d{4})\s*[- ]\s*(\d{3})/i);if(cp){out.codigoPostal1=cp[1];out.codigoPostal2=cp[2];}
  out.contactos=lineValue(clean,'Contactos',['Agregado Familiar','Observações']);
  return Object.fromEntries(Object.entries(out).filter(([,v])=>v));
}
function extractAndShow(){scan.resultText=document.querySelector('#scanText').value;const f=extractFields(scan.resultText),n=document.querySelector('#scanExtracted');n.dataset.fields=JSON.stringify(f);n.innerHTML=Object.keys(f).length?`<h4>Campos sugeridos</h4>${Object.entries(f).map(([k,v])=>`<label><span>${e(k)}</span><input data-key="${e(k)}" value="${e(v)}"></label>`).join('')}`:'<p>Não encontrei campos com confiança suficiente. Podes corrigir o texto e tentar novamente.</p>';n.querySelectorAll('input').forEach(i=>i.oninput=()=>{const obj=JSON.parse(n.dataset.fields||'{}');obj[i.dataset.key]=i.value;n.dataset.fields=JSON.stringify(obj);});}
function fillForm(api){
  const n=document.querySelector('#scanExtracted');const f=JSON.parse(n.dataset.fields||'{}');if(!Object.keys(f).length){extractAndShow();return;}
  for(const [k,v] of Object.entries(f)){
    const target=FIELD_MAP[k]; if(!target)continue;
    if(Array.isArray(target)){api.editor.formValues[target[0]]=v;} else api.editor.formValues[target]=v;
  }
  api.markDirty();api.renderAll();api.status('Campos reconhecidos pelo OCR aplicados à ficha. Confirma visualmente antes de guardar.');document.querySelector('#scannerModal').hidden=true;
}
function openSettings(){const d=document.querySelector('#ocrSettingsDialog');document.querySelector('#ocrEndpoint').value=localStorage.getItem('rjp.ocr.endpoint')||'';document.querySelector('#ocrToken').value=localStorage.getItem('rjp.ocr.token')||'';d.showModal();}

export function initScanner(api){
  modal();const m=document.querySelector('#scannerModal');
  document.querySelector('#scanBtn').onclick=()=>{m.hidden=false;setTimeout(()=>drawActive(),0);};
  document.querySelector('#scanClose').onclick=()=>m.hidden=true;
  document.querySelector('#scanCamera').onchange=e=>addFiles([...e.target.files]);
  document.querySelector('#scanFiles').onchange=e=>addFiles([...e.target.files]);
  document.querySelector('#scanFolder').onchange=e=>addFiles([...e.target.files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.pdf$/i.test(f.name)));
  const drop=document.querySelector('#scanStatus');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag');}));
  drop.addEventListener('drop',e=>{const fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.pdf$/i.test(f.name)); if(fs.length)addFiles(fs);});
  document.querySelector('#scanRotate').onclick=async()=>{if(!scan.pages.length)return;scan.pages[scan.active].rotation=(scan.pages[scan.active].rotation+90)%360;await drawActive();};
  document.querySelector('#scanAutoCrop').onclick=async()=>{const ok=autoCropCanvas(document.querySelector('#scanCanvas'));if(ok){await commitCanvas();setStatus('Recorte automático aplicado.');}else setStatus('Não consegui detetar margens com segurança; mantive a página inteira.');};
  document.querySelector('#scanPreset').onchange=e=>scan.preset=e.target.value;
  document.querySelector('#scanEnhance').onclick=async()=>{if(!scan.pages.length)return;applyPreset(document.querySelector('#scanCanvas'),scan.preset);await commitCanvas();setStatus(`Melhoria “${scan.preset}” aplicada.`);};
  document.querySelector('#scanOcr').onclick=runLocalOcr;document.querySelector('#scanOcrPro').onclick=runProOcr;document.querySelector('#scanSettings').onclick=openSettings;
  document.querySelector('#scanExtract').onclick=extractAndShow;document.querySelector('#scanFill').onclick=()=>fillForm(api);document.querySelector('#scanCopy').onclick=()=>navigator.clipboard?.writeText(document.querySelector('#scanText').value);
  document.querySelector('#scanText').oninput=e=>{scan.resultText=e.target.value;};
  document.querySelector('#ocrSaveSettings').onclick=()=>{localStorage.setItem('rjp.ocr.endpoint',document.querySelector('#ocrEndpoint').value.trim());localStorage.setItem('rjp.ocr.token',document.querySelector('#ocrToken').value);};
}
