# Maestro Empresa APERP

## Objeto de origen

- Transaccion GeneXus: `Seguridad.Empresas`.
- Tabla fisica declarada por el XPZ: `g_emp`.
- Llave primaria y contexto multiempresa: `GECODEMP`.
- Evidencia: `docs/migration/aperp-model-study/table-columns.csv` y el inventario SQL de `sql-instance-bdaperp-20260802`.

El maestro no corresponde a `DEFEMP`. Esa tabla pertenece al modelo legado de bodega CONEX y no existe en la instancia `DESKTOP-SOOAP92\SQLEXPRESS`, base `BDAPERP`.

## Proposito de negocio

Mantener la identidad legal y operativa de cada empresa APERP: razon social, nombre corto, giros, telefono, RUT, direccion, ubicacion, coordinador, correo, estado, pagina web y vigencia contractual.

`GECODEMP` es tambien la raiz de aislamiento para Seguridad y para las tablas multiempresa. Por esta razon la pantalla puede listar empresas, pero no permite sustituir desde un formulario la empresa ya autenticada para operaciones dependientes.

## Dependencias

- Autenticacion y sesion: `Usuarios`, `SEGUSUEMP`, `SEGSESION` y `VW_APERP_SEG_EMPRESAS`.
- Autorizacion: `AsigSist`, `Asig`, `AsigProg`, `AsigProg1`, `UROLES` y `URolesPorUser`.
- Maestros y operaciones APERP que heredan `GECODEMP`.

La eliminacion se deshabilita en esta etapa. La base no declara todas las relaciones historicas como llaves foraneas y eliminar una empresa podria dejar datos multiempresa huerfanos.

## Decision sobre la vista SQL

`VW_APERP_SEG_EMPRESAS` se conserva como contrato de lectura para Seguridad. No debe utilizarse para el CRUD del maestro porque:

1. Solo expone una parte de los 19 atributos de `g_emp`.
2. Usa expresiones de presentacion como `RTRIM`.
3. `g_emp` contiene varias columnas `NOT NULL` sin valor por defecto que la vista no cubre.

El maestro escribe directamente en `g_emp` mediante el controlador generico, con nombres y largos del modelo APERP. `GeLogo` se preserva en modificaciones y se inicializa vacio al crear hasta implementar una carga binaria dedicada.

## Contrato de interfaz

- La API conserva la ruta `/backendDocker/maestros/empresas`.
- Los campos usan sus nombres APERP: `GECODEMP`, `GERAZSOC`, `GerazSMS`, `GEgiro1`, `GEgiro2`, `GEfonNum`, `GErut`, `GEDv`, `GEdire`, `GEregion`, `GEciudad`, `GeComuna`, `GeCordinador`, `geCorreo`, `GeEstado`, `GePaginaWeb`, `GeFecContIni` y `GeFecContFin`.
- `GeLogo` no se devuelve en el listado para evitar transportar binarios en la grilla.
- RUT y digito verificador se validan en el backend.

## Verificacion

Ejecutar:

```powershell
node scripts/inspect-aperp-company-master.js
node scripts/verify-aperp-company-master.js
```

La verificacion debe confirmar que `DEFEMP` no se usa, que el listado equivale a `g_emp`, que la llave es `GECODEMP` y que una actualizacion dentro de una transaccion puede revertirse sin alterar datos reales.

## Estado

Implementado y verificado el 3 de agosto de 2026.

- La instancia contiene `g_emp` y no contiene `DEFEMP`.
- El inventario fisico coincide con los 19 atributos de la transaccion APERP.
- El listado usa los nombres APERP y omite el binario `GeLogo`.
- Una insercion y actualizacion de prueba se ejecutaron dentro de una transaccion y se revirtieron; `g_emp` conserva sus 2 empresas originales.
- La vista `VW_APERP_SEG_EMPRESAS` conserva el mismo total de empresas que `g_emp` y permanece como contrato de Seguridad.
- La suite backend, ESLint dirigido y el build Vite/PWA finalizaron correctamente.
