const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

function doGet() {
  return json_({ ok: true, service: 'RJP OCR Proxy', status: 'online' });
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('VISION_API_KEY');
    const expectedToken = props.getProperty('PROXY_TOKEN');

    if (!apiKey) return json_({ ok:false, error:'VISION_API_KEY não configurada.' });
    if (!expectedToken) return json_({ ok:false, error:'PROXY_TOKEN não configurado.' });

    let data = {};
    try { data = JSON.parse(e.postData.contents || '{}'); }
    catch (err) { return json_({ ok:false, error:'JSON inválido.' }); }

    if (!data.token || data.token !== expectedToken) return json_({ ok:false, error:'Token inválido.' });

    let imageBase64 = data.imageBase64 || data.image || data.content || '';
    imageBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    if (!imageBase64) return json_({ ok:false, error:'Imagem não recebida.' });

    const payload = { requests:[{ image:{content:imageBase64}, features:[{type:'DOCUMENT_TEXT_DETECTION'}], imageContext:{languageHints:data.languageHints || ['pt']} }] };
    const response = UrlFetchApp.fetch(VISION_URL + '?key=' + encodeURIComponent(apiKey), {
      method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true
    });
    const status=response.getResponseCode();
    let result;
    try { result=JSON.parse(response.getContentText()); }
    catch (err) { return json_({ok:false,status,error:'Resposta inválida do Google Vision.'}); }
    if(status<200||status>=300) return json_({ok:false,status,error:result});
    const vision=result.responses && result.responses[0];
    if(!vision) return json_({ok:false,error:'Resposta vazia do Google Vision.'});
    if(vision.error) return json_({ok:false,error:vision.error});
    const text=vision.fullTextAnnotation?.text || vision.textAnnotations?.[0]?.description || '';
    return json_({ok:true,text,fullTextAnnotation:vision.fullTextAnnotation||null});
  } catch(err) {
    return json_({ok:false,error:String(err)});
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
