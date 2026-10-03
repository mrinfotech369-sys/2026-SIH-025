"""
PDF Parser — IP-SAKTI Sahayak Step 2.

Uses PyMuPDF (pymupdf) to extract text from PDF files.
Returns structured PageResult objects with detected headings.
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class PageResult:
    """Text content extracted from one PDF page."""
    page_num: int           # 1-indexed
    text: str               # Cleaned extracted text
    headings_detected: List[str] = field(default_factory=list)
    has_ocr_needed: bool = False  # True if page has no extractable text
    word_count: int = 0


@dataclass
class PDFParseResult:
    """Full parse result for one PDF file."""
    file_path: str
    total_pages: int
    pages: List[PageResult]
    title_guess: str = ""
    language_guess: str = "en"
    ocr_pages: List[int] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Heading Detection Patterns
# ---------------------------------------------------------------------------

HEADING_PATTERNS = [
    # Numbered sections: "1.", "1.1", "Section 1", "Rule 3"
    re.compile(r"^(?:Section|Rule|Article|Chapter|Part|Schedule|Clause)\s+\d+[\w.]*", re.IGNORECASE),
    re.compile(r"^\d+(?:\.\d+)*\.?\s+[A-Z][^\n]{0,80}$", re.MULTILINE),
    # ALL CAPS short lines (≤80 chars) — likely headings
    re.compile(r"^[A-Z][A-Z\s\-:]{4,79}$", re.MULTILINE),
]

# Patterns to strip: headers/footers/page numbers
STRIP_PATTERNS = [
    re.compile(r"^\s*\d+\s*$", re.MULTILINE),                   # standalone page numbers
    re.compile(r"^(Page\s+\d+\s+of\s+\d+)\s*$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^\s*-\s*\d+\s*-\s*$", re.MULTILINE),           # — 12 —
    re.compile(r"IP-SAKTI|ipsakti", re.IGNORECASE),              # watermarks (internal docs)
]


def _detect_headings(text: str) -> List[str]:
    """Return lines that look like section headings."""
    headings: List[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or len(stripped) < 3:
            continue
        for pat in HEADING_PATTERNS:
            if pat.search(stripped):
                headings.append(stripped[:120])
                break
    return list(dict.fromkeys(headings))  # deduplicate preserving order


def _clean_text(raw: str) -> str:
    """Remove headers/footers/page numbers, normalise whitespace."""
    text = raw
    for pat in STRIP_PATTERNS:
        text = pat.sub("", text)
    # Collapse 3+ consecutive blank lines into 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip trailing spaces per line
    text = "\n".join(ln.rstrip() for ln in text.splitlines())
    return text.strip()


# ---------------------------------------------------------------------------
# Main Parser
# ---------------------------------------------------------------------------

def parse_pdf(file_path: str | Path, max_pages: Optional[int] = None) -> PDFParseResult:
    """
    Parse a PDF file and extract text page by page.

    Args:
        file_path: Absolute or relative path to PDF.
        max_pages: If set, only parse the first N pages.

    Returns:
        PDFParseResult with all extracted pages.

    Raises:
        FileNotFoundError: If the PDF does not exist.
        RuntimeError: If PyMuPDF fails to open the file.
    """
    try:
        import pymupdf as fitz  # preferred import alias
    except ImportError:
        import fitz  # type: ignore  # fallback

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {path}")

    logger.info("Parsing PDF: %s", path.name)

    try:
        doc = fitz.open(str(path))
    except Exception as exc:
        raise RuntimeError(f"PyMuPDF could not open {path}: {exc}") from exc

    total = len(doc)
    pages_to_parse = min(total, max_pages) if max_pages else total

    pages: List[PageResult] = []
    ocr_pages: List[int] = []
    title_guess = ""

    for i in range(pages_to_parse):
        page = doc[i]
        raw_text = page.get_text("text")  # type: ignore[attr-defined]

        if not raw_text or not raw_text.strip():
            # Page has no extractable text — likely scanned image
            logger.warning("Page %d has no extractable text (may need OCR)", i + 1)
            ocr_pages.append(i + 1)
            pages.append(PageResult(
                page_num=i + 1,
                text="",
                has_ocr_needed=True,
                word_count=0,
            ))
            continue

        cleaned = _clean_text(raw_text)
        headings = _detect_headings(cleaned)
        words = len(cleaned.split())

        # Use first page non-empty heading as title guess
        if not title_guess and headings:
            title_guess = headings[0]

        pages.append(PageResult(
            page_num=i + 1,
            text=cleaned,
            headings_detected=headings,
            has_ocr_needed=False,
            word_count=words,
        ))

    doc.close()

    # Language guess: simple heuristic — if many Devanagari chars, mark as 'hi'
    all_text_sample = " ".join(p.text[:200] for p in pages if p.text)
    devanagari_count = sum(1 for c in all_text_sample if "\u0900" <= c <= "\u097F")
    language_guess = "hi" if devanagari_count > 50 else "en"

    logger.info(
        "Parsed %s: %d pages, %d OCR-needed, language=%s",
        path.name, len(pages), len(ocr_pages), language_guess
    )

    return PDFParseResult(
        file_path=str(path.resolve()),
        total_pages=total,
        pages=pages,
        title_guess=title_guess,
        language_guess=language_guess,
        ocr_pages=ocr_pages,
    )
