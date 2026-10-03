"""
Text Chunker — IP-SAKTI Sahayak Step 2.

Section-aware, overlap-preserving chunker.
Target: 500–900 tokens per chunk, 10–20% overlap.
Respects paragraph and clause boundaries over hard splits.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

from ingestion.parsers.pdf_parser import PageResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Token estimation
# ---------------------------------------------------------------------------

def estimate_tokens(text: str) -> int:
    """
    Rough token count: ~0.75 tokens per word (GPT-style subword tokenisation).
    Sufficient for chunking heuristics; no tokenizer dependency required.
    """
    words = len(text.split())
    return max(1, int(words * 0.75))


# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------

@dataclass
class Chunk:
    """A single retrieval unit produced by the chunker."""
    chunk_index: int
    text: str
    token_count: int
    page_number: int           # starting page number (1-indexed)
    section: Optional[str]     # detected section heading (if any)
    heading: Optional[str]     # nearest heading above this chunk
    char_start: int = 0        # character offset in original page text (approximate)
    char_end: int = 0


# ---------------------------------------------------------------------------
# Boundary patterns
# ---------------------------------------------------------------------------

# Split on: blank lines (paragraph boundary), or clause-ending punctuation + newline
PARAGRAPH_SEP = re.compile(r"\n\s*\n")
CLAUSE_BOUNDARY = re.compile(r"(?<=[.!?;])\s*\n")

# Heading pattern (same as pdf_parser for consistency)
HEADING_RE = re.compile(
    r"^(?:Section|Rule|Article|Chapter|Part|Schedule|Clause)\s+\d+[\w.]*"
    r"|^\d+(?:\.\d+)*\.?\s+[A-Z]",
    re.IGNORECASE | re.MULTILINE
)


def _split_into_paragraphs(text: str) -> List[str]:
    """Split text into paragraph-level units."""
    # Try blank-line split first
    parts = PARAGRAPH_SEP.split(text)
    if len(parts) > 1:
        return [p.strip() for p in parts if p.strip()]
    # Fall back to clause boundary split
    parts = CLAUSE_BOUNDARY.split(text)
    return [p.strip() for p in parts if p.strip()]


def _detect_section(paragraph: str) -> Optional[str]:
    """Return the section identifier if the paragraph starts with a heading."""
    m = HEADING_RE.match(paragraph.strip())
    return m.group(0).strip() if m else None


# ---------------------------------------------------------------------------
# Main Chunker
# ---------------------------------------------------------------------------

def chunk_pages(
    pages: List[PageResult],
    target_tokens: int = 700,
    overlap_tokens: int = 100,
    min_tokens: int = 50,
) -> List[Chunk]:
    """
    Chunk a list of PageResult objects into retrieval-ready Chunk objects.

    Strategy:
    1. Iterate pages, collect paragraphs with their source page number.
    2. Accumulate paragraphs until target_tokens is reached.
    3. On boundary: emit chunk, start new chunk with overlap tail.
    4. Carry section/heading metadata forward.

    Args:
        pages: Parsed pages from pdf_parser.
        target_tokens: Target tokens per chunk (default 700, range 500–900).
        overlap_tokens: Overlap tokens between consecutive chunks (default 100).
        min_tokens: Minimum tokens for a chunk to be emitted (discard tiny tail).

    Returns:
        List of Chunk objects.
    """
    chunks: List[Chunk] = []
    chunk_index = 0

    # Buffer for accumulating paragraphs
    buffer: List[str] = []
    buffer_tokens: int = 0
    buffer_page: int = 1
    current_section: Optional[str] = None
    current_heading: Optional[str] = None

    # Overlap tail (last N tokens worth of text from previous chunk)
    overlap_buffer: str = ""
    overlap_page: int = 1

    def emit_chunk(buf: List[str], page: int, sec: Optional[str], hdg: Optional[str]) -> None:
        nonlocal chunk_index
        text = "\n\n".join(buf).strip()
        if not text:
            return
        tokens = estimate_tokens(text)
        if tokens < min_tokens:
            logger.debug("Skipping tiny chunk (%d tokens) on page %d", tokens, page)
            return
        chunks.append(Chunk(
            chunk_index=chunk_index,
            text=text,
            token_count=tokens,
            page_number=page,
            section=sec,
            heading=hdg,
        ))
        chunk_index += 1

    for page_result in pages:
        if not page_result.text or page_result.has_ocr_needed:
            continue

        page_text = page_result.text
        page_num = page_result.page_num
        paragraphs = _split_into_paragraphs(page_text)

        for para in paragraphs:
            if not para:
                continue

            # Detect headings: update current section/heading
            section_match = _detect_section(para)
            if section_match:
                current_section = section_match
                current_heading = section_match

            para_tokens = estimate_tokens(para)

            # If a single paragraph exceeds target, hard-split it by sentences
            if para_tokens > target_tokens * 1.5:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sent in sentences:
                    stokens = estimate_tokens(sent)
                    if buffer_tokens + stokens > target_tokens and buffer:
                        # emit current buffer
                        emit_chunk(buffer[:], buffer_page, current_section, current_heading)
                        # start overlap
                        tail_words = " ".join(" ".join(buffer).split()[-overlap_tokens:])
                        buffer = [tail_words, sent] if tail_words else [sent]
                        buffer_tokens = estimate_tokens("\n\n".join(buffer))
                        buffer_page = page_num
                    else:
                        if not buffer:
                            buffer_page = page_num
                            if overlap_buffer:
                                buffer = [overlap_buffer, sent]
                                overlap_buffer = ""
                            else:
                                buffer = [sent]
                        else:
                            buffer.append(sent)
                        buffer_tokens += stokens
                continue

            # Normal paragraph accumulation
            if buffer_tokens + para_tokens > target_tokens and buffer:
                emit_chunk(buffer[:], buffer_page, current_section, current_heading)
                # Build overlap tail
                all_words = " ".join(buffer).split()
                tail_words = " ".join(all_words[-overlap_tokens:])
                buffer = [tail_words, para] if tail_words else [para]
                buffer_tokens = estimate_tokens("\n\n".join(buffer))
                buffer_page = page_num
            else:
                if not buffer:
                    buffer_page = page_num
                    if overlap_buffer:
                        buffer = [overlap_buffer, para]
                        overlap_buffer = ""
                    else:
                        buffer = [para]
                else:
                    buffer.append(para)
                buffer_tokens += para_tokens

    # Emit remaining buffer
    if buffer:
        emit_chunk(buffer, buffer_page, current_section, current_heading)

    logger.info("Chunked into %d chunks (target %d tokens, overlap %d)", len(chunks), target_tokens, overlap_tokens)
    return chunks
