// ══════════════════════════════════════════════════════════════════════════
// (2026-10-30) AVISO POR CORREO: MATERIAL AUXILIAR BAJO MÍNIMO
// ──────────────────────────────────────────────────────────────────────────
// Cada artículo de material auxiliar puede tener un STOCK MÍNIMO (columna
// ALERTA MINIMO de la hoja STOCK MATERIAL AUXILIAR; se pone desde la app).
// Joaquín (30/10): cuando un artículo baje de su mínimo tiene que llegar un
// correo a Calidad, además de verse en rojo en la app.
//
// Misma regla que la app (index.html, stock por artículo):
//   · Se mira el ARTÍCULO (categoría + artículo), no el lote: se suma el stock
//     de todos sus lotes.
//   · Lotes en kg y en g se suman bien (todo a gramos y se presenta en kg; lo
//     mismo L/ml → L). El resto, en unidades.
//   · El mínimo del artículo = el mayor que tenga puesto cualquiera de sus lotes.
//   · Bajo mínimo = mínimo > 0 y total <= mínimo.
//
// Cuándo avisa: cada hora, aprovechando el activador del SCADA (cada 10 min).
// Manda correo SOLO cuando algún artículo ENTRA en bajo mínimo (no estaba en
// la lista del aviso anterior). En el correo van los nuevos y, debajo, todos
// los que siguen bajo mínimo. Cuando un artículo se repone, sale de la lista
// y, si vuelve a bajar, vuelve a avisar.
// ══════════════════════════════════════════════════════════════════════════
var CORREO_AVISO_MINIMOS = 'calidad@quesoselhidalgo.com,Joaquin@quesoselhidalgo.com';
var MINIMOS_CADA_MIN = 60;

function _avisoMinimosSiToca(){
  var props = PropertiesService.getScriptProperties();
  var ult = parseInt(props.getProperty('MINIMOS_ULT_REVISION') || '0', 10) || 0;
  if(Date.now() - ult < MINIMOS_CADA_MIN*60*1000) return;
  props.setProperty('MINIMOS_ULT_REVISION', String(Date.now()));
  revisarMinimosMaterial();
}

// Se puede ejecutar a mano desde el editor para probar (manda correo si hay nuevos).
function revisarMinimosMaterial(){
  var props = PropertiesService.getScriptProperties();
  var avisados = {};
  try{ avisados = JSON.parse(props.getProperty('MINIMOS_AVISADOS') || '{}'); }catch(e){ avisados = {}; }
  var bajos = _minimosBajos(), nuevos = [], ahora = {};
  bajos.forEach(function(a){
    ahora[a.k] = avisados[a.k] || Date.now();
    if(!avisados[a.k]) nuevos.push(a);
  });
  if(nuevos.length) _minimosMandarCorreo(nuevos, bajos);
  props.setProperty('MINIMOS_AVISADOS', JSON.stringify(ahora));   // los repuestos salen solos
  return bajos.length + ' bajo mínimo, ' + nuevos.length + ' nuevos';
}

// Para volver a recibir el correo con todos los que están bajo mínimo (prueba).
function probarAvisoMinimos(){
  PropertiesService.getScriptProperties().deleteProperty('MINIMOS_AVISADOS');
  return revisarMinimosMaterial();
}

function _minimosBajos(){
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_STOCK);
  if(!sh) return [];
  var d = sh.getDataRange().getValues();
  if(d.length < 2) return [];
  var h = d[0].map(function(x){ return String(x||'').trim().toUpperCase(); });
  function ix(){ for(var i=0;i<arguments.length;i++){ var j=h.indexOf(arguments[i]); if(j>=0) return j; } return -1; }
  var cCat = ix('CATEGORIA','CATEGORÍA'), cArt = ix('ARTICULO','ARTÍCULO'), cStk = ix('STOCK ACTUAL'),
      cMin = ix('ALERTA MINIMO','ALERTA MÍNIMO'), cUni = ix('UNIDAD');
  if(cArt < 0 || cStk < 0 || cMin < 0) return [];
  function n(v){ var x = parseFloat(String(v==null?'':v).replace(',','.')); return isNaN(x) ? 0 : x; }
  var arts = {};
  for(var r = 1; r < d.length; r++){
    var art = String(d[r][cArt]||'').trim(); if(!art) continue;
    var cat = cCat >= 0 ? String(d[r][cCat]||'').trim() : '';
    var k = cat.toUpperCase() + '|' + art.toUpperCase();
    var a = arts[k] || (arts[k] = {k:k, cat:cat, art:art, base:0, min:0, masa:false, liq:false, lotes:0});
    var u = String(cUni >= 0 ? d[r][cUni] : '').toLowerCase().trim(), s = Math.max(0, n(d[r][cStk]));
    if(u==='kg'||u==='g'||u==='gr'||u==='gramos') a.masa = true; else if(u==='l'||u==='litros'||u==='ml') a.liq = true;
    a.base += (u==='kg'||u==='l'||u==='litros') ? s*1000 : s;
    if(s > 0) a.lotes++;
    var m = n(d[r][cMin]); if(m > a.min) a.min = m;
  }
  var out = [];
  Object.keys(arts).forEach(function(k){
    var a = arts[k];
    a.uni = a.masa ? 'kg' : (a.liq ? 'L' : 'uds');
    a.tot = (a.masa || a.liq) ? a.base/1000 : a.base;
    a.tot = Math.round(a.tot*1000)/1000;
    if(a.min > 0 && a.tot <= a.min) out.push(a);
  });
  out.sort(function(x,y){ return (x.cat+x.art).localeCompare(y.cat+y.art); });
  return out;
}

function _minimosMandarCorreo(nuevos, todos){
  var hoy = Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy HH:mm');
  function fmt(x){ return String(x).replace('.', ','); }
  function linea(a){ return a.art + (a.cat ? ' (' + a.cat + ')' : '') + ': quedan ' + fmt(a.tot) + ' ' + a.uni + ' · mínimo ' + fmt(a.min) + ' ' + a.uni + (a.tot <= 0 ? ' · AGOTADO' : ''); }
  var asunto = 'AVISO TraceQueso · Material bajo mínimo: ' + nuevos.map(function(a){ return a.art; }).join(', ');
  if(asunto.length > 180) asunto = asunto.substring(0, 177) + '...';
  var L = [];
  L.push('Aviso de TraceQueso · ' + hoy);
  L.push('');
  L.push(nuevos.length === 1 ? 'Este artículo de material auxiliar acaba de bajar de su stock mínimo:' : 'Estos artículos de material auxiliar acaban de bajar de su stock mínimo:');
  L.push('');
  nuevos.forEach(function(a){ L.push('   ▶ ' + linea(a)); });
  L.push('');
  if(todos.length > nuevos.length){
    L.push('Todos los que están ahora mismo bajo mínimo (' + todos.length + '):');
    todos.forEach(function(a){ L.push('  · ' + linea(a)); });
    L.push('');
  }
  L.push('El stock es la suma de todos los lotes del artículo. Los mínimos se cambian en TraceQueso Oficina → Material auxiliar → Mínimos (o en la app, en el stock del artículo).');
  L.push('Este correo llega una vez cuando el artículo baja del mínimo; si se repone y vuelve a bajar, vuelve a llegar.');
  MailApp.sendEmail(CORREO_AVISO_MINIMOS, asunto, L.join('\n'));
}
