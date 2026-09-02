import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import {
  FileText, FileType2, Upload, Download, Lock, Unlock, MousePointer2,
  Type, Save, Trash2, ChevronLeft, ChevronRight, RotateCcw, Info, Mic, MicOff
} from 'lucide-react';
import './style.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SCALE = 1.35;

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fileKey(file) {
  return `rjp-lock:${await sha256(`${file.name}|${file.size}|${file.lastModified}`)}`;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function App() {
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState(null); // pdf | docx
  const [password, setPassword] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [status, setStatus] = useState('Abre um PDF ou Word para começar.');

  // PDF
  const [pdfProxy, setPdfProxy] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [pageMeta, setPageMeta] = useState(null);
  const [textItems, setTextItems] = useState([]);
  const [changes, setChanges] = useState({});
  const [newTexts, setNewTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select');
  const [saveName, setSaveName] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Word
  const [wordHtml, setWordHtml] = useState('');
  const wordRef = useRef(null);
  const canvasRef = useRef(null);
  const pageWrapRef = useRef(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    if (selectedId.startsWith('new:')) return newTexts.find(x => x.id === selectedId) || null;
    return textItems.find(x => x.id === selectedId) || null;
  }, [selectedId, textItems, newTexts]);

  async function resetAll() {
    setPdfProxy(null); setPdfBytes(null); setPageNo(1); setPageMeta(null);
    setTextItems([]); setChanges({}); setNewTexts([]); setSelectedId(null);
    setWordHtml(''); setTool('select');
  }

  async function openFile(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    await resetAll();
    setFile(f);
    setSaveName(f.name.replace(/\.(pdf|docx)$/i, '') + '_editado.pdf');
    setPassword('');
    const key = await fileKey(f);
    const protectedHash = localStorage.getItem(key);
    setIsProtected(!!protectedHash);
    setUnlocked(!protectedHash);

    const ext = f.name.toLowerCase();
    try {
      if (ext.endsWith('.pdf')) {
        setKind('pdf');
        const arr = await f.arrayBuffer();
        const bytes = new Uint8Array(arr);
        setPdfBytes(bytes);
        const proxy = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
        setPdfProxy(proxy);
        setStatus(`PDF aberto: ${proxy.numPages} página(s).`);
      } else if (ext.endsWith('.docx')) {
        setKind('docx');
        const arr = await f.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: arr });
        setWordHtml(result.value || '<p></p>');
        setStatus('Word aberto e convertido para edição no browser.');
      } else {
        alert('Formato não suportado. Usa PDF ou DOCX.');
        setFile(null); setKind(null);
      }
    } catch (err) {
      console.error(err);
      alert(`Não foi possível abrir o ficheiro. ${err?.message || ''}`);
      setStatus('Erro ao abrir ficheiro.');
    }
  }

  async function protectFile() {
    if (!file) return alert('Abre primeiro um ficheiro.');
    if (!password.trim()) return alert('Define uma password.');
    const key = await fileKey(file);
    localStorage.setItem(key, await sha256(password));
    setIsProtected(true); setUnlocked(true);
    setStatus('Password associada a este ficheiro neste dispositivo.');
  }

  async function unlockFile() {
    if (!file) return;
    const key = await fileKey(file);
    const stored = localStorage.getItem(key);
    if (!stored || stored === await sha256(password)) {
      setUnlocked(true);
      setStatus('Documento desbloqueado.');
    } else alert('Password incorreta.');
  }

  async function removeProtection() {
    if (!file) return;
    const key = await fileKey(file);
    const stored = localStorage.getItem(key);
    if (stored && stored !== await sha256(password)) return alert('Introduz a password atual para remover a proteção.');
    localStorage.removeItem(key);
    setIsProtected(false); setUnlocked(true); setPassword('');
    setStatus('Proteção local removida.');
  }

  useEffect(() => {
    if (!pdfProxy || kind !== 'pdf' || !unlocked) return;
    let cancelled = false;
    (async () => {
      const page = await pdfProxy.getPage(pageNo);
      const viewport = page.getViewport({ scale: SCALE });
      const rawViewport = page.getViewport({ scale: 1 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext('2d');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const content = await page.getTextContent();
      if (cancelled) return;
      const items = content.items.map((it, idx) => {
        const [a,b,c,d,e,f] = it.transform;
        const fontSize = Math.max(6, Math.hypot(a, b));
        return {
          id: `p${pageNo}:${idx}`,
          page: pageNo,
          original: it.str,
          x: e,
          y: f,
          width: Math.max(it.width || fontSize, 4),
          height: fontSize * 1.15,
          fontSize,
          left: e * SCALE,
          top: (rawViewport.height - f - fontSize) * SCALE,
          cssWidth: Math.max((it.width || fontSize) * SCALE, 5),
          cssHeight: Math.max(fontSize * 1.25 * SCALE, 12)
        };
      }).filter(x => x.original?.trim());
      setTextItems(items);
      setPageMeta({ width: rawViewport.width, height: rawViewport.height, cssWidth: viewport.width, cssHeight: viewport.height });
      setSelectedId(null);
    })().catch(err => console.error(err));
    return () => { cancelled = true; };
  }, [pdfProxy, pageNo, kind, unlocked]);

  function textValue(item) {
    return changes[item.id]?.text ?? item.original;
  }

  function updateSelected(text) {
    if (!selected) return;
    if (selected.id.startsWith('new:')) {
      setNewTexts(xs => xs.map(x => x.id === selected.id ? { ...x, text } : x));
    } else {
      setChanges(c => ({ ...c, [selected.id]: { ...(c[selected.id] || {}), text } }));
    }
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.id.startsWith('new:')) setNewTexts(xs => xs.filter(x => x.id !== selected.id));
    else setChanges(c => ({ ...c, [selected.id]: { ...(c[selected.id] || {}), text: '' } }));
    setSelectedId(null);
  }

  function onPageClick(e) {
    if (tool !== 'text' || !pageMeta || !pageWrapRef.current) return;
    if (e.target.closest('.pdf-hit')) return;
    const rect = pageWrapRef.current.getBoundingClientRect();
    const px = clamp(e.clientX - rect.left, 0, pageMeta.cssWidth);
    const py = clamp(e.clientY - rect.top, 0, pageMeta.cssHeight);
    const x = px / SCALE;
    const y = pageMeta.height - py / SCALE;
    const id = `new:${crypto.randomUUID()}`;
    const item = { id, page: pageNo, text: 'Novo texto', x, y, fontSize: 12, left: px, top: py - 16, cssWidth: 110, cssHeight: 24 };
    setNewTexts(xs => [...xs, item]);
    setSelectedId(id);
    setTool('select');
  }

  async function savePdf(customName = null) {
    if (!pdfBytes) return;
    try {
      setStatus('A gerar PDF editado...');
      const doc = await PDFDocument.load(pdfBytes.slice());
      const font = await doc.embedFont(StandardFonts.Helvetica);
      for (const [id, ch] of Object.entries(changes)) {
        const [pStr, idxStr] = id.replace('p','').split(':');
        const pageIndex = Number(pStr) - 1;
        const page = doc.getPages()[pageIndex];
        if (!page) continue;
        const source = pageNo === pageIndex + 1 ? textItems.find(t => t.id === id) : null;
        // If source is not on current page, recover its approximate geometry from cached change metadata.
        const meta = ch.meta || source;
        if (!meta) continue;
        const size = meta.fontSize || 11;
        page.drawRectangle({
          x: meta.x - 1,
          y: meta.y - size * 0.22,
          width: Math.max((meta.width || size) + 3, 5),
          height: size * 1.18,
          color: rgb(1,1,1)
        });
        if ((ch.text ?? '').length) page.drawText(ch.text, { x: meta.x, y: meta.y, size, font, color: rgb(0,0,0) });
      }
      for (const nt of newTexts) {
        const page = doc.getPages()[nt.page - 1];
        if (!page || !nt.text) continue;
        page.drawText(nt.text, { x: nt.x, y: nt.y, size: nt.fontSize || 12, font, color: rgb(0,0,0) });
      }
      const out = await doc.save();
      const finalName = normalisePdfName(customName || saveName || file.name.replace(/\.pdf$/i,'') + '_editado.pdf');
      downloadBlob(new Blob([out], { type: 'application/pdf' }), finalName);
      setSaveName(finalName);
      setStatus('PDF editado guardado.');
    } catch (err) {
      console.error(err);
      alert(`Erro ao guardar PDF: ${err?.message || err}`);
      setStatus('Erro ao guardar PDF.');
    }
  }

  // Persist geometry when a PDF text is changed, so changing page later does not lose export coordinates.
  useEffect(() => {
    setChanges(c => {
      let dirty = false;
      const next = { ...c };
      for (const item of textItems) {
        if (next[item.id] && !next[item.id].meta) {
          next[item.id] = { ...next[item.id], meta: { x:item.x, y:item.y, width:item.width, fontSize:item.fontSize } };
          dirty = true;
        }
      }
      return dirty ? next : c;
    });
  }, [textItems]);

  async function exportWordPdf(customName = null) {
    if (!wordRef.current) return;
    setStatus('A converter Word editado para PDF...');
    const options = {
      margin: [10, 10, 10, 10],
      filename: normalisePdfName(customName || saveName || file.name.replace(/\.docx$/i,'') + '_editado.pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css','legacy'] }
    };
    try {
      await html2pdf().set(options).from(wordRef.current).save();
      setStatus('Word editado exportado para PDF.');
    } catch (err) {
      console.error(err);
      alert('Não foi possível converter o Word para PDF.');
      setStatus('Erro ao exportar Word.');
    }
  }

  function normalisePdfName(name) {
    const clean = (name || 'documento_editado.pdf').trim().replace(/[\\/:*?\"<>|]+/g, '_');
    return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
  }

  function askSaveAs(action) {
    const proposed = normalisePdfName(saveName || (file?.name || 'documento').replace(/\.(pdf|docx)$/i, '') + '_editado.pdf');
    const chosen = window.prompt('Guardar como — nome do novo PDF:', proposed);
    if (chosen === null) return;
    const finalName = normalisePdfName(chosen);
    setSaveName(finalName);
    action(finalName);
  }

  function toggleDictation() {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('O ditado do browser não está disponível neste dispositivo. No telemóvel, toca na caixa de texto e usa o microfone do Gboard/teclado Google.');
      return;
    }
    if (!selected) {
      alert('Seleciona primeiro um texto do PDF.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-PT';
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = '';
    const base = selected.id.startsWith('new:') ? (selected.text || '') : (textValue(selected) || '');
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      const spoken = (finalText + interim).trim();
      if (spoken) updateSelected((base && !base.endsWith(' ') ? base + ' ' : base) + spoken);
    };
    recognition.onerror = (event) => {
      console.error(event);
      setListening(false);
      if (event.error !== 'aborted') alert('Não foi possível usar o ditado. Podes usar o microfone do Gboard diretamente na caixa de texto.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const lockedView = file && isProtected && !unlocked;

  return (
    <main>
      <header>
        <div className="brand"><span className="rjp">RJP</span><span>PDF Editor</span><span className="version">V0.6</span></div>
        <div className="subtitle">PDF + Word • edição local no browser • GitHub Pages</div>
      </header>

      <section className="topbar">
        <label className="btn primary"><Upload size={18}/> Abrir PDF / Word
          <input hidden type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={openFile}/>
        </label>
        <div className="passwordBox">
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password deste ficheiro" />
          <button className="btn" onClick={protectFile}><Lock size={16}/> Proteger</button>
          {isProtected && !unlocked && <button className="btn" onClick={unlockFile}><Unlock size={16}/> Desbloquear</button>}
          {isProtected && unlocked && <button className="btn ghost" onClick={removeProtection}>Remover proteção</button>}
        </div>
        <div className="fileName">{file ? file.name : 'Nenhum ficheiro aberto'}</div>
      </section>

      {lockedView ? (
        <section className="lockedScreen"><Lock size={64}/><h2>Documento protegido</h2><p>Introduz a password e carrega em “Desbloquear”.</p></section>
      ) : kind === 'pdf' ? (
        <section className="workspace">
          <aside className="sidebar">
            <h3>Ferramentas PDF</h3>
            <div className="toolRow">
              <button className={tool==='select'?'btn active':'btn'} onClick={()=>setTool('select')}><MousePointer2 size={16}/> Selecionar</button>
              <button className={tool==='text'?'btn active':'btn'} onClick={()=>setTool('text')}><Type size={16}/> Novo texto</button>
            </div>
            <p className="hint">Clica num texto existente para o selecionar. Escolhe “Novo texto” e clica na página para inserir texto.</p>

            <h3>Texto selecionado</h3>
            {selected ? <>
              <textarea className="editText" value={selected.id.startsWith('new:') ? selected.text : textValue(selected)} onChange={e=>updateSelected(e.target.value)} inputMode="text" />
              <button className={listening ? "btn micBtn listening" : "btn micBtn"} onClick={toggleDictation}>
                {listening ? <MicOff size={16}/> : <Mic size={16}/>} {listening ? 'Parar ditado' : 'Ditar texto'}
              </button>
              <div className="smallGrid">
                <label>Tamanho
                  <input type="number" min="6" max="72" value={selected.id.startsWith('new:') ? selected.fontSize : selected.fontSize} onChange={e=>{
                    if (selected.id.startsWith('new:')) setNewTexts(xs=>xs.map(x=>x.id===selected.id?{...x,fontSize:Number(e.target.value)||12}:x));
                  }} disabled={!selected.id.startsWith('new:')} />
                </label>
              </div>
              <button className="btn danger" onClick={deleteSelected}><Trash2 size={16}/> Apagar</button>
            </> : <p className="muted">Ainda não selecionaste texto.</p>}

            <div className="pageNav">
              <button className="iconBtn" disabled={pageNo<=1} onClick={()=>setPageNo(n=>n-1)}><ChevronLeft/></button>
              <b>Página {pageNo} / {pdfProxy?.numPages || 1}</b>
              <button className="iconBtn" disabled={pageNo>=(pdfProxy?.numPages||1)} onClick={()=>setPageNo(n=>n+1)}><ChevronRight/></button>
            </div>

            <div className="saveGroup">
              <input className="saveName" value={saveName} onChange={e=>setSaveName(e.target.value)} aria-label="Nome do PDF" />
              <button className="btn saveBtn" onClick={()=>savePdf()}><Save size={17}/> Guardar</button>
              <button className="btn saveAsBtn" onClick={()=>askSaveAs(savePdf)}><Download size={17}/> Guardar como...</button>
            </div>
            <div className="notice"><Info size={16}/><span>A edição substitui o texto visualmente no PDF: cobre o texto original e escreve o novo na mesma zona.</span></div>
          </aside>

          <div className="pdfArea">
            <div className={`pdfPage ${tool==='text'?'addTextMode':''}`} ref={pageWrapRef} onClick={onPageClick} style={pageMeta?{width:pageMeta.cssWidth,height:pageMeta.cssHeight}:undefined}>
              <canvas ref={canvasRef}/>
              {textItems.map(item => (
                <button key={item.id} className={`pdf-hit ${selectedId===item.id?'selected':''} ${changes[item.id]?'changed':''}`}
                  style={{left:item.left,top:item.top,width:item.cssWidth,height:item.cssHeight}}
                  title={textValue(item)}
                  onClick={e=>{e.stopPropagation();setSelectedId(item.id);setTool('select')}}>
                  <span>{textValue(item)}</span>
                </button>
              ))}
              {newTexts.filter(x=>x.page===pageNo).map(item=>(
                <button key={item.id} className={`newText ${selectedId===item.id?'selected':''}`}
                  style={{left:item.left,top:item.top,fontSize:(item.fontSize*SCALE)+'px'}}
                  onClick={e=>{e.stopPropagation();setSelectedId(item.id);setTool('select')}}>{item.text}</button>
              ))}
            </div>
          </div>
        </section>
      ) : kind === 'docx' ? (
        <section className="wordWorkspace">
          <div className="wordToolbar">
            <div><FileType2 size={18}/> <b>Modo Word editável</b></div>
            <span>Edita diretamente o texto abaixo. Depois exporta para PDF.</span>
            <div className="wordSaveActions">
              <input className="saveName" value={saveName} onChange={e=>setSaveName(e.target.value)} aria-label="Nome do PDF" />
              <button className="btn saveBtn" onClick={()=>exportWordPdf()}><Save size={17}/> Guardar PDF</button>
              <button className="btn saveAsBtn" onClick={()=>askSaveAs(exportWordPdf)}><Download size={17}/> Guardar como...</button>
            </div>
          </div>
          <div className="wordPaper" ref={wordRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:wordHtml}} />
        </section>
      ) : (
        <section className="empty">
          <div className="fileIcons"><FileText size={58}/><FileType2 size={58}/></div>
          <h2>Abre um PDF ou Word (.docx)</h2>
          <p>PDF: seleciona texto existente, altera e exporta. Word: edita diretamente e guarda como PDF.</p>
        </section>
      )}

      <footer>{status}</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
