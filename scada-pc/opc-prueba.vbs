' ==========================================================================
'  PRUEBA OPC v3  (TraceQueso, 15/10/2026)  -  SOLO LECTURA
' --------------------------------------------------------------------------
'  La v2 demostró que el servidor OPC de SIMATIC NET (OPC.SimaticNET) SÍ
'  responde, y que el de WinCC no está activado. Esta v3 recorre el árbol
'  del de SIMATIC NET (carpetas y variables) para ver qué conexiones con los
'  autómatas tiene configuradas. NO LEE VALORES DE LOS AUTÓMATAS y NO ESCRIBE
'  NADA: solo pide al servidor la lista de nombres.
'  Resultado en C:\TraceQueso\opc-prueba.txt   (se lanza con opc-prueba.bat)
' ==========================================================================
Option Explicit
On Error Resume Next

Dim fso, out, cuenta
Set fso = CreateObject("Scripting.FileSystemObject")
Set out = fso.CreateTextFile("C:\TraceQueso\opc-prueba.txt", True)
cuenta = 0

Sub L(t)
  out.WriteLine t
End Sub

Function Res()
  If Err.Number <> 0 Then
    Res = "ERROR " & Err.Number & " (" & Hex(Err.Number) & "): " & Err.Description
  Else
    Res = "OK"
  End If
  Err.Clear
End Function

L "Prueba OPC v3 (solo nombres, SIMATIC NET) - " & Now
L ""

Dim srv, br
Set srv = CreateObject("OPC.Automation.1")
L "crear cliente: " & Res()
srv.Connect "OPC.SimaticNET", ""
L "conectar a OPC.SimaticNET: " & Res() & "   estado " & srv.ServerState
Set br = srv.CreateBrowser
L "crear navegador: " & Res()
Err.Clear
L ""
L "==== ARBOL (carpetas con >, variables con -) ===="
br.MoveToRoot
Recorrer br, 0

L ""
L "Total de lineas: " & cuenta
srv.Disconnect
L "desconectar: " & Res()
L "==== FIN ===="
out.Close
CreateObject("WScript.Shell").Run "notepad.exe C:\TraceQueso\opc-prueba.txt"

Sub Recorrer(b, nivel)
  On Error Resume Next
  Dim ramas(), nr, x, i, sang
  sang = String(nivel * 3, " ")
  If cuenta > 4000 Or nivel > 6 Then Exit Sub

  ' Variables (hojas) de este nivel
  b.ShowLeafs False
  If Err.Number <> 0 Then L sang & "   ! hojas: " & Res()
  For Each x In b
    L sang & "   - " & x & "   [" & b.GetItemID(x) & "]"
    Err.Clear
    cuenta = cuenta + 1
    If cuenta > 4000 Then Exit For
  Next

  ' Carpetas (ramas) de este nivel: primero se apuntan, luego se entra
  b.ShowBranches
  If Err.Number <> 0 Then L sang & "   ! ramas: " & Res()
  nr = 0
  ReDim ramas(0)
  For Each x In b
    ReDim Preserve ramas(nr)
    ramas(nr) = x
    nr = nr + 1
  Next
  Err.Clear
  For i = 0 To nr - 1
    L sang & "   > " & ramas(i)
    cuenta = cuenta + 1
    b.MoveDown ramas(i)
    If Err.Number = 0 Then
      Recorrer b, nivel + 1
      b.MoveUp
    Else
      L sang & "      ! entrar: " & Res()
    End If
    Err.Clear
  Next
End Sub
