# Apps Script de TraceQueso

Esta carpeta ES el Apps Script implantado. Al subir a `main` un cambio en
`gas/*.gs` o `gas/appsscript.json`, el flujo **«Apps Script · implantar»**
lo sube con clasp y hace «Nueva versión» sobre la MISMA implementación
(la dirección de la API no cambia). Nadie pega código a mano.

- `clasp-id.json`: ID del script y de la implementación.
- «Apps Script · traer lo implantado» (a mano): copia lo que haya en el Apps
  Script a la rama `apps-script-actual`, para comparar.
- OJO: clasp sustituye el proyecto ENTERO por esta carpeta. Un archivo que
  esté en el Apps Script y no aquí, se borra.
