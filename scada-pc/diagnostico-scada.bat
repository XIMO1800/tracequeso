@echo off
rem Diagnostico del PC del SCADA: solo mira, no cambia nada.
rem Doble clic. Tarda 1-3 minutos y al acabar abre el resultado en el Bloc de notas.
echo Mirando lo que hay instalado en este PC (no se cambia nada)...
echo Puede tardar unos minutos. No cierres esta ventana.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostico-scada.ps1"
