import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { FileUp, Save, Download, RotateCcw, FileText, Mic, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import fieldMap from './fieldmap.json';
import './style.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/Ficha_Atendimento_EDITAVEL_RJP.pdf`;

function groupTitle(page){
  return ({1:'Identificação e agregado familiar',2:'Saúde, trabalho e situação escolar',3:'Situação económica',4:'Habitação e observações',5:'RGPD e consentimento',6:'Consentimento e assinatura'})[page] || `Página ${page}`;
}

function lineKey(base, index){ return `${base}__L${index + 1}`; }

function App(){
  const [sourceBytes,setSourceBytes] = useState(null);
  const [fileName,setFileName] = useState('Ficha_Atendimento_RJP.pdf');
  const [pdfJs,setPdfJs] = useState(null);
  const [values,setValues] = useState({});
  const [page,setPage] = useState(1);
  const [scale,setScale] = useState(1.35);
  const [status,setStatus] = useState('A carregar ficha base…');
  const [query,setQuery] = useState('');
  const canvasRef=useRef(null);
  const [viewport,setViewport] = useState(null);

  const pageFields=useMemo(()=>fieldMap.filter(f=>f.page===page && (!query || f.name.toLowerCase().includes(query.toLowerCase()))),[page,query]);

  useEffect(()=>{ loadTemplate(); },[]);
  useEffect(()=>{ if(pdfJs) renderPage(); },[pdfJs,page,scale]);

  async function loadTemplate(){
    const b = new Uint8Array(await (await fetch(TEMPLATE_URL)).arrayBuffer());
    await loadBytes(b,'Ficha_Atendimento_RJP.pdf');
  }

  async function loadBytes(bytes,name){
    try{
      setStatus('A abrir PDF…');
      const safe = new Uint8Array(bytes);
      const task = pdfjsLib.getDocument({data:safe.slice()});
      const doc = await task.promise;
      setPdfJs(doc);
      setSourceBytes(safe);
      setFileName(name.replace(/\.pdf$/i,'')+'.pdf');
      setPage(1);
      await readFormValues(safe);
      setStatus(`PDF aberto — ${doc.numPages} páginas. As zonas com linhas são editadas linha a linha.`);
    }catch(e){
      console.error(e); setStatus('Não foi possível abrir este PDF.');
    }
  }

  async function readFormValues(bytes){
    const doc=await PDFDocument.load(bytes,{ignoreEncryption:true});
    const form=doc.getForm();
    const raw={};
    for(const field of form.getFields()){
      const n=field.getName();
      try{
        if(field instanceof PDFTextField) raw[n]=field.getText()||'';
        else if(field instanceof PDFCheckBox) raw[n]=field.isChecked();
      }catch{}
    }

    const next={...raw};
    for(const f of fieldMap.filter(x=>x.type==='linegroup')){
      const existing=[];
      let hasLineFields=false;
      for(let i=0;i<f.lines;i++){
        const k=lineKey(f.name,i);
        if(k in raw){ hasLineFields=true; existing[i]=raw[k]||''; }
      }
      if(!hasLineFields){
        const old=String(raw[f.name]||'').split(/\r?\n/);
        for(let i=0;i<f.lines;i++) existing[i]=old[i]||'';
      }
      for(let i=0;i<f.lines;i++) next[lineKey(f.name,i)]=existing[i]||'';
    }
    setValues(next);
  }

  async function renderPage(){
    const p=await pdfJs.getPage(page);
    const vp=p.getViewport({scale});
    setViewport(vp);
    const c=canvasRef.current; if(!c)return;
    c.width=Math.ceil(vp.width); c.height=Math.ceil(vp.height);
    c.style.width=`${vp.width}px`; c.style.height=`${vp.height}px`;
    await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
  }

  function rectStyle(f){
    if(!viewport) return {};
    const [x1,y1,x2,y2]=f.rect;
    const s=viewport.scale;
    return {left:x1*s, top:(viewport.height-y2*s), width:(x2-x1)*s, height:(y2-y1)*s};
  }

  function lineRects(f){
    const [x1,y1,x2,y2]=f.rect;
    const slot=(y2-y1)/f.lines;
    return Array.from({length:f.lines},(_,i)=>{
      const topY=y2-i*slot;
      const h=Math.min(slot*0.80, 14.5);
      const yy=topY-slot+(slot-h)/2+1.0;
      return [x1,yy,x2,yy+h];
    });
  }

  function lineStyle(f,index){
    if(!viewport) return {};
    const [x1,y1,x2,y2]=lineRects(f)[index];
    const s=viewport.scale;
    return {left:x1*s, top:(viewport.height-y2*s), width:(x2-x1)*s, height:(y2-y1)*s};
  }

  function update(name,val){ setValues(v=>({...v,[name]:val})); }

  async function migrateLineGroups(doc,form){
    const pages=doc.getPages();
    const names=new Set(form.getFields().map(x=>x.getName()));
    for(const f of fieldMap.filter(x=>x.type==='linegroup')){
      if(names.has(f.name)){
        try{ form.removeField(form.getField(f.name)); names.delete(f.name); }catch{}
      }
      const rects=lineRects(f);
      for(let i=0;i<f.lines;i++){
        const n=lineKey(f.name,i);
        let tf;
        if(names.has(n)){
          try{ tf=form.getTextField(n); }catch{ tf=null; }
        }
        if(!tf){
          tf=form.createTextField(n);
          const [x1,y1,x2,y2]=rects[i];
          tf.addToPage(pages[f.page-1],{x:x1,y:y1,width:x2-x1,height:y2-y1,borderWidth:0});
          names.add(n);
        }
        try{ tf.setFontSize(f.fontSize||9.5); }catch{}
        tf.setText(String(values[n]??''));
      }
    }
  }

  async function savePdf(saveAs=false){
    if(!sourceBytes)return;
    try{
      setStatus('A guardar PDF e a converter observações para campos de linha…');
      const doc=await PDFDocument.load(sourceBytes.slice(),{ignoreEncryption:true});
      const form=doc.getForm();

      await migrateLineGroups(doc,form);

      for(const field of form.getFields()){
        const n=field.getName();
        if(!(n in values)) continue;
        try{
          if(field instanceof PDFTextField) field.setText(String(values[n] ?? ''));
          else if(field instanceof PDFCheckBox){ values[n] ? field.check() : field.uncheck(); }
        }catch(e){ console.warn('Campo',n,e); }
      }

      const out=await doc.save({useObjectStreams:false,addDefaultPage:false,updateFieldAppearances:true});
      const blob=new Blob([out],{type:'application/pdf'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      let n=fileName;
      if(saveAs){
        const asked=window.prompt('Nome do novo PDF:',fileName.replace(/\.pdf$/i,'')+'_novo.pdf');
        if(!asked){setStatus('Guardar como cancelado.');return;}
        n=asked.toLowerCase().endsWith('.pdf')?asked:asked+'.pdf';
      }
      a.download=n; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
      setSourceBytes(new Uint8Array(out));
      setFileName(n);
      setStatus('Guardado. As observações ficaram divididas em linhas editáveis independentes.');
    }catch(e){ console.error(e); setStatus(`Erro ao guardar o PDF: ${e?.message||e}`); }
  }

  async function onOpen(e){
    const f=e.target.files?.[0]; if(!f)return;
    const b=new Uint8Array(await f.arrayBuffer());
    await loadBytes(b,f.name);
    e.target.value='';
  }

  function dictate(name){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ setStatus('Neste navegador usa o microfone do Gboard/teclado no próprio campo.'); return; }
    const r=new SR(); r.lang='pt-PT'; r.interimResults=false; r.maxAlternatives=1;
    r.onresult=e=>update(name,(values[name]||'')+(values[name]?' ':'')+e.results[0][0].transcript);
    r.onerror=()=>setStatus('Não foi possível usar o ditado do navegador. Podes usar o microfone do Gboard.');
    r.start();
  }

  function renderSideField(f){
    if(f.type==='checkbox') return <input type="checkbox" checked={!!values[f.name]} onChange={e=>update(f.name,e.target.checked)}/>;
    if(f.type==='linegroup') return <div className="lineGroupSide">{Array.from({length:f.lines},(_,i)=>{
      const k=lineKey(f.name,i);
      return <div className="textCtl" key={k}><input placeholder={`Linha ${i+1}`} value={values[k]||''} onChange={e=>update(k,e.target.value)}/><button title="Ditar" onClick={()=>dictate(k)}><Mic size={14}/></button></div>;
    })}</div>;
    return <div className="textCtl"><input value={values[f.name]||''} onChange={e=>update(f.name,e.target.value)}/><button title="Ditar" onClick={()=>dictate(f.name)}><Mic size={14}/></button></div>;
  }

  return <div className="app">
    <header>
      <div className="brand"><div className="logo">RJP</div><div><strong>PDF Editor</strong><small>Ficha de Atendimento — campos alinhados por linha</small></div></div>
      <div className="actions">
        <label className="btn secondary"><FileUp size={17}/> Abrir PDF<input type="file" accept="application/pdf" onChange={onOpen}/></label>
        <button className="btn secondary" onClick={loadTemplate}><RotateCcw size={17}/> Nova ficha</button>
        <button className="btn" onClick={()=>savePdf(false)}><Save size={17}/> Guardar</button>
        <button className="btn" onClick={()=>savePdf(true)}><Download size={17}/> Guardar como…</button>
      </div>
    </header>

    <div className="status"><FileText size={15}/><span>{status}</span></div>

    <main>
      <aside>
        <div className="sideTitle">Campos — página {page}</div>
        <div className="search"><Search size={15}/><input placeholder="Procurar campo…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
        <h3>{groupTitle(page)}</h3>
        <div className="fieldList">
          {pageFields.map(f=><div className="fieldRow" key={f.name}><label>{humanize(f.name)}</label>{renderSideField(f)}</div>)}
        </div>
      </aside>

      <section className="viewer">
        <div className="pager">
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft/></button>
          <span>Página <b>{page}</b> / {pdfJs?.numPages||6}</span>
          <button disabled={!pdfJs || page>=pdfJs.numPages} onClick={()=>setPage(p=>p+1)}><ChevronRight/></button>
          <select value={scale} onChange={e=>setScale(Number(e.target.value))}><option value="1">100%</option><option value="1.2">120%</option><option value="1.35">135%</option><option value="1.6">160%</option></select>
        </div>
        <div className="paper" style={viewport?{width:viewport.width,height:viewport.height}:undefined}>
          <canvas ref={canvasRef}/>
          {viewport && fieldMap.filter(f=>f.page===page).flatMap(f=>{
            if(f.type==='checkbox') return [<input key={f.name} className="overlayCheck" style={rectStyle(f)} type="checkbox" checked={!!values[f.name]} onChange={e=>update(f.name,e.target.checked)}/>];
            if(f.type==='linegroup') return Array.from({length:f.lines},(_,i)=>{
              const k=lineKey(f.name,i);
              return <input key={k} className="overlayInput overlayLine" style={lineStyle(f,i)} value={values[k]||''} onChange={e=>update(k,e.target.value)} />;
            });
            return [<input key={f.name} className="overlayInput" style={rectStyle(f)} value={values[f.name]||''} onChange={e=>update(f.name,e.target.value)} />];
          })}
        </div>
      </section>
    </main>
  </div>
}

function humanize(n){
  return n.replace(/^p\d+_/,'').replace(/_/g,' ').replace(/\br(\d+) c(\d+)\b/i,'linha $1 · coluna $2').replace(/\b\w/g,m=>m.toUpperCase());
}

createRoot(document.getElementById('root')).render(<App/>);
