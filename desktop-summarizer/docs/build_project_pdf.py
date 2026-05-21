from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "PROJECT_DOCUMENTATION.md"
OUTPUT = ROOT / "Offline_Document_Summarizer_Project_Guide.pdf"

PAGE_WIDTH = 612
PAGE_HEIGHT = 792
MARGIN_X = 52
MARGIN_TOP = 56
MARGIN_BOTTOM = 54
BODY_FONT_SIZE = 9.5
CODE_FONT_SIZE = 8.0
BODY_LEADING = 13
CODE_LEADING = 10


@dataclass
class RenderLine:
    text: str
    font: str
    size: float
    leading: float
    indent: int = 0


def main() -> None:
    markdown = SOURCE.read_text(encoding="utf-8")
    lines = markdown_to_render_lines(markdown)
    pages = paginate(lines)
    write_pdf(pages, OUTPUT)
    print(OUTPUT)


def markdown_to_render_lines(markdown: str) -> list[RenderLine]:
    render_lines: list[RenderLine] = []
    in_code = False

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()

        if line.startswith("```"):
            in_code = not in_code
            if not in_code:
                render_lines.append(blank())
            continue

        if in_code:
            render_lines.extend(wrap_code(line))
            continue

        if not line:
            render_lines.append(blank())
            continue

        if line.startswith("# "):
            render_lines.append(blank(6))
            render_lines.extend(wrap_text(line[2:], "F2", 18, 22))
            render_lines.append(blank(5))
            continue

        if line.startswith("## "):
            render_lines.append(blank(8))
            render_lines.extend(wrap_text(line[3:], "F2", 14, 18))
            continue

        if line.startswith("### "):
            render_lines.append(blank(5))
            render_lines.extend(wrap_text(line[4:], "F2", 11.5, 15))
            continue

        if line.startswith("- "):
            body = "- " + strip_inline_markdown(line[2:])
            render_lines.extend(wrap_text(body, "F1", BODY_FONT_SIZE, BODY_LEADING, indent=10))
            continue

        if line[0:2].isdigit() and ". " in line[:5]:
            render_lines.extend(
                wrap_text(strip_inline_markdown(line), "F1", BODY_FONT_SIZE, BODY_LEADING, indent=10)
            )
            continue

        if line.startswith("|"):
            render_lines.extend(wrap_code(line))
            continue

        render_lines.extend(
            wrap_text(strip_inline_markdown(line), "F1", BODY_FONT_SIZE, BODY_LEADING)
        )

    return compact_blank_lines(render_lines)


def strip_inline_markdown(text: str) -> str:
    return (
        text.replace("**", "")
        .replace("`", "")
        .replace("\\_", "_")
        .replace("&mdash;", "-")
    )


def wrap_text(
    text: str,
    font: str,
    size: float,
    leading: float,
    indent: int = 0,
) -> list[RenderLine]:
    available_width = PAGE_WIDTH - (2 * MARGIN_X) - indent
    avg_char_width = size * 0.52
    width = max(30, int(available_width / avg_char_width))
    wrapped = textwrap.wrap(text, width=width, replace_whitespace=False) or [""]
    return [RenderLine(part, font, size, leading, indent) for part in wrapped]


def wrap_code(text: str) -> list[RenderLine]:
    available_width = PAGE_WIDTH - (2 * MARGIN_X) - 8
    width = max(40, int(available_width / (CODE_FONT_SIZE * 0.6)))
    wrapped = textwrap.wrap(text, width=width, replace_whitespace=False, drop_whitespace=False) or [""]
    return [RenderLine(part, "F3", CODE_FONT_SIZE, CODE_LEADING, 8) for part in wrapped]


def blank(leading: float = BODY_LEADING) -> RenderLine:
    return RenderLine("", "F1", BODY_FONT_SIZE, leading)


def compact_blank_lines(lines: list[RenderLine]) -> list[RenderLine]:
    compacted: list[RenderLine] = []
    previous_blank = False
    for line in lines:
        current_blank = not line.text.strip()
        if current_blank and previous_blank:
            continue
        compacted.append(line)
        previous_blank = current_blank
    return compacted


def paginate(lines: list[RenderLine]) -> list[list[RenderLine]]:
    pages: list[list[RenderLine]] = []
    current: list[RenderLine] = []
    y = PAGE_HEIGHT - MARGIN_TOP
    min_y = MARGIN_BOTTOM + 24

    for line in lines:
        if y - line.leading < min_y and current:
            pages.append(current)
            current = []
            y = PAGE_HEIGHT - MARGIN_TOP
        current.append(line)
        y -= line.leading

    if current:
        pages.append(current)
    return pages


def write_pdf(pages: list[list[RenderLine]], output: Path) -> None:
    objects: list[bytes] = []

    def add_object(body: bytes) -> int:
        objects.append(body)
        return len(objects)

    catalog_id = add_object(b"<< /Type /Catalog /Pages 2 0 R >>")
    pages_id = add_object(b"")
    helvetica_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    helvetica_bold_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    courier_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

    page_ids: list[int] = []
    for page_number, lines in enumerate(pages, start=1):
        content = render_page(lines, page_number, len(pages))
        content_id = add_object(
            b"<< /Length "
            + str(len(content)).encode("ascii")
            + b" >>\nstream\n"
            + content
            + b"\nendstream"
        )
        page_id = add_object(
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
            f"/Resources << /Font << /F1 {helvetica_id} 0 R /F2 {helvetica_bold_id} 0 R /F3 {courier_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>".encode("ascii")
        )
        page_ids.append(page_id)

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("ascii")

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(body)
        pdf.extend(b"\nendobj\n")

    xref_position = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_position}\n%%EOF\n".encode("ascii")
    )

    output.write_bytes(bytes(pdf))


def render_page(lines: list[RenderLine], page_number: int, page_count: int) -> bytes:
    commands: list[str] = []
    y = PAGE_HEIGHT - MARGIN_TOP
    for line in lines:
        if line.text:
            x = MARGIN_X + line.indent
            commands.append(
                f"BT /{line.font} {line.size:.2f} Tf {x:.2f} {y:.2f} Td ({escape_pdf_text(line.text)}) Tj ET"
            )
        y -= line.leading

    footer = f"Offline Document Summarizer Project Guide | Page {page_number} of {page_count}"
    generated = f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    commands.append(f"BT /F1 8 Tf {MARGIN_X:.2f} 30 Td ({escape_pdf_text(footer)}) Tj ET")
    commands.append(
        f"BT /F1 8 Tf {PAGE_WIDTH - MARGIN_X - 122:.2f} 30 Td ({escape_pdf_text(generated)}) Tj ET"
    )
    return "\n".join(commands).encode("latin-1", errors="replace")


def escape_pdf_text(text: str) -> str:
    return (
        text.encode("latin-1", errors="replace")
        .decode("latin-1")
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


if __name__ == "__main__":
    main()

