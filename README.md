# Guía Educativa y de Formación Laboral · Morón 2026

Sitio web de la Guía Educativa y de Formación Laboral del Municipio de Morón (Secretaría de Desarrollo Local, Empleo y Economía Social). Reúne la oferta educativa, de formación profesional y de empleo del distrito en un formato accesible, adaptable al celular e imprimible.

## Qué incluye

- **¿Qué querés hacer?** y **ruta educativa**: accesos directos según el objetivo (terminar la primaria o la secundaria, aprender un oficio, estudiar una carrera, buscar trabajo…).
- **Conociendo Morón**: población, localidades, actividad productiva y parques industriales.
- **Empleo**: la Secretaría y sus direcciones, programas y centros.
- **Educación**: directorios con buscador y filtros para primaria y secundaria de adultos (CENS, CEBAS y FinEs), secundarias orientadas, escuelas técnicas, discapacidad (CFI), formación laboral, institutos superiores, formación artística y universidades.
- **Buscador de cursos**: los 558 cursos de la planilla de oferta formativa, filtrables por rubro, localidad e institución.
- **Mapa / ¿Cómo llegar?**: cada institución se puede ver en Google Maps y pedir indicaciones. También incluye la información de trenes, accesos y colectivos.
- **Voces de estudiantes** y datos de contacto.
- **Accesibilidad**: tipografía legible (Atkinson Hyperlegible), tamaño de texto ajustable, modo de alto contraste, modo oscuro automático, navegación por teclado y versión imprimible.

Es un sitio estático (HTML, CSS y JavaScript sin dependencias): no necesita servidor ni compilación. Se puede abrir `index.html` directamente en el navegador.

## Publicar con GitHub Pages

1. En GitHub, entrá a **Settings → Pages**.
2. En *Build and deployment*, elegí **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. Guardá. En unos minutos el sitio queda publicado en `https://axelito-coder.github.io/municipio/`.

## Estructura

```
index.html               Página principal (textos de la guía)
assets/css/estilos.css   Estilos, alto contraste e impresión
assets/js/datos.js       Directorio de instituciones (editable a mano)
assets/js/cursos.js      Cursos (se genera desde la planilla, no editar a mano)
assets/js/app.js         Buscadores, filtros, mapa y accesibilidad
assets/img/              Logo y mapa de localidades
fuentes/                 Planilla original de oferta formativa
tools/xlsx_a_js.py       Convierte la planilla en assets/js/cursos.js
```

## Actualizar la información

**Instituciones:** editá `assets/js/datos.js`. Cada institución es una línea con `cat` (categoría), `nombre`, `detalle`, `dir`, `loc`, `tel`, `mail`, `web` y `nota`.

**Cursos:** reemplazá `fuentes/04_Oferta_Formativa.xlsx` por la versión nueva (con la misma hoja "Consolidado" y las mismas columnas) y ejecutá:

```bash
pip install openpyxl
python3 tools/xlsx_a_js.py
```

El script unifica las variantes de escritura de localidades, rubros y estados ("Continua", "Continúa", "Comtinua"…).

## Fuentes

Archivos de la carpeta de Drive de la guía: *01 Propuesta Guía Educativa Morón*, *02 Guía Educativa y de Formación Laboral de Morón 2026*, *03 Mapa para Georreferenciar*, *04 Oferta Formativa*, *Educación Secundaria*, *Educación Adultos* e *Institutos de Enseñanza Superior*.
