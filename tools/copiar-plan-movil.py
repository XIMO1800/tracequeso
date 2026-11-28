#!/usr/bin/env python3
# Copia del móvil (index.html) al escritorio (oficina.html) los CRITERIOS del
# plan de trabajo y del stock por salas: procesarDatos (sala, piezas, fecha de
# fabricación de cada palé) y las funciones apto*/dias* que deciden qué palé
# toca. Se meten tal cual dentro de un módulo cerrado (PLANM) para que no se
# mezclen con las funciones del escritorio. Si en el móvil cambia un criterio,
# basta volver a ejecutar:  python3 tools/copiar-plan-movil.py
import re, os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mov=open(os.path.join(R,'index.html'),encoding='utf-8').read()
FUN=['_anioAntesQR','_capasDos','_fechaFabIsoDesdeId','_getRegsPale','_loteVigente','_palLleva3Capa','_pale00',
 '_reglaSalaNueva','_salaEsFuerte','_tiene3Capa','apto3CapaAppSite','aptoC2AppSite','aptoOtraSalidaBajoSal',
 'aptoOtraSalidaSupermini','aptoOtraSalidaTierno','aptoSalidaAppSite','aptoSeleccionAppSite','aptoSeleccionCabra',
 'aptoVolteoAppSite','calcPesoMedio','candidatoSeleccion','descartadoSeleccion','diasCalendario','diasDesde',
 'diasDesdeC1','diasSeleccionSegunPeso','diasVolteoAppSite','enGolpeOSecadero','enSec','enSecadero','esBajoSal',
 'esMiniCabra','esTierno','estaEnGolfeFrio','fechaSeleccionPale','getPlanItems','getSalaActualPale','getVariedad',
 'matchPaleId','normPaleKey','normSala','normSeccion','normTipo','paleYaSalio','parseFecha','parsearId',
 'procesarDatos','ultimaSeleccionPale']
def cuerpo(name):
    ms=list(re.finditer(r'^function\s+'+re.escape(name)+r'\s*\(',mov,re.M))
    assert ms, 'no está en el móvil: '+name
    a=ms[-1].start(); k=mov.index('{',ms[-1].end()); d=0; ins=None
    while True:
        c=mov[k]
        if ins:
            if c=='\\': k+=2; continue
            if c==ins: ins=None
        elif c in '\'"`': ins=c
        elif mov.startswith('//',k): k=mov.index('\n',k); continue
        elif mov.startswith('/*',k): k=mov.index('*/',k)+2; continue
        elif c=='/' and re.match(r'[=(,:!&|?{};\[]\s*$', mov[max(0,k-20):k].rstrip()[-1:] or ';'):
            # literal de expresión regular
            j=k+1; cls=False
            while True:
                ch=mov[j]
                if ch=='\\': j+=2; continue
                if ch=='[': cls=True
                elif ch==']': cls=False
                elif ch=='/' and not cls: break
                elif ch=='\n': j=k; break
                j+=1
            k=j+1; continue
        elif c=='{': d+=1
        elif c=='}':
            d-=1
            if d==0: return mov[a:k+1]
        k+=1
def var(name):
    m=re.search(r'^var\s+'+re.escape(name)+r'\s*=[^\n]*;',mov,re.M); assert m,name; return m.group(0)
partes=[var(v) for v in ['CFG','TQMAP','FMAP','CAPA3_DIAS','SEL_CABRA_DIAS_MIN','SEL_CABRA_DIAS_MAX']]
partes+=[cuerpo(f) for f in FUN]
blq=('// ==PLANM-INICIO== (copiado del móvil con tools/copiar-plan-movil.py; no tocar a mano)\n'
 'var PLANM=(function(){\n'
 'var rawRows=[], pales=[], _regsPorPale=null, loteC1=\'\', loteC2=\'\', lotePinturaPorProducto={};\n'
 +'\n'.join(partes)+'\n'
 'function cargar(rows){ rawRows=rows||[]; procesarDatos(rawRows); return pales; }\n'
 'return {cargar:cargar, pales:function(){ return pales; }, CFG:CFG, SEL_CABRA_DIAS_MIN:SEL_CABRA_DIAS_MIN, SEL_CABRA_DIAS_MAX:SEL_CABRA_DIAS_MAX,\n'
 '  regs:_getRegsPale, diasDesde:diasDesde, diasDesdeC1:diasDesdeC1, diasVolteo:diasVolteoAppSite, estaEnGolfeFrio:estaEnGolfeFrio,\n'
 '  aptoVolteo:aptoVolteoAppSite, aptoC2:aptoC2AppSite, apto3Capa:apto3CapaAppSite, aptoSalida:aptoSalidaAppSite,\n'
 '  candidatoSeleccion:candidatoSeleccion, fechaSeleccion:fechaSeleccionPale, aptoTierno:aptoOtraSalidaTierno,\n'
 '  aptoSupermini:aptoOtraSalidaSupermini, aptoBajoSal:aptoOtraSalidaBajoSal, aptoSelCabra:aptoSeleccionCabra,\n'
 '  ultimaSeleccion:ultimaSeleccionPale, getPlanItems:getPlanItems, parsearId:parsearId};\n'
 '})();\n// ==PLANM-FIN==')
p=os.path.join(R,'oficina.html'); of=open(p,encoding='utf-8').read()
a=of.find('// ==PLANM-INICIO=='); b=of.find('// ==PLANM-FIN==')
assert a>=0 and b>a, 'faltan las marcas PLANM en oficina.html'
of=of[:a]+blq+of[b+len('// ==PLANM-FIN=='):]
open(p,'w',encoding='utf-8').write(of)
print('PLANM copiado:',len(FUN),'funciones,',len(blq),'caracteres')
