@echo off
rem PRUEBA SQL: SOLO LECTURA. Pregunta al SQL del WinCC que bases y tablas tiene.
rem No cambia nada. Resultado en C:\TraceQueso\sql-prueba.txt
set SQLCMD="C:\Program Files\Microsoft SQL Server\100\Tools\Binn\SQLCMD.EXE"
if not exist %SQLCMD% set SQLCMD="C:\Program Files (x86)\Microsoft SQL Server\100\Tools\Binn\SQLCMD.EXE"
if not exist %SQLCMD% set SQLCMD=sqlcmd
echo Preguntando al SQL del WinCC (solo lectura)...
%SQLCMD% -E -S .\WINCC -W -s " | " -i "%~dp0sql-prueba.sql" -o "C:\TraceQueso\sql-prueba.txt"
if errorlevel 1 echo Ha dado error. Mira el archivo sql-prueba.txt >> "C:\TraceQueso\sql-prueba.txt"
start notepad "C:\TraceQueso\sql-prueba.txt"
