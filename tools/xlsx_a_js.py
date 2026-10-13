"""Convierte la planilla de Oferta Formativa (hoja "Consolidado") en assets/js/cursos.js.

Uso:
    python3 tools/xlsx_a_js.py [ruta.xlsx]

Por defecto lee fuentes/04_Oferta_Formativa.xlsx. Requiere openpyxl.
Volvé a correrlo cada vez que se actualice la planilla.
"""
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / "fuentes" / "04_Oferta_Formativa.xlsx"
DESTINO = RAIZ / "assets" / "js" / "cursos.js"

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# Variantes de escritura que aparecen en la planilla -> forma única
LOCALIDADES = {
    "moron": "Morón", "morón": "Morón", "moròn": "Morón",
    "haedo": "Haedo", "la ferrere": "Laferrere", "laferrere": "Laferrere",
    "virrey del pino": "Virrey del Pino", "gonzalez catan": "González Catán",
    "gonzález catán": "González Catán", "ituzaingo": "Ituzaingó",
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


def limpiar(valor):
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    texto = re.sub(r"\s+", " ", str(valor)).strip()
    return "" if texto in ("-", "—", "None") else texto


def institucion(valor):
    texto = limpiar(valor)
    return re.sub(r"^(CFL|CFP)(\d)", r"\1 \2", texto)


def familia(valor):
    texto = limpiar(valor)
    return FAMILIAS.get(texto.lower(), texto[:1].upper() + texto[1:])


def localidad(valor):
    texto = limpiar(valor)
    return LOCALIDADES.get(texto.lower(), texto)


def condicion(valor):
    texto = limpiar(valor).lower()
    if texto.startswith("nuev"):
        return "Nuevo"
    if texto.startswith(("cont", "comt")):
        return "Continúa"
    return limpiar(valor)


def fecha(valor):
    if isinstance(valor, (datetime.date, datetime.datetime)):
        return valor.strftime("%Y-%m-%d"), f"{valor.day} de {MESES[valor.month - 1]} de {valor.year}"
    texto = limpiar(valor)
    return "", texto


def main():
    hoja = openpyxl.load_workbook(ORIGEN, data_only=True)["Consolidado"]
    cursos = []
    for fila in hoja.iter_rows(min_row=2, values_only=True):
        fila = list(fila[:13])
        if not any(fila):
            continue
        (gestion, inst, entidad, fam, curso, codigo, cond, horas,
         inicio, sede, loc, partido, ugc) = fila
        if not limpiar(curso):
            continue
        iso, inicio_txt = fecha(inicio)
        entidad_txt = limpiar(entidad)
        if re.fullmatch(r"\d+", entidad_txt):  # celdas con un número en lugar de la entidad
            entidad_txt = ""
        cursos.append({
            "g": limpiar(gestion),
            "i": institucion(inst),
            "e": entidad_txt,
            "f": familia(fam),
            "c": limpiar(curso),
            "k": limpiar(codigo),
            "n": condicion(cond),
            "h": limpiar(horas),
            "d": iso,
            "dt": inicio_txt,
            "s": re.sub(r"^(sub)?sede:\s*", "", limpiar(sede), flags=re.I),
            "l": localidad(loc),
            "p": localidad(partido),
            "u": limpiar(ugc),
        })

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
