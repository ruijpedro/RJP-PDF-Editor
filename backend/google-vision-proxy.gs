/**
 * RJP Scanner Pro - Google Cloud Vision proxy (Google Apps Script)
 * Script Properties obrigatórias:
 *   GOOGLE_VISION_API_KEY = chave da API Google Cloud Vision
 *   RJP_OCR_TOKEN         = token aleatório longo que também defines na app
 * Publica como Web App. A chave Google nunca fica no GitHub nem no cliente.
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('RJP_OCR_TOKEN');
    if (!token || body.token !== token) return json({error:'Não autorizado'}, 403);
    const key = props.getProperty('GOOGLE_VISION_API_KEY');
    if (!key) return json({error:'GOOGLE_VISION_API_KEY não configurada'}, 500);
    const payload = {requests:[{image:{content:body.imageBase64},features:[{type:'DOCUMENT_TEXT_DETECTION'}],imageContext:{languageHints:body.languageHints || ['pt']}}]};
    const r = UrlFetchApp.fetch('https://vision.googleapis.com/v1/images:annotate?key=' + encodeURIComponent(key), {method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true});
    const data = JSON.parse(r.getContentText() || '{}');
    if (r.getResponseCode() >= 300) return json({error:(data.error && data.error.message) || 'Erro Google Vision'}, r.getResponseCode());
    const a = data.responses && data.responses[0];
    return json({text:(a && a.fullTextAnnotation && a.fullTextAnnotation.text) || '', provider:'google-vision'});
  } catch (err) { return json({error:String(err && err.message || err)},500); }
}
function json(obj, code) {
  // Apps Script ContentService não permite definir status HTTP de forma portátil; o campo error é sempre verificado pelo cliente.
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
