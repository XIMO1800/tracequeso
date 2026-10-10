' lanzar-guardar-xps.vbs - TraceQueso
' Arranca guardar-xps.ps1 SIN ventana (ni parpadeo en la pantalla del SCADA).
' Lo lanza cada minuto la tarea "TraceQueso Guardar XPS".
Set sh = CreateObject("WScript.Shell")
d = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & d & "\guardar-xps.ps1""", 0, False
