"""Convierte las planillas de cursos en assets/js/cursos.js.

Uso:
    python3 tools/xlsx_a_js.py

Lee todas las planillas listadas en FUENTES (carpeta fuentes/) y junta sus
cursos: cada planilla suma los suyos sin quitar los de las demás. Para agregar
una planificación nueva, copiá la planilla en fuentes/ y sumala a FUENTES.
Requiere openpyxl.
"""
import datetime
import json
import re
import unicodedata
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "assets" / "js" / "cursos.js"

# (archivo en fuentes/, hojas a leer, año del ciclo, pasar a minúsculas los nombres en mayúsculas)
# La planilla 2026 se publica tal cual estaba; la normalización de mayúsculas es para las nuevas.
FUENTES = [
    ("04_Oferta_Formativa.xlsx", ["Consolidado"], 2026, False),
    ("Planificacion_2027_Consolidado.xlsx", ["CFL", "CFP"], 2027, True),
]

# En la planificación 2027 la columna "carga horaria" del CFP 401 trae valores
# de 8 a 15 (en 2026 los mismos cursos tenían cientos de horas), así que no son
# horas totales y no se muestran.
SIN_CARGA_HORARIA = {(2027, "CFP 401")}

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# Variantes de escritura que aparecen en las planillas -> forma única
LOCALIDADES = {
    "moron": "Morón", "morón": "Morón", "moròn": "Morón",
    "haedo": "Haedo", "la ferrere": "Laferrere", "laferrere": "Laferrere",
    "virrey del pino": "Virrey del Pino", "gonzalez catan": "González Catán",
    "gonzález catán": "González Catán", "g.catan": "González Catán", "ituzaingo": "Ituzaingó",
}
FAMILIAS = {
    "estética profesional": "Estética profesional",
    "hoteleria y turismo": "Hotelería y turismo",
    "hotelería y turismo": "Hotelería y turismo",
    "servivios personales": "Servicios personales",
    "servicios personales": "Servicios personales",
    "cuidados y servicios sociocomunitarios": "Cuidados y servicios sociocomunitarios",
    "módulos comunes para formacion inicial": "Módulos comunes para formación inicial",
}
# Rubros tal como se muestran en la página; las variantes de las planillas
# (mayúsculas, sin tildes, con prefijos como "GH - ") se reducen a estos.
RUBROS = [
    "Administración y comercialización", "Informática", "Gastronomía", "Energía Eléctrica",
    "Industria gráfica", "Textil e Indumentaria", "Construcciones", "Seguridad y medio ambiente",
    "Metalmecánica", "Electromecánica", "Estética profesional", "Industrias Culturales y Creativas",
    "Salud", "Comunicación Social", "Servicios personales", "Electrónica", "Industria de los alimentos",
    "Madera y mueble", "Hotelería y turismo", "Automotriz", "Cuidados y servicios sociocomunitarios",
    "Módulos comunes para formación inicial", "Aeronáutica", "Oficios artesanales",
    "Telecomunicaciones", "Actividades agropecuarias", "Electricidad", "Cuero y calzado",
]
RUBROS_ALIAS = {
    "adm y comercializ": "Administración y comercialización",
    "industria alimentaria": "Industria de los alimentos",
    "industria textil": "Textil e Indumentaria",
    "hoteleria y turimo": "Hotelería y turismo",
    "cuidados y servicios sociocumunitarios": "Cuidados y servicios sociocomunitarios",
    "modulos comunes para la formacion inicial": "Módulos comunes para formación inicial",
}
# Nombres de centros de la planificación 2027 -> nombre usado en la página
CENTROS = {
    "CFP 401 MORÓN": "CFP 401",
    'CMFP N°2 "MANUEL BELGRANO"': "CFP N° 2 M. BELGRANO",
    'CMFP Nº1 " RICARDO ROJAS"': "CFP N° 1 R. ROJAS",
    "CMFP3 GASTRONOMIA": "CFP N° 3 GASTRONOMÍA",
    "CFP NTRA SRA DE FATIMA": "CFP NRA FÁTIMA",
    "Centro de Estudios Culinarios - CEC": "CFP CEC",
    "Escuela de Gastronomia de Morón": "Escuela de Gastronomía de Morón",
    "IPac Gastronomía SRL": "IPAC",
    "Ipac Gastronomía SRL": "IPAC",
}
ENTIDADES = {
    "utghra": "UTHGRA",
    "FUERZA AÉREA ARGENTINA": "Fuerza Aérea Argentina",
    "Fundacion UOCRA": "Fundación UOCRA",
    "MUNICIPIO DE MORON": "Municipio de Morón",
    "MUNICIPAL": "Municipio de Morón",
    "Fed.Grafica Bonaerense": "Federación Gráfica Bonaerense",
}
# Siglas que se mantienen en mayúsculas al pasar a minúsculas un nombre escrito todo en mayúsculas
SIGLAS = {"PC", "IA", "PLC", "RRHH", "CNC", "PYMES", "AFIP", "ARCA", "IVA", "GNC", "WEB", "3D", "2D", "I", "II", "III", "IV"}


def limpiar(valor):
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    texto = re.sub(r"\s+", " ", str(valor)).strip()
    return "" if texto in ("-", "—", "None") else texto


def clave(texto):
    """Minúsculas, sin tildes ni signos: para comparar variantes de un mismo nombre."""
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", texto).strip()


RUBROS_POR_CLAVE = {clave(r): r for r in RUBROS}
RUBROS_POR_CLAVE.update(RUBROS_ALIAS)


def institucion(valor):
    texto = limpiar(valor)
    texto = CENTROS.get(texto, texto)
    return re.sub(r"^(CFL|CFP)(\d)", r"\1 \2", texto)


def familia(valor):
    texto = limpiar(valor)
    texto = FAMILIAS.get(texto.lower(), texto[:1].upper() + texto[1:])
    sin_prefijo = re.sub(r"^[A-Z]{2}\s*-\s*", "", texto)  # "GH - Gastronomía" -> "Gastronomía"
    return RUBROS_POR_CLAVE.get(clave(sin_prefijo), texto)


def localidad(valor):
    texto = limpiar(valor)
    if texto.isupper():
        texto = texto.title()
    return LOCALIDADES.get(texto.lower(), texto)


def condicion(valor):
    texto = limpiar(valor).lower()
    if texto.startswith("nuev"):
        return "Nuevo"
    if texto.startswith(("cont", "comt")):
        return "Continúa"
    return limpiar(valor)


def nombre_curso(valor, minusculas):
    """Quita la carga horaria del nombre ("… (412 hs)") y, si se pide, baja las mayúsculas sostenidas."""
    texto = limpiar(valor)
    horas = ""
    m = re.search(r"\s*\((\d+)\s*hs?\.?\)\s*$", texto, flags=re.I)
    if m:
        horas, texto = m.group(1), texto[:m.start()]
    if minusculas and texto.isupper():
        palabras = [p if p.strip(".,:;()/-") in SIGLAS else p.lower() for p in texto.split(" ")]
        texto = " ".join(palabras)
        texto = texto[:1].upper() + texto[1:]
    return texto, horas


def fecha(valor):
    if isinstance(valor, (datetime.date, datetime.datetime)):
        return valor.strftime("%Y-%m-%d"), f"{valor.day} de {MESES[valor.month - 1]} de {valor.year}"
    texto = limpiar(valor)
    return "", texto


def periodo(inicio, fin):
    """"Del 8 de marzo al 5 de diciembre de 2027", si están las dos fechas."""
    if not all(isinstance(v, (datetime.date, datetime.datetime)) for v in (inicio, fin)):
        return ""
    desde = f"{inicio.day} de {MESES[inicio.month - 1]}"
    if inicio.year != fin.year:
        desde += f" de {inicio.year}"
    return f"Del {desde} al {fin.day} de {MESES[fin.month - 1]} de {fin.year}"


def ugc(valor):
    texto = limpiar(valor)
    if re.fullmatch(r"(UGC\s*)?\d+", texto, flags=re.I):
        return "UGC " + re.sub(r"\D", "", texto)
    return texto


# Encabezados posibles de cada columna (comparados con clave())
COLUMNAS = {
    "gestion": ["gestion", "f5f"],
    "inst": ["institucion", "cfl"],
    "entidad": ["entidad"],
    "familia": ["familia profesional"],
    "curso": ["curso"],
    "codigo": ["codigo"],
    "condicion": ["condicion"],
    "horas": ["carga horaria"],
    "inicio": ["fecha de inicio"],
    "fin": ["fecha de finalizacion"],
    "sede": ["sede"],
    "loc": ["localidad"],
    "partido": ["partido"],
    "ugc": ["ugc"],
}


def indices(encabezado):
    claves = [clave(limpiar(c)) for c in encabezado]
    pos = {}
    for campo, nombres in COLUMNAS.items():
        for i, k in enumerate(claves):
            if k in nombres and campo not in pos:
                pos[campo] = i
    pos.setdefault("gestion", 0)  # la primera columna es la gestión aunque no tenga título
    return pos


def leer(archivo, hojas, ciclo, minusculas):
    libro = openpyxl.load_workbook(RAIZ / "fuentes" / archivo, data_only=True)
    cursos = []
    for nombre in hojas:
        filas = libro[nombre].iter_rows(values_only=True)
        pos = indices(next(filas))
        for fila in filas:
            val = lambda campo: fila[pos[campo]] if campo in pos and pos[campo] < len(fila) else None
            curso, horas_en_nombre = nombre_curso(val("curso"), minusculas)
            if not curso:
                continue
            inst = institucion(val("inst"))
            entidad = limpiar(val("entidad"))
            if re.fullmatch(r"\d+", entidad):  # celdas con un número en lugar de la entidad
                entidad = ""
            entidad = ENTIDADES.get(entidad, entidad)
            codigo = limpiar(val("codigo"))
            if codigo.lower() in ("revisión", "revision", "continua", "nuevo"):
                codigo = ""
            horas = limpiar(val("horas")) or horas_en_nombre
            if (ciclo, inst) in SIN_CARGA_HORARIA:
                horas = ""
            iso, inicio_txt = fecha(val("inicio"))
            gestion = limpiar(val("gestion"))
            cursos.append({
                "g": gestion.capitalize() if gestion.isupper() else gestion,
                "i": inst,
                "e": entidad,
                "f": familia(val("familia")),
                "c": curso,
                "k": codigo,
                "n": condicion(val("condicion")),
                "h": horas,
                "d": iso,
                "dt": inicio_txt,
                "per": periodo(val("inicio"), val("fin")),
                "s": re.sub(r"^(sub)?sede:\s*", "", limpiar(val("sede")), flags=re.I),
                "l": localidad(val("loc")),
                "p": localidad(val("partido")),
                "u": ugc(val("ugc")),
                "a": ciclo,
            })
    return cursos


def main():
    cursos = []
    for archivo, hojas, ciclo, minusculas in FUENTES:
        nuevos = leer(archivo, hojas, ciclo, minusculas)
        print(f"{archivo}: {len(nuevos)} cursos (ciclo {ciclo})")
        cursos += nuevos

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    cuerpo = json.dumps(cursos, ensure_ascii=False, separators=(",", ":"))
    DESTINO.write_text(
        "// Generado automáticamente por tools/xlsx_a_js.py — no editar a mano.\n"
        f"window.CURSOS = {cuerpo};\n",
        encoding="utf-8",
    )
    print(f"{len(cursos)} cursos escritos en {DESTINO.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
