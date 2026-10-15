-- PRUEBA SQL (TraceQueso, 15/10/2026) - SOLO LECTURA: solo SELECT, no cambia nada.
-- Lista las bases de datos del SQL del WinCC y, dentro de cada una, las tablas
-- cuyo nombre habla de variables (TAG), conexiones (CONN) o canales, con cuántas filas tienen.
SET NOCOUNT ON;
PRINT '==== BASES DE DATOS ====';
SELECT name AS base, create_date AS creada, state_desc AS estado FROM sys.databases ORDER BY name;

DECLARE @db sysname, @sql nvarchar(max);
DECLARE c CURSOR FOR SELECT name FROM sys.databases WHERE database_id > 4 AND state_desc = 'ONLINE';
OPEN c; FETCH NEXT FROM c INTO @db;
WHILE @@FETCH_STATUS = 0
BEGIN
  PRINT '';
  PRINT '==== TABLAS DE ' + @db + ' (con TAG, CONN, CHANNEL, VAR o CONNECTION en el nombre) ====';
  SET @sql = N'USE ' + QUOTENAME(@db) + N';
    SELECT TOP 60 s.name + ''.'' + t.name AS tabla, SUM(p.rows) AS filas
    FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.partitions p ON p.object_id = t.object_id AND p.index_id IN (0,1)
    WHERE t.name LIKE ''%TAG%'' OR t.name LIKE ''%CONN%'' OR t.name LIKE ''%CHANNEL%'' OR t.name LIKE ''%VAR%''
    GROUP BY s.name, t.name ORDER BY t.name;';
  BEGIN TRY EXEC sp_executesql @sql; END TRY
  BEGIN CATCH PRINT '   ! ' + ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM c INTO @db;
END
CLOSE c; DEALLOCATE c;
PRINT '';
PRINT '==== FIN ====';
