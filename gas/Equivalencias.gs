// ══════════════════════════════════════════════════════════════════════════
// (2026-10-31) RELACIÓN UNIDADES ↔ PESO DEL MATERIAL AUXILIAR (fermentos)
// ──────────────────────────────────────────────────────────────────────────
// Joaquín (31/10): los albaranes de fermentos vienen en UNIDADES (U) pero en la
// fábrica todo se lleva por PESO. Cada formato tiene su relación (p. ej. una
// bolsa de 500 U pesa 485 g; una de 2.000 U, 1.800 g). Esa relación se apunta
// aquí, por categoría y artículo, y al dar la entrada se escriben las unidades
// del albarán y la app calcula los gramos.
//
// Hoja: EQUIVALENCIAS UNIDADES PESO (se crea sola la primera vez)
//   ID · CATEGORIA · ARTICULO · UNIDADES · GRAMOS · OBSERVACIONES · ACTUALIZADO POR · ACTUALIZADO
// Un artículo puede tener más de un formato (una fila por formato).
//
// Lectura: va dentro de tipo=matAux (data.equiv).
// Escritura: POST {_SHEET:'EQUIVALENCIA', accion:'guardar'|'borrar', id, categoria,
//                  articulo, unidades, gramos, obs, quien}
// ══════════════════════════════════════════════════════════════════════════
var SHEET_EQUIV = 'EQUIVALENCIAS UNIDADES PESO';
var EQUIV_CAB = ['ID','CATEGORIA','ARTICULO','UNIDADES','GRAMOS','OBSERVACIONES','ACTUALIZADO POR','ACTUALIZADO'];

function _hojaEquiv(crear){
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_EQUIV);
  if(!sh && crear){
    sh = ss.insertSheet(SHEET_EQUIV);
    sh.getRange(1, 1, 1, EQUIV_CAB.length).setValues([EQUIV_CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function leerEquivalencias(){
  var sh = _hojaEquiv(false);
  if(!sh) return [];
  var d = sh.getDataRange().getValues();
  if(d.length < 2) return [];
  var h = d[0].map(function(x){ return String(x||'').trim().toUpperCase(); });
  return d.slice(1).filter(function(r){ return String(r[h.indexOf('ARTICULO')]||'').trim(); }).map(function(r){
    var o = {};
    h.forEach(function(k, i){ var v = r[i]; o[k] = (v instanceof Date) ? Utilities.formatDate(v, 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : v; });
    return o;
  });
}

function gestionarEquivalencia(p){
  function out(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
  var sh = _hojaEquiv(true);
  var d = sh.getDataRange().getValues();
  var h = d[0].map(function(x){ return String(x||'').trim().toUpperCase(); });
  var cId = h.indexOf('ID');
  var id = String(p.id||'').trim(), fila = -1;
  if(id) for(var r = 1; r < d.length; r++){ if(String(d[r][cId]).trim() === id){ fila = r + 1; break; } }

  if(p.accion === 'borrar'){
    if(fila < 0) return out({ok:false, error:'No encuentro esa equivalencia'});
    sh.deleteRow(fila);
    return out({ok:true, accion:'borrada'});
  }

  var uds = parseFloat(String(p.unidades||'').replace(',', '.')) || 0;
  var g   = parseFloat(String(p.gramos||'').replace(',', '.')) || 0;
  var art = String(p.articulo||'').trim();
  if(!art)  return out({ok:false, error:'Falta el artículo'});
  if(uds <= 0 || g <= 0) return out({ok:false, error:'Las unidades y los gramos tienen que ser mayores que 0'});
  if(!id) id = 'EQ-' + Date.now();
  var fecha = Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy HH:mm');
  var val = {ID:id, CATEGORIA:String(p.categoria||'').trim(), ARTICULO:art, UNIDADES:uds, GRAMOS:g,
             OBSERVACIONES:String(p.obs||'').trim(), 'ACTUALIZADO POR':String(p.quien||'').trim(), ACTUALIZADO:fecha};
  var fil = h.map(function(k){ return val.hasOwnProperty(k) ? val[k] : ''; });
  if(fila > 0) sh.getRange(fila, 1, 1, fil.length).setValues([fil]);
  else sh.appendRow(fil);
  return out({ok:true, id:id});
}
