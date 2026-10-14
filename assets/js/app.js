(function () {
  "use strict";

  var CATS = window.CATEGORIAS || {};
  var INST = window.INSTITUCIONES || [];
  var CURSOS = window.CURSOS || [];
  var raiz = document.documentElement;

  // ── Utilidades ────────────────────────────────────────────────────────────
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Minúsculas y sin tildes, para buscar "moron" y encontrar "Morón"
  function norm(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Las palabras largas se comparan por su raíz, para que "peluquería" encuentre
  // "Peluquero/a", "carpintería" a "carpintero" y "electricidad" a "electricista".
  function raizPalabra(palabra) {
    return palabra.length >= 7 ? palabra.slice(0, Math.max(5, palabra.length - 3)) : palabra;
  }

  function coincide(texto, consulta) {
    var t = norm(texto);
    return norm(consulta).split(/\s+/).filter(Boolean).every(function (p) { return t.indexOf(raizPalabra(p)) !== -1; });
  }

  function unicos(lista) {
    return lista.filter(function (v, i, a) { return v && a.indexOf(v) === i; })
      .sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ } }
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }

  function consultaMapa(dir, loc) {
    return dir + ", " + (loc || "Partido de Morón") + ", Provincia de Buenos Aires, Argentina";
  }
  function urlComoLlegar(dir, loc) {
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(consultaMapa(dir, loc));
  }
  function urlEmbed(dir, loc) {
    return "https://maps.google.com/maps?q=" + encodeURIComponent(consultaMapa(dir, loc)) + "&z=16&output=embed";
  }

  // Convierte "4659-0048" o "11 5932-4980" en un enlace tel: (código de área 11)
  function telefonos(texto) {
    return String(texto).split("/").map(function (parte) {
      var digitos = parte.replace(/\D/g, "");
      var e164 = null;
      if (digitos.length === 8) e164 = "+5411" + digitos;
      else if (digitos.length === 10 && digitos.indexOf("11") === 0) e164 = "+549" + digitos;
      var txt = esc(parte.trim());
      return e164 ? '<a href="tel:' + e164 + '">' + txt + "</a>" : txt;
    }).join(" / ");
  }

  // ── Accesibilidad ─────────────────────────────────────────────────────────
  var escala = parseFloat(leer("guia-escala")) || 1;
  function aplicarEscala() { raiz.style.setProperty("--escala", escala); }
  aplicarEscala();

  var botonContraste = $('[data-accion="contraste"]');
  function aplicarContraste(activo) {
    if (activo) raiz.setAttribute("data-contraste", "alto"); else raiz.removeAttribute("data-contraste");
    botonContraste.setAttribute("aria-pressed", activo ? "true" : "false");
  }
  aplicarContraste(leer("guia-contraste") === "alto");

  $$(".accesibilidad [data-accion]").forEach(function (b) {
    b.addEventListener("click", function () {
      var accion = b.getAttribute("data-accion");
      if (accion === "agrandar") escala = Math.min(1.5, +(escala + 0.1).toFixed(2));
      if (accion === "achicar") escala = Math.max(0.85, +(escala - 0.1).toFixed(2));
      if (accion === "agrandar" || accion === "achicar") { aplicarEscala(); guardar("guia-escala", escala); }
      if (accion === "contraste") {
        var activo = !raiz.hasAttribute("data-contraste");
        aplicarContraste(activo);
        guardar("guia-contraste", activo ? "alto" : "");
      }
      if (accion === "imprimir") window.print();
    });
  });

  // Al imprimir, abrir la editorial para que salga completa
  window.addEventListener("beforeprint", function () { $$("details").forEach(function (d) { d.open = true; }); });

  // ── Menú móvil ────────────────────────────────────────────────────────────
  var menu = $("#menu");
  var menuBoton = $(".menu-boton");
  menuBoton.addEventListener("click", function () {
    var abierto = menu.classList.toggle("abierto");
    menuBoton.setAttribute("aria-expanded", abierto ? "true" : "false");
  });
  $$("a", menu).forEach(function (a) {
    a.addEventListener("click", function () { menu.classList.remove("abierto"); menuBoton.setAttribute("aria-expanded", "false"); });
  });

  // ── Tarjeta de institución ────────────────────────────────────────────────
  function cantidadCursos(inst) {
    if (!inst.cursos) return 0;
    return CURSOS.filter(function (c) { return c.i === inst.cursos; }).length;
  }

  function tarjetaInstitucion(inst, mostrarCategoria) {
    var cat = CATS[inst.cat] || {};
    var idx = INST.indexOf(inst);
    var filas = "";
    if (inst.dir) filas += '<div><dt aria-label="Dirección">📍</dt><dd>' + esc(inst.dir) + (inst.loc ? ", " + esc(inst.loc) : "") + "</dd></div>";
    if (inst.tel) filas += '<div><dt aria-label="Teléfono">📞</dt><dd>' + telefonos(inst.tel) + "</dd></div>";
    if (inst.mail) filas += '<div><dt aria-label="Correo">✉️</dt><dd><a href="mailto:' + esc(inst.mail) + '">' + esc(inst.mail) + "</a></dd></div>";
    if (inst.web) filas += '<div><dt aria-label="Sitio web">🌐</dt><dd><a href="https://' + esc(inst.web) + '" target="_blank" rel="noopener">' + esc(inst.web) + "</a></dd></div>";

    var acciones = "";
    if (inst.dir) {
      acciones += '<button type="button" data-ver-mapa="' + idx + '">🗺️ Ver en el mapa</button>';
      acciones += '<a href="' + urlComoLlegar(inst.dir, inst.loc) + '" target="_blank" rel="noopener">🧭 Cómo llegar</a>';
    }
    var n = cantidadCursos(inst);
    if (n) acciones += '<button type="button" data-ver-cursos="' + esc(inst.cursos) + '">📋 Ver ' + n + " cursos</button>";

    return '<article class="inst" style="--cat:' + esc(cat.color) + '">' +
      (mostrarCategoria ? '<span class="inst__cat">' + esc(cat.icono) + " " + esc(cat.corto) + "</span>" : "") +
      "<h3>" + esc(inst.nombre) + "</h3>" +
      (inst.detalle ? '<p class="inst__detalle">' + esc(inst.detalle) + "</p>" : "") +
      (inst.nota ? '<p class="inst__nota">' + esc(inst.nota) + "</p>" : "") +
      (filas ? "<dl>" + filas + "</dl>" : '<p class="inst__nota">Consultá datos de contacto en la Secretaría.</p>') +
      (acciones ? '<div class="inst__acciones">' + acciones + "</div>" : "") +
      "</article>";
  }

  // ── Directorios por nivel ─────────────────────────────────────────────────
  $$(".directorio").forEach(function (cont) {
    var cat = cont.getAttribute("data-cat");
    var lista = INST.filter(function (i) { return i.cat === cat; });
    var conOrientacion = cont.hasAttribute("data-filtro-orientacion");
    var localidades = unicos(lista.map(function (i) { return i.loc; }));
    var id = "dir-" + cat;

    var orientaciones = [];
    if (conOrientacion) {
      var base = ["Ciencias sociales", "Ciencias naturales", "Economía y administración", "Comunicación",
        "Arte", "Artes visuales", "Teatro", "Música", "Educación física", "Lenguas", "Literatura"];
      orientaciones = base.filter(function (o) { return lista.some(function (i) { return coincide(i.detalle, o); }); });
    }

    var barra = '<div class="directorio__barra">' +
      '<label class="solo-lectores" for="' + id + '-q">Buscar en ' + esc(CATS[cat].nombre) + "</label>" +
      '<input id="' + id + '-q" type="search" placeholder="Buscar por nombre, orientación o calle…" autocomplete="off">';
    if (orientaciones.length) {
      barra += '<label class="solo-lectores" for="' + id + '-o">Orientación</label><select id="' + id + '-o"><option value="">Todas las orientaciones</option>' +
        orientaciones.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
    }
    if (localidades.length > 1) {
      barra += '<label class="solo-lectores" for="' + id + '-l">Localidad</label><select id="' + id + '-l"><option value="">Todas las localidades</option>' +
        localidades.map(function (l) { return "<option>" + esc(l) + "</option>"; }).join("") + "</select>";
    }
    barra += '<p class="directorio__cuenta" role="status"></p></div>';
    cont.innerHTML = barra + '<div class="directorio__lista"></div>';

    var q = $("#" + id + "-q", cont), o = $("#" + id + "-o", cont), l = $("#" + id + "-l", cont);
    var cuenta = $(".directorio__cuenta", cont), destino = $(".directorio__lista", cont);

    function pintar() {
      var visibles = lista.filter(function (i) {
        if (q.value && !coincide([i.nombre, i.detalle, i.dir, i.loc, i.nota].join(" "), q.value)) return false;
        if (o && o.value && !coincide(i.detalle, o.value)) return false;
        if (l && l.value && i.loc !== l.value) return false;
        return true;
      });
      cuenta.textContent = visibles.length === lista.length
        ? lista.length + " instituciones"
        : visibles.length + " de " + lista.length + " instituciones";
      destino.innerHTML = visibles.length
        ? visibles.map(function (i) { return tarjetaInstitucion(i, false); }).join("")
        : '<p class="vacio">Uy, no encontramos lugares con esos filtros. Probá con otra palabra o elegí “Todas”.</p>';
    }
    [q, o, l].forEach(function (el) { if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", pintar); });
    pintar();
  });

  // ── Mapa ──────────────────────────────────────────────────────────────────
  var mCat = $("#m-cat"), mQ = $("#m-q"), mLista = $("#m-lista"), mIframe = $("#m-iframe"), mInfo = $("#m-info");
  var conDireccion = INST.filter(function (i) { return i.dir; });
  var seleccionada = null;

  mCat.innerHTML = '<option value="">Todas las instituciones</option>' + Object.keys(CATS).map(function (k) {
    return '<option value="' + k + '">' + esc(CATS[k].icono + " " + CATS[k].nombre) + "</option>";
  }).join("");

  function pintarListaMapa() {
    var visibles = conDireccion.filter(function (i) {
      if (mCat.value && i.cat !== mCat.value) return false;
      if (mQ.value && !coincide([i.nombre, i.dir, i.loc, i.detalle].join(" "), mQ.value)) return false;
      return true;
    });
    mLista.innerHTML = visibles.length ? visibles.map(function (i) {
      var idx = INST.indexOf(i);
      return '<li><button type="button" data-idx="' + idx + '" style="--cat:' + esc(CATS[i.cat].color) + '"' +
        (seleccionada === idx ? ' aria-current="true"' : "") + ">" + esc(i.nombre) +
        "<span>" + esc(i.dir) + (i.loc ? ", " + esc(i.loc) : "") + "</span></button></li>";
    }).join("") : '<li class="vacio">Sin resultados.</li>';
  }

  function mostrarEnMapa(idx) {
    var i = INST[idx];
    if (!i || !i.dir) return;
    seleccionada = idx;
    mIframe.src = urlEmbed(i.dir, i.loc);
    mIframe.title = "Mapa: " + i.nombre;
    mInfo.innerHTML = "<strong>" + esc(i.nombre) + "</strong><span>📍 " + esc(i.dir) + (i.loc ? ", " + esc(i.loc) : "") + "</span>" +
      (i.tel ? "<span>📞 " + telefonos(i.tel) + "</span>" : "") +
      '<a class="boton" href="' + urlComoLlegar(i.dir, i.loc) + '" target="_blank" rel="noopener">🧭 Cómo llegar</a>';
    pintarListaMapa();
  }

  mCat.addEventListener("change", pintarListaMapa);
  mQ.addEventListener("input", pintarListaMapa);
  mLista.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-idx]");
    if (b) mostrarEnMapa(+b.getAttribute("data-idx"));
  });
  pintarListaMapa();

  // ── Buscador de cursos ────────────────────────────────────────────────────
  var fTexto = $("#f-texto"), fFamilia = $("#f-familia"), fLocalidad = $("#f-localidad"),
      fInstitucion = $("#f-institucion"), fMoron = $("#f-moron");
  var listaCursos = $("#lista-cursos"), contador = $("#contador-cursos"), botonMas = $("#mas-cursos");
  var POR_PAGINA = 24, mostrados = POR_PAGINA, filtrados = [];

  CURSOS.sort(function (a, b) { return a.c.localeCompare(b.c, "es"); });

  function llenarSelect(sel, valores) {
    sel.insertAdjacentHTML("beforeend", valores.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join(""));
  }
  llenarSelect(fFamilia, unicos(CURSOS.map(function (c) { return c.f; })));
  llenarSelect(fLocalidad, unicos(CURSOS.map(function (c) { return c.l; })));
  llenarSelect(fInstitucion, unicos(CURSOS.map(function (c) { return c.i; })));

  function tarjetaCurso(c) {
    var datos = "";
    if (c.n === "Nuevo") datos += '<span class="curso__nuevo">Nuevo</span>';
    if (c.h) datos += "<span>⏱️ " + esc(c.h) + " horas</span>";
    if (c.dt) datos += "<span>📅 Inicio: " + esc(c.dt) + "</span>";
    var sede = [c.s, c.l].filter(Boolean).join(" · ");
    return '<article class="curso">' +
      '<span class="curso__familia">' + esc(c.f) + "</span>" +
      "<h3>" + esc(c.c) + "</h3>" +
      "<p class=\"curso__sede\"><strong>" + esc(c.i) + "</strong>" + (c.e ? " · " + esc(c.e) : "") + "</p>" +
      '<div class="curso__datos">' + datos + "</div>" +
      (sede ? '<p class="curso__sede">📍 ' + esc(sede) + (c.p && c.p !== "Morón" ? " (" + esc(c.p) + ")" : "") + "</p>" : "") +
      (c.s && c.l ? '<a href="' + urlComoLlegar(c.s, c.l) + '" target="_blank" rel="noopener">🧭 Cómo llegar a la sede</a>' : "") +
      "</article>";
  }

  function filtrarCursos(reiniciar) {
    if (reiniciar) mostrados = POR_PAGINA;
    filtrados = CURSOS.filter(function (c) {
      if (fMoron.checked && c.p !== "Morón") return false;
      if (fFamilia.value && c.f !== fFamilia.value) return false;
      if (fLocalidad.value && c.l !== fLocalidad.value) return false;
      if (fInstitucion.value && c.i !== fInstitucion.value) return false;
      if (fTexto.value && !coincide([c.c, c.f, c.i, c.e, c.s, c.l].join(" "), fTexto.value)) return false;
      return true;
    });
    contador.textContent = filtrados.length === 1 ? "Encontramos 1 curso para vos" : "Encontramos " + filtrados.length + " cursos para vos";
    listaCursos.innerHTML = filtrados.length
      ? filtrados.slice(0, mostrados).map(tarjetaCurso).join("")
      : '<p class="vacio">No encontramos cursos con esos filtros. Probá con otra palabra, destildá “Solo en el Partido de Morón” o tocá “Limpiar filtros”. Si no aparece lo que buscás, escribinos a <a href="mailto:formacionparaeltrabajo@moron.gov.ar">formacionparaeltrabajo@moron.gov.ar</a>.</p>';
    botonMas.hidden = filtrados.length <= mostrados;
    if (!botonMas.hidden) botonMas.textContent = "Ver más cursos (" + (filtrados.length - mostrados) + " restantes)";
  }

  [fFamilia, fLocalidad, fInstitucion, fMoron].forEach(function (el) { el.addEventListener("change", function () { filtrarCursos(true); }); });
  fTexto.addEventListener("input", function () { filtrarCursos(true); });
  $("#filtros-cursos").addEventListener("submit", function (e) { e.preventDefault(); });
  $("#filtros-cursos").addEventListener("reset", function () { setTimeout(function () { filtrarCursos(true); }, 0); });
  botonMas.addEventListener("click", function () { mostrados += POR_PAGINA; filtrarCursos(false); });
  filtrarCursos(true);

  function irACursos(opciones) {
    fTexto.value = opciones.texto || "";
    fFamilia.value = "";
    fLocalidad.value = "";
    fInstitucion.value = opciones.institucion || "";
    fMoron.checked = !opciones.institucion && !opciones.texto;
    filtrarCursos(true);
    $("#cursos").scrollIntoView();
  }

  // ── Acciones de las tarjetas (delegadas) ──────────────────────────────────
  document.addEventListener("click", function (e) {
    var verMapa = e.target.closest("[data-ver-mapa]");
    if (verMapa) {
      mCat.value = "";
      mQ.value = "";
      mostrarEnMapa(+verMapa.getAttribute("data-ver-mapa"));
      $("#mapa").scrollIntoView();
      return;
    }
    var verCursos = e.target.closest("[data-ver-cursos]");
    if (verCursos) irACursos({ institucion: verCursos.getAttribute("data-ver-cursos") });
    var buscarCursos = e.target.closest("[data-buscar-cursos]");
    if (buscarCursos) irACursos({ texto: buscarCursos.getAttribute("data-buscar-cursos") });
  });

  // ── Búsqueda general ──────────────────────────────────────────────────────
  var seccionResultados = $("#resultados"), cuerpoResultados = $("#resultados-cuerpo"), qGeneral = $("#q-general");

  $("#buscador-general").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = qGeneral.value.trim();
    if (!q) return;
    var insts = INST.filter(function (i) {
      return coincide([i.nombre, i.detalle, i.dir, i.loc, i.nota, CATS[i.cat].nombre].join(" "), q);
    });
    var cursos = CURSOS.filter(function (c) { return coincide([c.c, c.f, c.i, c.e, c.s, c.l].join(" "), q); });

    var html = "";
    if (cursos.length) {
      html += '<div class="destacado"><h3>' + cursos.length + " curso" + (cursos.length === 1 ? "" : "s") +
        " de formación profesional para “" + esc(q) + "”</h3>" +
        "<p>" + unicos(cursos.map(function (c) { return c.c; })).slice(0, 6).map(esc).join(" · ") +
        (unicos(cursos.map(function (c) { return c.c; })).length > 6 ? " y más…" : "") + "</p>" +
        '<button type="button" class="boton" data-buscar-cursos="' + esc(q) + '">Ver los cursos →</button></div>';
    }
    if (insts.length) {
      html += "<h3>" + insts.length + " institucion" + (insts.length === 1 ? "" : "es") + "</h3>" +
        '<div class="directorio__lista">' + insts.slice(0, 30).map(function (i) { return tarjetaInstitucion(i, true); }).join("") + "</div>";
      if (insts.length > 30) html += "<p>Se muestran las primeras 30. Probá con una búsqueda más precisa.</p>";
    }
    if (!html) {
      html = '<p class="vacio">No encontramos nada para “' + esc(q) + "”. Probá con otra palabra, por ejemplo un oficio, una orientación o tu localidad. " +
        'O escribinos a <a href="mailto:formacionparaeltrabajo@moron.gov.ar">formacionparaeltrabajo@moron.gov.ar</a> y te ayudamos.</p>';
    }
    cuerpoResultados.innerHTML = html;
    seccionResultados.hidden = false;
    seccionResultados.scrollIntoView();
  });

  $("#cerrar-resultados").addEventListener("click", function () {
    seccionResultados.hidden = true;
    qGeneral.focus();
  });

  // ── Tu camino: selector de situaciones (pestañas accesibles) ─────────────
  var pestanas = $$('.personas [role="tab"]');

  function elegirPersona(clave, enfocar) {
    pestanas.forEach(function (t) {
      var activa = t.getAttribute("data-persona") === clave;
      t.setAttribute("aria-selected", activa ? "true" : "false");
      t.tabIndex = activa ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !activa;
      if (activa && enfocar) t.focus();
    });
  }

  pestanas.forEach(function (t, i) {
    t.addEventListener("click", function () { elegirPersona(t.getAttribute("data-persona")); });
    t.addEventListener("keydown", function (e) {
      var destino = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") destino = pestanas[(i + 1) % pestanas.length];
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") destino = pestanas[(i - 1 + pestanas.length) % pestanas.length];
      if (e.key === "Home") destino = pestanas[0];
      if (e.key === "End") destino = pestanas[pestanas.length - 1];
      if (destino) { e.preventDefault(); elegirPersona(destino.getAttribute("data-persona"), true); }
    });
  });
  elegirPersona("secundaria");

  // Atajos de la portada que abren una situación concreta
  $$(".portada__sugerencias [data-persona]").forEach(function (a) {
    a.addEventListener("click", function () { elegirPersona(a.getAttribute("data-persona")); });
  });

  // ── Cifras de portada ─────────────────────────────────────────────────────
  var cifraInst = $('[data-contar="instituciones"]');
  var cifraCursos = $('[data-contar="cursos"]');
  if (cifraInst) cifraInst.textContent = INST.filter(function (i) { return i.cat !== "sede"; }).length;
  if (cifraCursos) cifraCursos.textContent = CURSOS.length;
})();
