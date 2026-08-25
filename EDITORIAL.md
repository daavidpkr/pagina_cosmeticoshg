# Sistema editorial de Cosméticos HG

El catálogo continúa usando una única fuente de datos: `cosmeticosHG.catalog.v1` en `localStorage`. El esquema 7 añade `publicationStatus`, `createdAt`, `updatedAt`, `publishedAt`, `order`, `sku`, `budgetLevel`, `importMeta` e `importHistory`. Antes de migrar desde el esquema anterior se guarda una copia recuperable, una sola vez, en `cosmeticosHG.catalog.backup.v6`. No se usa `localStorage.clear()`.

Los productos y promociones existentes activos se migran como publicados, conservando ID, slug, aliases, relaciones e imágenes. Un borrador o archivado se oculta en catálogo, búsqueda predictiva, fichas directas, relacionados, selecciones, combos, promociones y consultas públicas. Publicar exige nombre, categoría activa, descripción breve, imagen local válida, disponibilidad y slug válido y único. Las promociones exigen elemento asociado disponible, fechas válidas y precio o condición.

## Importación

Se admiten CSV, XLSX y XLS, hasta 5 MB y 2.000 filas. Excel se procesa en el navegador con SheetJS Community Edition 0.20.3, fijado localmente en `assets/vendor/xlsx.full.min.js`; su licencia Apache-2.0 está en `assets/vendor/SHEETJS-LICENSE.txt`. No hay dependencia de CDN en producción. El lector desactiva fórmulas y HTML, limita las filas y trata los valores como datos.

La plantilla incluye una fila marcada `EJEMPLO-NO-IMPORTAR`; debe eliminarse antes de importar. Los campos mínimos para revisar una fila son `nombre` y `categoria`; los demás son opcionales. Las listas usan `|`. Booleanos válidos: `sí`, `si`, `true`, `1` o `yes` (cualquier otro valor se interpreta como falso). Disponibilidad: `disponible`, `pocas`, `agotado` o `proximo`.

Todo producto importado queda obligatoriamente como borrador, con `image: null` y `publishedAt: null`. Las categorías desconocidas requieren elegir entre omitir, crear o asociar. Los duplicados se detectan primero por SKU y luego por nombre + marca + presentación; un publicado solo se actualiza tras confirmación explícita y se retira como borrador. El resultado y los errores pueden descargarse como CSV.

## Orden visual

El orden global de productos se modifica solo al mostrar todos los productos. Los filtros desactivan el arrastre para evitar un orden ambiguo. Se puede arrastrar desde el asa o usar Inicio, Arriba, Abajo y Final; los valores se normalizan después de cada cambio y el resultado se anuncia con `aria-live`. Categorías y promociones ofrecen controles de movimiento. La instalación actual tiene un único banner global, cuyo `order` estable es 1; no existe un segundo banner con el que reordenarlo.

