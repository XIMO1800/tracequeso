-- PRUEBA SQL 2 (TraceQueso, 15/10/2026) - SOLO LECTURA: solo SELECT, no cambia nada.
-- 1) Conexiones, canales y lista de variables del proyecto del WinCC en marcha.
-- 2) Qué tablas tienen los archivos de hoy (rápido y lento) y cuántas filas.
SET NOCOUNT ON;
USE [CC_HMI_O133_26_07_24_18_37_48];
PRINT '==== COLUMNAS DE LAS TABLAS DEL PROYECTO ====';
SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, DATA_TYPE AS tipo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('MCPTCONNECTION','MCPTCHANNEL','MCPTCHANNELUNIT','MCPTVARGROUP','MCPTVARIABLEDESC','MCPTVARIABLETYPE','PDE#TAGs','CC_Alg_VarList')
ORDER BY TABLE_NAME, ORDINAL_POSITION;
GO
PRINT ''; PRINT '==== CANALES ===='; SELECT * FROM dbo.MCPTCHANNEL;
GO
PRINT ''; PRINT '==== UNIDADES DE CANAL ==='; SELECT * FROM dbo.MCPTCHANNELUNIT;
GO
PRINT ''; PRINT '==== CONEXIONES ===='; SELECT * FROM dbo.MCPTCONNECTION;
GO
PRINT ''; PRINT '==== GRUPOS ===='; SELECT * FROM dbo.MCPTVARGROUP;
GO
PRINT ''; PRINT '==== TIPOS ===='; SELECT * FROM dbo.MCPTVARIABLETYPE;
GO
PRINT ''; PRINT '==== VARIABLES (MCPTVARIABLEDESC) ===='; SELECT * FROM dbo.MCPTVARIABLEDESC;
GO
PRINT ''; PRINT '==== VARIABLES DE ARCHIVO (PDE#TAGs) ===='; SELECT * FROM dbo.[PDE#TAGs];
GO

SET NOCOUNT ON;
DECLARE @db sysname, @sql nvarchar(max);
DECLARE c CURSOR FOR
  SELECT name FROM (SELECT TOP 1 name FROM sys.databases WHERE name LIKE '%TLG[_]F[_]%' AND state_desc='ONLINE' ORDER BY create_date DESC) a
  UNION ALL
  SELECT name FROM (SELECT TOP 1 name FROM sys.databases WHERE name LIKE '%TLG[_]S[_]%' AND state_desc='ONLINE' ORDER BY create_date DESC) b;
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT ''; PRINT '==== TODAS LAS TABLAS DE ' + @db + ' ====';
  SET @sql = N'USE ' + QUOTENAME(@db) + N';
    SELECT s.name + ''.'' + t.name AS tabla, SUM(p.rows) AS filas
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1)
    GROUP BY s.name, t.name ORDER BY t.name;
    SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna, DATA_TYPE AS tipo FROM INFORMATION_SCHEMA.COLUMNS ORDER BY TABLE_NAME, ORDINAL_POSITION;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY BEGIN CATCH PRINT '   ! ' + ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT ''; PRINT '==== FIN ====';
