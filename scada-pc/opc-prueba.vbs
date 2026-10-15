' ==========================================================================
'  PRUEBA OPC  (TraceQueso, 15/10/2026)  -  SOLO LECTURA
' --------------------------------------------------------------------------
'  Pregunta al PC qué servidores OPC hay, se conecta a ellos y apunta:
'    - la lista de variables (nombres) que ofrecen
'    - el valor ACTUAL de unas pocas que parezcan de cubas o temperaturas
'  NO ESCRIBE NADA en el SCADA ni en los autómatas: solo lee.
'  Resultado en C:\TraceQueso\opc-prueba.txt
'  Tiene que ejecutarse en 32 bits (lo hace opc-prueba.bat).
' ==========================================================================
Option Explicit
On Error Resume Next

Dim fso, out
Set fso = CreateObject("Scripting.FileSystemObject")
Set out = fso.CreateTextFile("C:\TraceQueso\opc-prueba.txt", True)
Sub L(t)
  out.WriteLine t
End Sub
Sub Fallo(donde)
  If Err.Number <> 0 Then
    L "   ! " & donde & ": " & Err.Description & " (" & Hex(Err.Number) & ")"
    Err.Clear
  End If
End Sub

L "Prueba OPC (solo lectura) - " & Now
L ""

' ---- 1. Qué servidores OPC hay -------------------------------------------
Dim auto, lista, i, nombres
auto = Empty
Set auto = CreateObject("OPC.Automation.1")
Fallo "crear OPC.Automation"
If Not IsObject(auto) Then
  L "No se puede usar el componente OPC.Automation. Fin."
  out.Close
  WScript.Quit
End If

L "==== 1. SERVIDORES OPC DE ESTE PC ===="
nombres = ""
lista = auto.GetOPCServers()
Fallo "GetOPCServers"
If IsArray(lista) Then
  For i = LBound(lista) To UBound(lista)
    L "   " & lista(i)
    nombres = nombres & "|" & lista(i)
  Next
Else
  L "   (no ha devuelto lista)"
End If
Set auto = Nothing

' ---- 2. Probar cada servidor interesante ---------------------------------
Dim candidatos, c
candidatos = Array("OPCServer.WinCC", "OPCServer.WinCC.1", "OPC.SimaticNET", "SiemensOPC.CmnDAServer")
If IsArray(lista) Then
  For i = LBound(lista) To UBound(lista)
    If InStr(1, lista(i), "WinCC", 1) > 0 And InStr(1, "|" & Join(candidatos, "|") & "|", "|" & lista(i) & "|", 1) = 0 Then
      ReDim Preserve candidatos(UBound(candidatos) + 1)
      candidatos(UBound(candidatos)) = lista(i)
    End If
  Next
End If

For Each c In candidatos
  Probar c
Next

L ""
L "==== FIN ===="
out.Close
CreateObject("WScript.Shell").Run "notepad.exe C:\TraceQueso\opc-prueba.txt"

' --------------------------------------------------------------------------
Sub Probar(nombre)
  Dim srv, br, n, k, id, grp, it, leidos, total
  br = Empty
  L ""
  L "==== SERVIDOR: " & nombre & " ===="
  Set srv = CreateObject("OPC.Automation.1")
  srv.Connect nombre, ""
  If Err.Number <> 0 Then
    Fallo "conectar"
    Exit Sub
  End If
  L "   Conectado. Estado del servidor: " & srv.ServerState & "  (1 = funcionando)"
  L "   Fabricante: " & srv.VendorInfo
  Fallo "datos del servidor"

  ' Lista de variables (de golpe, sin ramas)
  total = 0
  Set br = srv.CreateBrowser
  Fallo "CreateBrowser"
  If IsObject(br) Then
    br.ShowLeafs True
    Fallo "ShowLeafs"
    total = br.Count
    L "   Variables que ofrece: " & total
    n = total
    If n > 3000 Then n = 3000
    For k = 1 To n
      L "      " & br.GetItemID(br.Item(k))
    Next
    Fallo "listar variables"
    If total > 3000 Then L "      ... (se cortan aquí, hay " & total & ")"
  End If

  ' Valor actual de unas pocas variables de cubas / temperaturas
  If total > 0 Then
    L ""
    L "   -- VALORES ACTUALES (máx. 40 variables con CUBA, TEMP, AGIT o VALV en el nombre) --"
    Set grp = srv.OPCGroups.Add("tq_prueba")
    Fallo "crear grupo"
    leidos = 0
    For k = 1 To total
      If leidos >= 40 Then Exit For
      id = br.GetItemID(br.Item(k))
      If InStr(1, id, "CUBA", 1) > 0 Or InStr(1, id, "TEMP", 1) > 0 Or _
         InStr(1, id, "AGIT", 1) > 0 Or InStr(1, id, "VALV", 1) > 0 Then
        Set it = grp.OPCItems.AddItem(id, k)
        If Err.Number = 0 Then
          it.Read 2
          If Err.Number = 0 Then
            L "      " & id & " = " & it.Value & "   (calidad " & it.Quality & ", " & it.TimeStamp & ")"
          Else
            Fallo id
          End If
        Else
          Fallo id
        End If
        leidos = leidos + 1
      End If
    Next
    srv.OPCGroups.RemoveAll
    Err.Clear
  End If

  srv.Disconnect
  Err.Clear
  Set srv = Nothing
End Sub
