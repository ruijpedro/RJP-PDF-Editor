import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import {
  FileText, FileType2, Upload, Download, Lock, Unlock, MousePointer2,
  Type, Save, Trash2, ChevronLeft, ChevronRight, Info, Mic, MicOff, BadgeCheck
} from 'lucide-react';
import './style.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SCALE = 1.35;
const PROJECT_FILE = 'rjp-editable.json';
const BASE_FILE = 'rjp-base.pdf';
const PROJECT_MAGIC = 'RJP_PDF_EDITOR_PROJECT';
const PROJECT_VERSION = 1;

const cloneBytes = (bytes) => Uint8Array.from(bytes || []);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function bytesFromAttachment(att) {
  if (!att?.content) return null;
  return att.content instanceof Uint8Array ? cloneBytes(att.content) : new Uint8Array(att.content);
}

function jsonBytes(obj) {
  return new TextEncoder().encode(JSON.stringify(obj));
}

function decodeJson(bytes) {
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { return null; }
}

function randomSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function derivePassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(x => parseInt(x, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function App() {
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState(null); // pdf | word
  const [status, setStatus] = useState('Abre um PDF ou Word para começar.');
  const [password, setPassword] = useState('');
  const [lockInfo, setLockInfo] = useState(null);
  const [unlocked, setUnlocked] = useState(true);
  const [isRjpPdf, setIsRjpPdf] = useState(false);

  // PDF base/editing
  const [pdfProxy, setPdfProxy] = useState(null);
  const [basePdfBytes, setBasePdfBytes] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [pageMeta, setPageMeta] = useState(null);
  const [textItems, setTextItems] = useState([]);
  const [changes, setChanges] = useState({});
  const [newTexts, setNewTexts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select');

  // Word / Word-backed editable PDF
  const [wordHtml, setWordHtml] = useState('');
  const wordRef = useRef(null);

  // Common
  const [saveName, setSaveName] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);
  const pageWrapRef = useRef(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    if (selectedId.startsWith('new:')) return newTexts.find(x => x.id === selectedId) || null;
    return textItems.find(x => x.id === selectedId) || null;
  }, [selectedId, textItems, newTexts]);

  function normalisePdfName(name) {
    const clean = (name || 'documento_editado.pdf').trim().replace(/[\\/:*?"<>|]+/g, '_');
    return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function resetAll() {
    setPdfProxy(null); setBasePdfBytes(null); setPageNo(1); setPageMeta(null);
    setTextItems([]); setChanges({}); setNewTexts([]); setSelectedId(null);
    setWordHtml(''); setTool('select'); setPassword(''); setLockInfo(null);
    setUnlocked(true); setIsRjpPdf(false);
  }

  async function openPdf(f, topBytes) {
    const topProxy = await pdfjsLib.getDocument({ data: cloneBytes(topBytes) }).promise;
    const attachments = await topProxy.getAttachments().catch(() => null);
    const projectAtt = attachments?.[PROJECT_FILE];
    const project = projectAtt ? decodeJson(bytesFromAttachment(projectAtt)) : null;
    const validProject = project?.magic === PROJECT_MAGIC;

    if (validProject && project.mode === 'word') {
      setKind('word');
      setWordHtml(project.html || '<p></p>');
      setLockInfo(project.lock || null);
      setUnlocked(!project.lock);
      setIsRjpPdf(true);
      setStatus('PDF editável RJP aberto. O conteúdo original do Word continua editável dentro deste PDF.');
      return;
    }

    let baseBytes = cloneBytes(topBytes);
    let baseProxy = topProxy;
    if (validProject && project.mode === 'pdf') {
      const baseAtt = attachments?.[BASE_FILE];
      const embeddedBase = bytesFromAttachment(baseAtt);
      if (embeddedBase?.length) {
        baseBytes = embeddedBase;
        baseProxy = await pdfjsLib.getDocument({ data: cloneBytes(baseBytes) }).promise;
      }
      setChanges(project.changes || {});
      setNewTexts(project.newTexts || []);
      setLockInfo(project.lock || null);
      setUnlocked(!project.lock);
      setIsRjpPdf(true);
      setStatus(`PDF editável RJP aberto: ${baseProxy.numPages} página(s). As alterações anteriores foram recuperadas.`);
    } else {
      setStatus(`PDF aberto: ${topProxy.numPages} página(s). Ao guardar, passa a PDF editável RJP.`);
    }
    setKind('pdf');
    setBasePdfBytes(baseBytes);
    setPdfProxy(baseProxy);
  }

  async function openFile(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    resetAll();
    setFile(f);
    setSaveName(normalisePdfName(f.name.replace(/\.(pdf|docx)$/i, '')));
    const ext = f.name.toLowerCase();
    try {
      const arr = await f.arrayBuffer();
      if (ext.endsWith('.pdf')) {
        await openPdf(f, new Uint8Array(arr));
      } else if (ext.endsWith('.docx')) {
        setKind('word');
        const result = await mammoth.convertToHtml({ arrayBuffer: arr });
        setWordHtml(result.value || '<p></p>');
        setStatus('Word aberto. Edita e guarda: o novo PDF ficará reeditável nesta WebApp.');
      } else {
        alert('Formato não suportado. Usa PDF ou DOCX.');
        setFile(null); setKind(null);
      }
    } catch (err) {
      console.error(err);
      alert(`Não foi possível abrir o ficheiro. ${err?.message || ''}`);
      setStatus('Erro ao abrir ficheiro.');
    } finally {
      ev.target.value = '';
    }
  }

  async function protectFile() {
    if (!file) return alert('Abre primeiro um ficheiro.');
    if (!password.trim()) return alert('Define uma password.');
    const salt = randomSalt();
    const hash = await derivePassword(password, salt);
    setLockInfo({ salt, hash, algorithm: 'PBKDF2-SHA256-150000' });
    setUnlocked(true);
    setStatus('Password definida. Ficará gravada dentro do PDF quando carregares em Guardar.');
  }

  async function unlockFile() {
    if (!lockInfo) return setUnlocked(true);
    if (!password) return alert('Introduz a password.');
    const hash = await derivePassword(password, lockInfo.salt);
    if (hash === lockInfo.hash) {
      setUnlocked(true);
      setStatus('Documento desbloqueado.');
    } else alert('Password incorreta.');
  }

  async function removeProtection() {
    if (!lockInfo) return;
    if (!password) return alert('Introduz a password atual.');
    const hash = await derivePassword(password, lockInfo.salt);
    if (hash !== lockInfo.hash) return alert('Password incorreta.');
    setLockInfo(null); setUnlocked(true); setPassword('');
    setStatus('Proteção removida. A alteração fica permanente no próximo Guardar.');
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
      const ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, background: 'white' }).promise;
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

  useEffect(() => {
    setChanges(c => {
      let dirty = false;
      const next = { ...c };
      for (const item of textItems) {
        if (next[item.id] && !next[item.id].meta) {
          next[item.id] = { ...next[item.id], meta: { x:item.x, y:item.y, width:item.width, fontSize:item.fontSize, page:item.page } };
          dirty = true;
        }
      }
      return dirty ? next : c;
    });
  }, [textItems]);

  function textValue(item) {
    return changes[item.id]?.text ?? item.original;
  }

  function updateSelected(text) {
    if (!selected) return;
    if (selected.id.startsWith('new:')) {
      setNewTexts(xs => xs.map(x => x.id === selected.id ? { ...x, text } : x));
    } else {
      const meta = { x:selected.x, y:selected.y, width:selected.width, fontSize:selected.fontSize, page:selected.page };
      setChanges(c => ({ ...c, [selected.id]: { ...(c[selected.id] || {}), text, meta: c[selected.id]?.meta || meta } }));
    }
  }

  function deleteSelected() {
    if (!selected) return;
    if (selected.id.startsWith('new:')) setNewTexts(xs => xs.filter(x => x.id !== selected.id));
    else updateSelected('');
    setSelectedId(null);
  }

  function onPageClick(e) {
    if (tool !== 'text' || !pageMeta || !pageWrapRef.current) return;
    if (e.target.closest('.pdf-hit,.newText')) return;
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

  function currentProject(mode, extra = {}) {
    return {
      magic: PROJECT_MAGIC,
      version: PROJECT_VERSION,
      savedAt: new Date().toISOString(),
      mode,
      sourceName: file?.name || '',
      lock: lockInfo || null,
      ...extra
    };
  }

  function safeText(str) {
    // Standard Helvetica supports Portuguese/Western European text. Replace rare unsupported glyphs rather than failing the save.
    return String(str ?? '').replace(/[\u{10000}-\u{10FFFF}]/gu, '□');
  }

  function applyPdfEdits(doc, font) {
    for (const [id, ch] of Object.entries(changes)) {
      const meta = ch.meta;
      if (!meta) continue;
      const page = doc.getPages()[(meta.page || Number(id.match(/^p(\d+):/)?.[1]) || 1) - 1];
      if (!page) continue;
      const size = Math.max(6, meta.fontSize || 11);
      page.drawRectangle({
        x: Math.max(0, meta.x - 1),
        y: Math.max(0, meta.y - size * 0.25),
        width: Math.max((meta.width || size) + 4, 6),
        height: size * 1.28,
        color: rgb(1,1,1)
      });
      if ((ch.text ?? '').length) {
        page.drawText(safeText(ch.text), { x: meta.x, y: meta.y, size, font, color: rgb(0,0,0), maxWidth: Math.max(page.getWidth() - meta.x - 6, 20) });
      }
    }
    for (const nt of newTexts) {
      const page = doc.getPages()[nt.page - 1];
      if (!page || !nt.text) continue;
      page.drawText(safeText(nt.text), { x: nt.x, y: nt.y, size: nt.fontSize || 12, font, color: rgb(0,0,0), maxWidth: Math.max(page.getWidth() - nt.x - 6, 20) });
    }
  }

  async function buildVectorPdf() {
    const doc = await PDFDocument.load(cloneBytes(basePdfBytes), { ignoreEncryption: true, updateMetadata: false });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    applyPdfEdits(doc, font);
    const project = currentProject('pdf', { changes, newTexts });
    await doc.attach(cloneBytes(basePdfBytes), BASE_FILE, { mimeType: 'application/pdf', description: 'Base original para reedição no RJP PDF Editor' });
    await doc.attach(jsonBytes(project), PROJECT_FILE, { mimeType: 'application/json', description: 'Dados editáveis do RJP PDF Editor' });
    return new Uint8Array(await doc.save({ useObjectStreams: false, addDefaultPage: false }));
  }

  async function buildRasterPdf() {
    const source = await pdfjsLib.getDocument({ data: cloneBytes(basePdfBytes) }).promise;
    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    for (let n = 1; n <= source.numPages; n++) {
      setStatus(`Modo compatibilidade: a reconstruir página ${n}/${source.numPages}...`);
      const srcPage = await source.getPage(n);
      const raw = srcPage.getViewport({ scale: 1 });
      const renderVp = srcPage.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(renderVp.width); canvas.height = Math.ceil(renderVp.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      await srcPage.render({ canvasContext: ctx, viewport: renderVp, background: 'white' }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
      if (!blob) throw new Error('Falha ao rasterizar a página.');
      const jpg = await outDoc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const page = outDoc.addPage([raw.width, raw.height]);
      page.drawImage(jpg, { x:0, y:0, width:raw.width, height:raw.height });
    }
    applyPdfEdits(outDoc, font);
    const project = currentProject('pdf', { changes, newTexts });
    await outDoc.attach(cloneBytes(basePdfBytes), BASE_FILE, { mimeType: 'application/pdf', description: 'Base original para reedição no RJP PDF Editor' });
    await outDoc.attach(jsonBytes(project), PROJECT_FILE, { mimeType: 'application/json', description: 'Dados editáveis do RJP PDF Editor' });
    return new Uint8Array(await outDoc.save({ useObjectStreams: false, addDefaultPage: false }));
  }

  async function inkScore(bytes) {
    const proxy = await pdfjsLib.getDocument({ data: cloneBytes(bytes) }).promise;
    if (!proxy.numPages) return 0;
    const maxPages = Math.min(proxy.numPages, 2);
    let score = 0;
    for (let n=1; n<=maxPages; n++) {
      const page = await proxy.getPage(n);
      const vp = page.getViewport({ scale: 0.25 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(vp.width)); canvas.height = Math.max(1, Math.ceil(vp.height));
      const ctx = canvas.getContext('2d', { alpha:false });
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      await page.render({ canvasContext:ctx, viewport:vp, background:'white' }).promise;
      const d = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      for (let i=0;i<d.length;i+=16) {
        if (d[i] < 242 || d[i+1] < 242 || d[i+2] < 242) score++;
      }
    }
    return score;
  }

  async function savePdf(customName = null) {
    if (!basePdfBytes) return;
    try {
      // V0.8: guardar sempre em modo seguro. Em vez de regravar o PDF original,
      // reconstruímos todas as páginas num PDF novo a partir daquilo que o browser
      // realmente consegue renderizar. Isto evita PDFs que o Acrobat abre em branco.
      setStatus('Guardar seguro: a reconstruir o PDF página a página...');
      const out = await buildRasterPdf();

      // Validação final: o ficheiro recém-criado tem de voltar a abrir no PDF.js
      // e apresentar tinta/conteúdo antes de ser descarregado.
      const proxy = await pdfjsLib.getDocument({ data: cloneBytes(out) }).promise;
      if (!proxy.numPages) throw new Error('O PDF gerado não contém páginas.');
      const outInk = await inkScore(out);
      if (outInk < 8) throw new Error('O PDF resultante parece estar vazio. O ficheiro não foi descarregado.');

      const finalName = normalisePdfName(customName || saveName || 'documento.pdf');
      downloadBlob(new Blob([out], { type:'application/pdf' }), finalName);
      setSaveName(finalName);
      setIsRjpPdf(true);
      setStatus('PDF guardado em modo seguro. As páginas foram reconstruídas para evitar ficheiros em branco no Adobe Acrobat.');
    } catch (err) {
      console.error(err);
      alert(`Não foi possível guardar o PDF: ${err?.message || err}`);
      setStatus('Guardar cancelado: não foi criado nenhum PDF vazio.');
    }
  }

  async function wordToRawPdf() {
    const node = wordRef.current;
    if (!node) throw new Error('Editor Word indisponível.');
    const visibleText = (node.innerText || '').trim();
    const hasVisualContent = !!node.querySelector('img,table,svg,canvas');
    if (!visibleText && !hasVisualContent) throw new Error('O documento está vazio.');
    const options = {
      margin: [10,10,10,10],
      image: { type:'jpeg', quality:0.98 },
      html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, scrollX:0, scrollY:0 },
      jsPDF: { unit:'mm', format:'a4', orientation:'portrait', compress:true },
      pagebreak: { mode:['css','legacy'] }
    };
    const ab = await html2pdf().set(options).from(node).outputPdf('arraybuffer');
    return new Uint8Array(ab);
  }

  async function saveWordPdf(customName = null) {
    if (!wordRef.current) return;
    try {
      setStatus('A gerar PDF editável a partir do Word...');
      const html = wordRef.current.innerHTML;
      const raw = await wordToRawPdf();
      const rawInk = await inkScore(raw);
      if (rawInk < 8) throw new Error('A conversão resultou numa página vazia. O ficheiro não foi guardado.');
      const doc = await PDFDocument.load(raw, { updateMetadata:false });
      const project = currentProject('word', { html });
      await doc.attach(jsonBytes(project), PROJECT_FILE, { mimeType:'application/json', description:'Conteúdo editável do RJP PDF Editor' });
      const out = new Uint8Array(await doc.save({ useObjectStreams:false, addDefaultPage:false }));
      const finalName = normalisePdfName(customName || saveName || 'documento.pdf');
      downloadBlob(new Blob([out], { type:'application/pdf' }), finalName);
      setWordHtml(html);
      setSaveName(finalName);
      setIsRjpPdf(true);
      setStatus('PDF criado e validado. Fecha-o e volta a abrir este mesmo PDF aqui: o conteúdo continua editável.');
    } catch (err) {
      console.error(err);
      alert(`Não foi possível guardar: ${err?.message || err}`);
      setStatus('Guardar cancelado para evitar um PDF em branco.');
    }
  }

  function askSaveAs(action) {
    const proposed = normalisePdfName(saveName || 'documento.pdf');
    const chosen = window.prompt('Guardar como — nome do novo PDF:', proposed);
    if (chosen === null) return;
    const finalName = normalisePdfName(chosen);
    setSaveName(finalName);
    action(finalName);
  }

  function toggleDictation() {
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('O ditado do browser não está disponível. No Android, toca no campo e usa o microfone do Gboard.');
      return;
    }
    if (kind === 'pdf' && !selected) return alert('Seleciona primeiro um texto do PDF.');
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-PT'; recognition.interimResults = true; recognition.continuous = false;
    let finalText = '';
    const base = kind === 'pdf' && selected ? (selected.id.startsWith('new:') ? (selected.text || '') : (textValue(selected) || '')) : '';
    recognition.onstart = () => setListening(true);
    recognition.onresult = event => {
      let interim = '';
      for (let i=event.resultIndex;i<event.results.length;i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t; else interim += t;
      }
      const spoken = (finalText + interim).trim();
      if (spoken && kind === 'pdf') updateSelected((base && !base.endsWith(' ') ? base + ' ' : base) + spoken);
    };
    recognition.onerror = event => { console.error(event); setListening(false); if (event.error !== 'aborted') alert('Não foi possível usar o ditado. Usa o microfone do Gboard diretamente no campo.'); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  const lockedView = file && !!lockInfo && !unlocked;

  return (
    <main>
      <header>
        <div className="brand"><span className="rjp">RJP</span><span>PDF Editor</span><span className="version">V0.8</span></div>
        <div className="subtitle">Guardar seguro • PDF persistente e reeditável • GitHub Pages</div>
      </header>

      <section className="topbar">
        <label className="btn primary"><Upload size={18}/> Abrir PDF / Word
          <input hidden type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={openFile}/>
        </label>
        <div className="passwordBox">
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password deste ficheiro" />
          <button className="btn" onClick={protectFile}><Lock size={16}/> Proteger</button>
          {lockInfo && !unlocked && <button className="btn" onClick={unlockFile}><Unlock size={16}/> Desbloquear</button>}
          {lockInfo && unlocked && <button className="btn ghost" onClick={removeProtection}>Remover proteção</button>}
        </div>
        {isRjpPdf && <div className="rjpBadge"><BadgeCheck size={16}/> PDF editável RJP</div>}
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
            <p className="hint">Estás a abrir o PDF real. Clica no texto existente para o alterar. Quando guardares, a app grava também os dados de reedição dentro do próprio PDF.</p>

            <h3>Texto selecionado</h3>
            {selected ? <>
              <textarea className="editText" value={selected.id.startsWith('new:') ? selected.text : textValue(selected)} onChange={e=>updateSelected(e.target.value)} inputMode="text" />
              <button className={listening ? 'btn micBtn listening' : 'btn micBtn'} onClick={toggleDictation}>
                {listening ? <MicOff size={16}/> : <Mic size={16}/>} {listening ? 'Parar ditado' : 'Ditar texto'}
              </button>
              <div className="smallGrid">
                <label>Tamanho
                  <input type="number" min="6" max="72" value={selected.fontSize || 12} onChange={e=>{
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
              <button className="btn saveBtn" onClick={()=>savePdf()}><Save size={17}/> Guardar PDF</button>
              <button className="btn saveAsBtn" onClick={()=>askSaveAs(savePdf)}><Download size={17}/> Guardar como...</button>
            </div>
            <div className="notice"><Info size={16}/><span>Na V0.8 o Guardar usa sempre o modo seguro: reconstrói todas as páginas num PDF novo e valida o resultado antes do download. Isto evita o PDF branco no Adobe Acrobat.</span></div>
          </aside>

          <div className="pdfArea">
            <div className={`pdfPage ${tool==='text'?'addTextMode':''}`} ref={pageWrapRef} onClick={onPageClick} style={pageMeta?{width:pageMeta.cssWidth,height:pageMeta.cssHeight}:undefined}>
              <canvas ref={canvasRef}/>
              {textItems.map(item => {
                const changed = changes[item.id];
                return <button key={item.id} className={`pdf-hit ${selectedId===item.id?'selected':''} ${changed?'changed':''}`}
                  style={{left:item.left,top:item.top,width:item.cssWidth,height:item.cssHeight,fontSize:`${item.fontSize*SCALE}px`,lineHeight:1.05}}
                  title={textValue(item)}
                  onClick={e=>{e.stopPropagation();setSelectedId(item.id);setTool('select')}}>
                  <span>{textValue(item)}</span>
                </button>;
              })}
              {newTexts.filter(x=>x.page===pageNo).map(item=>(
                <button key={item.id} className={`newText ${selectedId===item.id?'selected':''}`}
                  style={{left:item.left,top:item.top,fontSize:(item.fontSize*SCALE)+'px'}}
                  onClick={e=>{e.stopPropagation();setSelectedId(item.id);setTool('select')}}>{item.text}</button>
              ))}
            </div>
          </div>
        </section>
      ) : kind === 'word' ? (
        <section className="wordWorkspace">
          <div className="wordToolbar">
            <div><FileType2 size={18}/> <b>{isRjpPdf ? 'PDF editável (origem Word)' : 'Word editável'}</b></div>
            <span>{isRjpPdf ? 'Abriste um PDF e recuperámos o conteúdo editável guardado dentro dele.' : 'Edita o Word; depois o PDF gerado poderá ser reaberto e alterado nesta app.'}</span>
            <div className="wordSaveActions">
              <input className="saveName" value={saveName} onChange={e=>setSaveName(e.target.value)} aria-label="Nome do PDF" />
              <button className="btn saveBtn" onClick={()=>saveWordPdf()}><Save size={17}/> Guardar PDF</button>
              <button className="btn saveAsBtn" onClick={()=>askSaveAs(saveWordPdf)}><Download size={17}/> Guardar como...</button>
            </div>
          </div>
          <div className="wordPaper" ref={wordRef} contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:wordHtml}} />
        </section>
      ) : (
        <section className="empty">
          <div className="fileIcons"><FileText size={58}/><FileType2 size={58}/></div>
          <h2>Abre um PDF ou Word (.docx)</h2>
          <p>Word → PDF reeditável. PDF normal → PDF reeditável RJP. O ficheiro guardado deixa de depender do Word original.</p>
        </section>
      )}

      <footer>{status}</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App/>);
