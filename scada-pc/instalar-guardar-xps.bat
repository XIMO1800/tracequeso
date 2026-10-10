@echo off
echo Instalando la tarea "TraceQueso Guardar XPS" (cada minuto)...
schtasks /create /tn "TraceQueso Guardar XPS" /tr "wscript.exe //B C:\TraceQueso\lanzar-guardar-xps.vbs" /sc minute /mo 1 /f
echo.
echo Si arriba pone CORRECTO, ya esta. Pulsa una tecla para cerrar.
pause > nul
