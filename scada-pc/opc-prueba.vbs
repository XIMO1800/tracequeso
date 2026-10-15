' ==========================================================================
'  PRUEBA OPC v2  (TraceQueso, 15/10/2026)  -  SOLO LECTURA
' --------------------------------------------------------------------------
'  1. Busca en el registro de Windows qué servidores OPC DA hay de verdad.
'  2. Intenta conectarse a cada uno y apunta el resultado PASO A PASO
'     (conectado o el error exacto).
'  3. Si conecta: lista de variables y valor actual de unas pocas.
'  NO ESCRIBE NADA en el SCADA ni en los autómatas: solo lee.
'  Resultado en C:\TraceQueso\opc-prueba.txt   (se lanza con opc-prueba.bat)
'
'  v2: la v1 no tenía "On Error Resume Next" dentro de cada parte, y un error
'  cortaba esa parte sin dejar rastro. Ahora cada paso deja su línea.
' ==========================================================================
Option Explicit
On Error Resume Next

Dim fso, out
Set fso = CreateObject("Scripting.FileSystemObject")
Set out = fso.CreateTextFile("C:\TraceQueso\opc-prueba.txt", True)

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

L "Prueba OPC v2 (solo lectura) - " & Now

' ---- 1. Servidores OPC DA registrados (mirando el registro) ---------------
L ""
L "==== 1. SERVIDORES OPC DA REGISTRADOS EN WINDOWS ===="
Dim reg, claves, k, cats, cat, pid, nom, encontrados, HKCR
HKCR = &H80000000
encontrados = "|"
Set reg = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\default:StdRegProv")
L "   abrir registro: " & Res()
Dim raiz
For Each raiz In Array("CLSID", "Wow6432Node\CLSID")
claves = Empty
reg.EnumKey HKCR, raiz, claves
L "   leer " & raiz & ": " & Res()
If IsArray(claves) Then
  For Each k In claves
    cats = Empty
    reg.EnumKey HKCR, raiz & "\" & k & "\Implemented Categories", cats
    If IsArray(cats) Then
      For Each cat In cats
        cat = UCase(cat)
        If cat = "{63D5F430-CFE4-11D1-B2C8-0060083BA1FB}" Or cat = "{63D5F432-CFE4-11D1-B2C8-0060083BA1FB}" Or cat = "{CC603642-66D7-48F1-B69A-B625E73652D7}" Then
          pid = "" : nom = ""
          reg.GetStringValue HKCR, raiz & "\" & k & "\ProgID", "", pid
          reg.GetStringValue HKCR, raiz & "\" & k, "", nom
          If InStr(encontrados, "|" & k & "|") = 0 Then
            encontrados = encontrados & k & "|"
            L "   " & pid & "   |   " & nom & "   |   " & k
          End If
        End If
      Next
    End If
  Next
End If
Next
Err.Clear

' ---- 2. Lo que dice el componente OPC (lista estándar) --------------------
L ""
L "==== 2. LISTA DEL COMPONENTE OPC.Automation ===="
Dim auto, lista, i
Set auto = CreateObject("OPC.Automation.1")
L "   crear OPC.Automation: " & Res()
lista = auto.GetOPCServers()
L "   GetOPCServers: " & Res() & "   (tipo: " & TypeName(lista) & ")"
If IsArray(lista) Then
  For i = LBound(lista) To UBound(lista)
    L "   [" & i & "] " & TypeName(lista(i)) & " = " & CStr(lista(i))
    Err.Clear
  Next
End If
Set auto = Nothing
Err.Clear

' ---- 3. Probar conexiones -------------------------------------------------
Probar "OPCServer.WinCC"
Probar "OPCServer.WinCC.1"
Probar "SiemensOPC.CmnDAServer"
Probar "OPC.SimaticNET"

L ""
L "==== FIN ===="
out.Close
CreateObject("WScript.Shell").Run "notepad.exe C:\TraceQueso\opc-prueba.txt"

' --------------------------------------------------------------------------
Sub Probar(nombre)
  On Error Resume Next
  Dim srv, br, total, n, j, id, grp, it, leidos
  L ""
  L "==== SERVIDOR: " & nombre & " ===="
  Err.Clear
  Set srv = CreateObject("OPC.Automation.1")
  L "   crear cliente: " & Res()
  srv.Connect nombre, ""
  L "   conectar: " & Res()
  L "   estado: " & srv.ServerState & "  (1 = funcionando)   -> " & Res()
  L "   fabricante: " & srv.VendorInfo & "   -> " & Res()
  L "   version: " & srv.MajorVersion & "." & srv.MinorVersion & "   -> " & Res()

  total = 0
  Set br = srv.CreateBrowser
  L "   crear navegador: " & Res()
  br.ShowLeafs True
  L "   leer variables: " & Res()
  total = br.Count
  L "   variables que ofrece: " & total & "   -> " & Res()
  If total > 0 Then
    n = total : If n > 3000 Then n = 3000
    For j = 1 To n
      L "      " & br.GetItemID(br.Item(j))
    Next
    L "   (lista) " & Res()
    If total > 3000 Then L "      ... (se corta aquí, hay " & total & ")"

    L ""
    L "   -- VALORES ACTUALES (máx. 40 con CUBA, TEMP, AGIT o VALV en el nombre) --"
    Set grp = srv.OPCGroups.Add("tq_prueba")
    L "   crear grupo: " & Res()
    leidos = 0
    For j = 1 To total
      If leidos >= 40 Then Exit For
      id = br.GetItemID(br.Item(j))
      If InStr(1, id, "CUBA", 1) > 0 Or InStr(1, id, "TEMP", 1) > 0 Or _
         InStr(1, id, "AGIT", 1) > 0 Or InStr(1, id, "VALV", 1) > 0 Then
        Err.Clear
        Set it = grp.OPCItems.AddItem(id, j)
        it.Read 2
        If Err.Number = 0 Then
          L "      " & id & " = " & it.Value & "   (calidad " & it.Quality & ", " & it.TimeStamp & ")"
        Else
          L "      " & id & " -> " & Res()
        End If
        Err.Clear
        leidos = leidos + 1
      End If
    Next
    srv.OPCGroups.RemoveAll
    Err.Clear
  End If

  srv.Disconnect
  L "   desconectar: " & Res()
  Set srv = Nothing
End Sub
