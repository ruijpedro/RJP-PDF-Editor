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
  dataFichaDia: 'P1_texto_001_dia',
  dataFichaMes: 'P1_texto_001_mes',
  dataFichaAno: 'P1_texto_001_ano',
  jaRequereuRsi: 'P1_check_002',
  dataRsiDia: 'P1_texto_003_dia',
  dataRsiMes: 'P1_texto_003_mes',
  dataRsiAno: 'P1_texto_003_ano',
  processoFamiliar: 'P1_texto_004',
  titular: 'P1_check_005',
  requerente: 'P1_check_006',
  iniciativaPropria: 'P1_check_007',
  iniciativaOutro: 'P1_check_008',
  outroQual: 'P1_texto_009',
  nome: 'P1_texto_010',
  dataNascimento: 'P1_texto_011',
  naturalidade: 'P1_texto_012',
  biCc: 'P1_texto_013',
  validadeDia: 'P1_texto_014_dia',
  validadeMes: 'P1_texto_014_mes',
  validadeAno: 'P1_texto_014_ano',
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
  agregado1Nome: 'Agregado_L1_C1_132',
  agregado1Parentesco: 'Agregado_L1_C2_133',
  agregado1EstadoCivil: 'Agregado_L1_C3_134',
  agregado1DataNascimento: 'Agregado_L1_C4_135',
  agregado1Profissao: 'Agregado_L1_C5_136',
  agregado1Niss: 'Agregado_L1_C6_137',
  observacoesAgregado: 'P1_observacoes_agregado',
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
        <button id="scanOcrPro" class="primary">OCR</button>
        <button id="scanSettings" title="Configuração do OCR">⚙</button>
        <button id="scanOcr" hidden aria-hidden="true">OCR Local</button>
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
    <form method="dialog"><h3>OCR Pro — endpoint seguro</h3><p>Para manuscritos, usa OCR Manuscrito Pro. O processamento recomendado é Google Cloud Vision DOCUMENT_TEXT_DETECTION através de um proxy seguro. A chave fica no servidor, nunca no GitHub.</p>
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
      const pg=await doc.getPage(p), vp=pg.getViewport({scale:3}); const c=document.createElement('canvas'); c.width=vp.width;c.height=vp.height;
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
  if(preset==='photo'){
    for(let i=0;i<d.length;i+=4) for(let k=0;k<3;k++) d[i+k]=Math.max(0,Math.min(255,(d[i+k]-128)*1.12+136));
  } else if(preset==='handwriting'){
    // Manuscrito: NÃO binarizar. Lápis/esferográfica clara desaparecem com threshold agressivo.
    // Mantém tons finos, converte para cinzento e aumenta contraste moderadamente.
    for(let i=0;i<d.length;i+=4){
      let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      y=(y-128)*1.28+142;
      // clareia fundo sem apagar traços leves
      if(y>215) y=215+(y-215)*0.65;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,y));
    }
  } else {
    const t=otsu(d);
    for(let i=0;i<d.length;i+=4){let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];y=(y-128)*1.3+140;y=y<t?18:250;d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,y));}
  }
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
async function canvasVariantDataUrls(){
  const c=document.querySelector('#scanCanvas');
  const original=c.toDataURL('image/jpeg',.97);
  const tmp=document.createElement('canvas'); tmp.width=c.width; tmp.height=c.height;
  tmp.getContext('2d').drawImage(c,0,0);
  applyPreset(tmp,'handwriting');
  const enhanced=tmp.toDataURL('image/jpeg',.97);
  return [original, enhanced];
}

async function callProEndpoint(endpoint,token,dataUrl){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,imageBase64:dataUrl.split(',')[1],mimeType:'image/jpeg',languageHints:['pt','pt-PT'],mode:'handwriting'})});
  const data=await response.json().catch(()=>({error:`Resposta inválida (HTTP ${response.status})`}));
  if(!response.ok && !data.error) throw new Error(`HTTP ${response.status}`);
  if(data.error) throw new Error(data.error);
  return data;
}

function scoreOcrText(text=''){
  const t=text.trim(); if(!t) return 0;
  const letters=(t.match(/[A-Za-zÀ-ÿ0-9]/g)||[]).length;
  const bad=(t.match(/[|{}<>~^`]/g)||[]).length;
  const words=(t.match(/\b[\p{L}\d]{2,}\b/gu)||[]).length;
  return letters + words*3 - bad*2;
}

async function runProOcr(){
  if(!scan.pages.length)return;
  const endpoint=localStorage.getItem('rjp.ocr.endpoint')||'',token=localStorage.getItem('rjp.ocr.token')||'';
  if(!endpoint){openSettings();return;}
  try{
    scan.busy=true;document.querySelector('#scanOcrPro').disabled=true;
    let all='';
    for(let i=0;i<scan.pages.length;i++){
      scan.active=i;await drawActive();setStatus(`OCR manuscrito Pro: página ${i+1}/${scan.pages.length} — análise multipass…`);
      const variants=await canvasVariantDataUrls();
      const results=[];
      for(const dataUrl of variants){
        try{results.push(await callProEndpoint(endpoint,token,dataUrl));}catch(e){console.warn('OCR variant falhou',e);}
      }
      if(!results.length) throw new Error('O serviço OCR Pro não devolveu resultado.');
      results.sort((a,b)=>scoreOcrText(b.text)-scoreOcrText(a.text));
      const best=results[0];
      all+=(i?`\n\n--- PÁGINA ${i+1} ---\n`:'')+(best.text||'');
    }
    scan.resultText=all.trim();document.querySelector('#scanText').value=scan.resultText;
    document.querySelector('#scanConfidence').textContent='OCR Manuscrito Pro';
    extractAndShow();setStatus('OCR manuscrito concluído. Revê os campos assinalados antes de preencher a ficha.');
  }catch(err){console.error(err);alert('OCR Manuscrito Pro: '+err.message);setStatus('Falha no OCR Manuscrito Pro. Verifica endpoint/token e qualidade do scan.');}
  finally{scan.busy=false;document.querySelector('#scanOcrPro').disabled=false;}
}
function normText(text=''){
  return String(text)
    .replace(/\r/g,'')
    .replace(/[\u00A0\t]+/g,' ')
    .replace(/[ ]{2,}/g,' ')
    .replace(/\n[ ]+/g,'\n')
    .trim();
}
function compact(v=''){
  return String(v).replace(/[_]{2,}/g,' ').replace(/\s{2,}/g,' ').replace(/^[:;,.\-\s]+|[:;,.\-\s]+$/g,'').trim();
}
function labelValue(text,label,nextLabels=[]){
  const src=normText(text);
  const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const labelRe=typeof label==='string'?esc(label):label.source;
  const next=nextLabels.map(x=>typeof x==='string'?esc(x):x.source).join('|');
  const re=new RegExp(`(?:^|\\n|\\s)${labelRe}\\s*[:;.,-]?\\s*([\\s\\S]{0,220}?)(?=${next?`(?:\\n|\\s)(?:${next})\\s*[:;.,-]?`:'$'})`,'i');
  const m=src.match(re);
  return compact(m?.[1]||'').replace(/\n+/g,' ');
}
function firstDate(text,afterLabel=''){
  const src=afterLabel?labelValue(text,afterLabel,['1. Identificação','Já requereu RSI','N.º Processo Familiar']):normText(text);
  const m=(src||text).match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if(!m)return null;
  let y=m[3]; if(y.length===2)y=(Number(y)>40?'19':'20')+y;
  return {dia:m[1].padStart(2,'0'),mes:m[2].padStart(2,'0'),ano:y,raw:`${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${y}`};
}
function hasCheckedNear(text,label,window=50){
  const src=normText(text); const i=src.toLowerCase().indexOf(label.toLowerCase()); if(i<0)return false;
  const part=src.slice(i,i+window);
  return /[☑☒✓✔Xx]/.test(part.replace(/\bNão\b/gi,''));
}
function onlyDigits(v=''){return String(v).replace(/\D/g,'');}
function cleanNumber(v=''){return String(v).replace(/(?<=\d)\s+(?=\d)/g,'').replace(/[^0-9A-Za-z./-]/g,' ').replace(/\s+/g,' ').trim();}
function parseAggregate(text){
  const src=normText(text);
  const i=src.search(/2\.\s*Agregado\s+Familiar/i); if(i<0)return {};
  let block=src.slice(i); const j=block.search(/Observa(?:ç|c)[õo]es\s*\(/i); if(j>0)block=block.slice(0,j);
  const lines=block.split('\n').map(compact).filter(Boolean);
  const dataIdx=lines.findIndex(l=>/Data\s+Nas/i.test(l));
  const candidates=lines.slice(Math.max(0,dataIdx+1)).filter(l=>/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(l));
  if(!candidates.length)return {};
  const row=candidates[0];
  const dm=row.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/); if(!dm)return {};
  const date=dm[1], pos=row.indexOf(date); let left=compact(row.slice(0,pos)), right=compact(row.slice(pos+date.length));
  const estados=['Casado','Casada','Solteiro','Solteira','Divorciado','Divorciada','Viúvo','Viúva','Unido','Unida'];
  const parentescos=['Marido','Esposa','Filho','Filha','Pai','Mãe','Mae','Irmão','Irmã','Irmao','Irma','Companheiro','Companheira','Neto','Neta','Avô','Avó','Avo'];
  let estado=''; for(const x of estados){const r=new RegExp(`\\b${x}\\b`,'i'); if(r.test(left)){estado=x;left=compact(left.replace(r,''));break;}}
  let parentesco=''; for(const x of parentescos){const r=new RegExp(`\\b${x}\\b`,'i'); if(r.test(left)){parentesco=x;left=compact(left.replace(r,''));break;}}
  let niss=''; const nm=right.match(/(?:\b\d[\d ]{7,14}\b)\s*$/); if(nm){niss=onlyDigits(nm[0]);right=compact(right.slice(0,right.lastIndexOf(nm[0])));}
  return {agregado1Nome:left,agregado1Parentesco:parentesco,agregado1EstadoCivil:estado,agregado1DataNascimento:date,agregado1Profissao:right,agregado1Niss:niss};
}
function parseObservacoesAgregado(text){
  const src=normText(text);
  const m=src.match(/Observa(?:ç|c)[õo]es\s*\(pedidos\/problemas,?\s*encaminhamentos,?\s*elemento\s*alvo\)\s*:?\s*([\s\S]*?)(?=---\s*PÁGINA\s*2|3\.1\.?\s*Saúde|$)/i);
  if(!m)return '';
  return compact(m[1].replace(/\n+/g,' '));
}
function extractFields(text){
  const clean=normText(text), out={};
  const topDate=firstDate(clean); if(topDate){out.dataFichaDia=topDate.dia;out.dataFichaMes=topDate.mes;out.dataFichaAno=topDate.ano;}
  out.jaRequereuRsi=hasCheckedNear(clean,'Já requereu RSI',35);
  const rsiSeg=labelValue(clean,/Já\s+requereu\s+RSI/i,[/N\.?º?\s*Processo\s+Familiar/i,'Titular','Requerente']); const rsiDate=firstDate(rsiSeg); if(rsiDate){out.dataRsiDia=rsiDate.dia;out.dataRsiMes=rsiDate.mes;out.dataRsiAno=rsiDate.ano;}
  out.processoFamiliar=cleanNumber(labelValue(clean,/N\.?º?\s*Processo\s+Familiar/i,['Outro, qual','Iniciativa','Nome']));
  out.titular=hasCheckedNear(clean,'Titular',25); out.requerente=hasCheckedNear(clean,'Requerente',30);
  out.iniciativaPropria=hasCheckedNear(clean,'Iniciativa: Própria',45);
  out.iniciativaOutro=hasCheckedNear(clean,'Outro, qual',40);
  out.outroQual=labelValue(clean,'Outro, qual',['Iniciativa: Própria','Nome','Data de Nascimento']);
  out.nome=labelValue(clean,'Nome',['Data de Nascimento','Naturalidade']);
  out.dataNascimento=labelValue(clean,/Data\s+de\s+Nascimento/i,['Naturalidade','B.I','B. I','C.C']);
  out.naturalidade=labelValue(clean,'Naturalidade',['B.I','B. I','C.C','Estado Civil','Nacionalidade']);
  out.biCc=cleanNumber(labelValue(clean,/B\.?I\.?\s*\/\s*C\.?C\.?/i,['Emitido','Validade','Arquivo','Estado Civil']));
  const val=labelValue(clean,/Emitido\s*\/\s*Validade|Emitido\s+Validade|Validade/i,['Arquivo de','Arquivo','Estado Civil','Nacionalidade']); const vd=firstDate(val); if(vd){out.validadeDia=vd.dia;out.validadeMes=vd.mes;out.validadeAno=vd.ano;}
  out.arquivo=labelValue(clean,/Arquivo\s+de/i,['Estado Civil','Nacionalidade','Beneficiário']);
  out.estadoCivil=labelValue(clean,'Estado Civil',['Nacionalidade','Beneficiário','Contribuinte']);
  out.nacionalidade=labelValue(clean,'Nacionalidade',['Beneficiário','Contribuinte','Morada']);
  out.beneficiario=cleanNumber(labelValue(clean,/Benefici[aá]rio\s+n\.?º?/i,['Contribuinte','Morada','Código Postal']));
  out.contribuinte=cleanNumber(labelValue(clean,/Contribuinte\s+n\.?º?/i,['Morada','Código Postal','Contactos','Agregado Familiar']));
  out.morada=labelValue(clean,'Morada',['Código Postal','Contactos','Agregado Familiar']);
  const cp=clean.match(/(?:Código\s*Postal|C[oó]d\.?\s*Postal)\s*[:\-]?\s*(\d{4})\s*[- ]\s*(\d{3})(?:\s+([^\n]{2,60}))?/i);if(cp){out.codigoPostal1=cp[1];out.codigoPostal2=cp[2];if(cp[3]&&!/Contactos|Agregado/i.test(cp[3]))out.localidade=compact(cp[3]);}
  out.contactos=cleanNumber(labelValue(clean,'Contactos',['2. Agregado Familiar','Agregado Familiar','Observações']));
  Object.assign(out,parseAggregate(clean));
  out.observacoesAgregado=parseObservacoesAgregado(clean);
  // Remove vazios, mas preserva booleanos false/true para checkboxes encontrados.
  return Object.fromEntries(Object.entries(out).filter(([,v])=>typeof v==='boolean' || (v!==undefined&&v!==null&&String(v).trim()!=='')));
}
function prettyKey(k){return ({
  dataFichaDia:'Data — dia',dataFichaMes:'Data — mês',dataFichaAno:'Data — ano',jaRequereuRsi:'Já requereu RSI',dataRsiDia:'RSI — dia',dataRsiMes:'RSI — mês',dataRsiAno:'RSI — ano',processoFamiliar:'N.º Processo Familiar',titular:'Titular',requerente:'Requerente',iniciativaPropria:'Iniciativa própria',iniciativaOutro:'Outro',outroQual:'Outro — qual',nome:'Nome',dataNascimento:'Data de Nascimento',naturalidade:'Naturalidade',biCc:'BI / CC',validadeDia:'Validade — dia',validadeMes:'Validade — mês',validadeAno:'Validade — ano',arquivo:'Arquivo de',estadoCivil:'Estado Civil',nacionalidade:'Nacionalidade',beneficiario:'Beneficiário n.º',contribuinte:'Contribuinte n.º',morada:'Morada',codigoPostal1:'Código Postal',codigoPostal2:'Código Postal — extensão',localidade:'Localidade',contactos:'Contactos',agregado1Nome:'Agregado 1 — Nome',agregado1Parentesco:'Agregado 1 — Parentesco',agregado1EstadoCivil:'Agregado 1 — Est. civil',agregado1DataNascimento:'Agregado 1 — Data Nas.',agregado1Profissao:'Agregado 1 — Profissão/Ensino',agregado1Niss:'Agregado 1 — NISS',observacoesAgregado:'Observações do agregado'
})[k]||k;}
function extractAndShow(){
  scan.resultText=document.querySelector('#scanText').value;
  const f=extractFields(scan.resultText),n=document.querySelector('#scanExtracted');n.dataset.fields=JSON.stringify(f);
  n.innerHTML=Object.keys(f).length?`<h4>Campos sugeridos</h4>${Object.entries(f).map(([k,v])=>typeof v==='boolean'?`<label><span>${e(prettyKey(k))}</span><input data-key="${e(k)}" type="checkbox" ${v?'checked':''}></label>`:`<label><span>${e(prettyKey(k))}</span><input data-key="${e(k)}" value="${e(v)}"></label>`).join('')}`:'<p>Não encontrei campos com confiança suficiente. Podes corrigir o texto e tentar novamente.</p>';
  n.querySelectorAll('input').forEach(i=>i.oninput=()=>{const obj=JSON.parse(n.dataset.fields||'{}');obj[i.dataset.key]=i.type==='checkbox'?i.checked:i.value;n.dataset.fields=JSON.stringify(obj);});
}
function fillForm(api){
  const n=document.querySelector('#scanExtracted');let f=JSON.parse(n.dataset.fields||'{}');if(!Object.keys(f).length){extractAndShow();f=JSON.parse(n.dataset.fields||'{}');if(!Object.keys(f).length)return;}
  let applied=0;
  for(const [k,v] of Object.entries(f)){
    const target=FIELD_MAP[k]; if(!target)continue;
    api.editor.formValues[target]=v; applied++;
  }
  api.markDirty();api.renderAll();
  api.status(`${applied} campo(s) reconhecido(s) pelo OCR aplicados à ficha. Confirma visualmente antes de guardar.`);
  document.querySelector('#scannerModal').hidden=true;
  window.scrollTo({top:0,behavior:'smooth'});
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
  document.querySelector('#scanOcr').onclick=runLocalOcr;document.querySelector('#scanOcrPro').onclick=async()=>{const endpoint=localStorage.getItem('rjp.ocr.endpoint')||'';if(endpoint){await runProOcr();}else{openSettings();}};document.querySelector('#scanSettings').onclick=openSettings;
  document.querySelector('#scanExtract').onclick=extractAndShow;document.querySelector('#scanFill').onclick=()=>fillForm(api);document.querySelector('#scanCopy').onclick=()=>navigator.clipboard?.writeText(document.querySelector('#scanText').value);
  document.querySelector('#scanText').oninput=e=>{scan.resultText=e.target.value;};
  document.querySelector('#ocrSaveSettings').onclick=()=>{localStorage.setItem('rjp.ocr.endpoint',document.querySelector('#ocrEndpoint').value.trim());localStorage.setItem('rjp.ocr.token',document.querySelector('#ocrToken').value);};
}
