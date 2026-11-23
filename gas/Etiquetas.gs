// ══════════════════════════════════════════════════════════════════════════
// (2026-11-23, API 33) CATÁLOGO DE ETIQUETAS DE MARCA
// ──────────────────────────────────────────────────────────────────────────
// Joaquín (23/11): las etiquetas son material auxiliar (categoría ETIQUETAS, con
// su stock por lotes). Aquí se guarda lo que no cabe en el stock:
//   CODIGO       el del programa de gestión (para cruzar datos más adelante)
//   ARTICULO     el nombre con que está en Material auxiliar (el de gestión)
//   NOMBRE CORTO el que ven en el móvil al envasar
//   ENVASADO     SI = sale en la lista de etiquetas del envasado
//
// Hoja: CATALOGO ETIQUETAS (se crea sola la primera vez)
// Lectura: va dentro de tipo=matAux (data.etiquetas).
// Escritura: POST {_SHEET:'ETIQUETA_CAT', accion:'guardar', codigo, articulo, corto, envasado, quien}
//                 {_SHEET:'ETIQUETA_CAT', accion:'guardarVarios', lista:[{codigo, articulo, corto, envasado}], quien}
//                 {_SHEET:'ETIQUETA_CAT', accion:'borrar', codigo | articulo}
// Una fila por CÓDIGO (si no tiene código, por ARTÍCULO).
// ══════════════════════════════════════════════════════════════════════════
var SHEET_ETIQ_CAT = 'CATALOGO ETIQUETAS';
var ETIQ_CAB = ['CODIGO','ARTICULO','NOMBRE CORTO','ENVASADO','ACTUALIZADO POR','ACTUALIZADO'];

function _hojaEtiqCat(crear){
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(SHEET_ETIQ_CAT);
  if(!sh && crear){
    sh = ss.insertSheet(SHEET_ETIQ_CAT);
    sh.getRange(1, 1, 1, ETIQ_CAB.length).setValues([ETIQ_CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // El código va como texto: «DSGTM», «CSÑ475SER*»… y alguno podría parecer número.
    sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}

function leerCatalogoEtiquetas(){
  var sh = _hojaEtiqCat(false);
  if(!sh) return [];
  var d = sh.getDataRange().getValues();
  if(d.length < 2) return [];
  var h = d[0].map(function(x){ return String(x||'').trim().toUpperCase(); });
  return d.slice(1).filter(function(r){ return String(r[h.indexOf('CODIGO')]||'').trim() || String(r[h.indexOf('ARTICULO')]||'').trim(); }).map(function(r){
    var o = {};
    h.forEach(function(k, i){ var v = r[i]; o[k] = (v instanceof Date) ? Utilities.formatDate(v, 'Europe/Madrid', 'dd/MM/yyyy HH:mm') : v; });
    return o;
  });
}

function gestionarCatalogoEtiqueta(p){
  function out(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
  // (API 35) SIN candado propio: doPost ya entra con el candado del script
  // (_conCandado). Pedirlo otra vez aquí hacía que la llamada se esperase a sí
  // misma 20 s y acabase en «Ocupado, vuelve a intentarlo» (Joaquín, 23/11).
  {
    var sh = _hojaEtiqCat(true);
    var d = sh.getDataRange().getValues();
    var h = d[0].map(function(x){ return String(x||'').trim().toUpperCase(); });
    ETIQ_CAB.forEach(function(c){ if(h.indexOf(c) < 0){ sh.getRange(1, h.length + 1).setValue(c).setFontWeight('bold'); h.push(c); } });
    d = sh.getDataRange().getValues();
    var cCod = h.indexOf('CODIGO'), cArt = h.indexOf('ARTICULO');
    function clave(cod, art){ cod = String(cod||'').trim().toUpperCase(); return cod ? ('C:'+cod) : ('A:'+String(art||'').trim().toUpperCase()); }
    var filaDe = {};
    for(var r = 1; r < d.length; r++) filaDe[clave(d[r][cCod], d[r][cArt])] = r + 1;
    var quien = String(p.quien||'').trim();
    var fecha = Utilities.formatDate(new Date(), 'Europe/Madrid', 'dd/MM/yyyy HH:mm');

    if(p.accion === 'borrar'){
      var fb = filaDe[clave(p.codigo, p.articulo)];
      if(!fb) return out({ok:false, error:'No encuentro esa etiqueta'});
      sh.deleteRow(fb);
      return out({ok:true, accion:'borrada'});
    }

    var lista = (p.accion === 'guardarVarios') ? (p.lista || []) : [p];
    var nuevas = [], hechas = 0;
    lista.forEach(function(x){
      var art = String(x.articulo||'').trim(), cod = String(x.codigo||'').trim().toUpperCase();
      if(!art && !cod) return;
      var val = {'CODIGO':cod, 'ARTICULO':art, 'NOMBRE CORTO':String(x.corto||'').trim().toUpperCase(),
                 'ENVASADO':(x.envasado===true || String(x.envasado).toUpperCase()==='SI') ? 'SI' : 'NO',
                 'ACTUALIZADO POR':quien, 'ACTUALIZADO':fecha};
      var fil = h.map(function(k){ return val.hasOwnProperty(k) ? val[k] : ''; });
      // (API 34) Cambio de código: la fila se busca por el código que tenía.
      var f = filaDe[clave(x.codigoAntes ? x.codigoAntes : cod, art)] || filaDe[clave(cod, art)];
      if(f){ sh.getRange(f, 1, 1, fil.length).setValues([fil]); }
      else { nuevas.push(fil); filaDe[clave(cod, art)] = -1; }
      hechas++;
    });
    if(nuevas.length){
      var desde = sh.getLastRow() + 1;
      sh.getRange(desde, 1, nuevas.length, h.length).setNumberFormat('@').setValues(nuevas);
    }
    return out({ok:true, guardadas:hechas});
  }
}
