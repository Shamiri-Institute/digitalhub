# /// script
# requires-python = ">=3.11"
# dependencies = ["fonttools[woff]==4.68.0", "uharfbuzz==0.57.0"]
# ///
"""Cuts the site's web fonts down to what the site renders and splits each into a core file, which
pages preload, and an extended file that the browser fetches only for text that needs it.

Run by hand and commit what it writes to app/fonts/ (the .woff2 files and the next/font modules
that declare them):

    npm run fonts:subset

It needs uv (https://docs.astral.sh/uv/), which installs the pinned Python packages above. Rerun it
when
- a source font changes: the Figtree SemiBold download below, or public/fonts/figtree/*.ttf (run
  `npm run survey:metrics` too);
- the UI renders a character outside a font's `core` and `extended` sets below (it falls back to
  Arial), or turns on an OpenType feature outside its `features`, such as `diagonal-fractions`;
- the print preview in page-proof.tsx stops turning kerning and ligatures off.

The script checks what it writes and exits non-zero if a check fails: each file maps exactly the
characters its unicode-range lists, and HarfBuzz sets every character, and every pair a file sets
together, to the same outlines and positions as the source font seen through the same ranges.
"""

import hashlib
import io
import itertools
import re
import sys
import textwrap
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

import uharfbuzz as hb
from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont, woff2

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "app/fonts"

ASCII = set(range(0x20, 0x7F))
LATIN_1 = set(range(0xA0, 0x100))
LATIN_EXTENDED_A = set(range(0x100, 0x180))
# Curly quotes, dashes and the ellipsis, which Chrome also draws for `text-overflow: ellipsis` but
# only from the font that holds the space, plus the minus sign in fellow-activity-table.tsx.
PUNCTUATION = {0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2212}
MACRON_DIAERESIS = {0x0304, 0x0308}

# Features Chrome turns on by default that the fonts use. Figtree's `locl` lookups are only for
# Azerbaijani, Catalan, Dutch, Romanian, Turkish and the like, and every page is lang="en".
DEFAULT_FEATURES = ["ccmp", "kern", "mark", "mkmk", "rvrn"]


@dataclass
class Font:
    name: str
    sources: dict[int, Path]
    core: set[int]
    extended: set[int]
    features: list[str]
    # Feature settings the site shapes this font with, for the checks.
    shaping: list[dict[str, bool]]
    hinting: bool
    # Whether characters in different files must not interact. A file boundary stops kerning and
    # contextual substitution, so where the source served everything from one file, they mustn't.
    inert_boundary: bool
    source_note: str
    # The next/font module that declares the files. Both files declare the core's export name as
    # their family, the name next/font gives the class, so they form one family with the fallback
    # after both.
    module: str
    export: str
    docs: tuple[str, str]
    # Extra localFont options for the core file.
    core_options: str = ""
    files: dict[tuple[int, str], Path] = field(default_factory=dict)
    ranges: dict[str, str] = field(default_factory=dict)


FIGTREE_SEMIBOLD_URL = (
    "https://fonts.gstatic.com/s/figtree/v9/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_ehR15e.ttf"
)
FIGTREE_SEMIBOLD_SHA256 = "b5d3fe714f8283b072579c9318c6cbe9e028ca51d6ba33eed0412a828ec331da"


def download_figtree_semibold() -> Path:
    """Google Fonts' static Figtree 600, the font next/font/google served before this script."""
    cache = ROOT / "node_modules/.cache/fonts/Figtree-SemiBold-google-v9.ttf"
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_bytes(urllib.request.urlopen(FIGTREE_SEMIBOLD_URL).read())
    digest = hashlib.sha256(cache.read_bytes()).hexdigest()
    if digest != FIGTREE_SEMIBOLD_SHA256:
        cache.unlink()
        sys.exit(f"{FIGTREE_SEMIBOLD_URL} changed (sha256 {digest}); review it before updating")
    return cache


def print_characters(sources: dict[int, Path]) -> set[int]:
    """What the print layout can set, by the rule scripts/survey/generate-figtree-metrics.ts uses."""
    cmaps = [set(TTFont(path).getBestCmap()) for path in sources.values()]
    return {
        c
        for c in set.intersection(*cmaps)
        if not (c < 0x20 or 0x7F <= c < 0xA0 or 0x300 <= c < 0x370 or c == 0xFFFF)
    }


def fonts() -> list[Font]:
    print_sources = {
        weight: ROOT / f"public/fonts/figtree/Figtree-{style}.ttf"
        for weight, style in [(400, "Regular"), (600, "SemiBold"), (700, "Bold")]
    }
    printable = print_characters(print_sources)
    # The fraction slash shapes with the digits around it (HarfBuzz builds fractions), so it
    # stays in their file.
    print_core = ASCII | PUNCTUATION | {0x2044}
    return [
        Font(
            name="figtree-semibold",
            sources={600: download_figtree_semibold()},
            # Google Fonts served ASCII, Latin-1, ı, Œ and œ in one file, so they kern with each
            # other, and Latin Extended-A in another, so it never kerned against them. Keeping that
            # split keeps every word set as before; an ASCII-only core would unkern "Té" or "fé".
            # Carriage return maps to an empty glyph, as it did. The combining macron and diaeresis
            # were in that file too, so Chrome sets Ā Ē Ī Ō Ū Ÿ and their lowercase from it as a
            # letter plus a mark; without them it draws the extended file's own Ō, whose macron
            # sits a pixel off.
            core={0x0D} | ASCII | LATIN_1 | {0x131, 0x152, 0x153} | PUNCTUATION | MACRON_DIAERESIS,
            extended=LATIN_EXTENDED_A - {0x131, 0x152, 0x153},
            features=[*DEFAULT_FEATURES, "tnum"],
            shaping=[{}, {"tnum": True}],
            hinting=False,
            inert_boundary=False,
            source_note="Google Fonts' Figtree SemiBold",
            module="figtree.ts",
            export="figtree",
            docs=(
                "Figtree SemiBold, which every page renders in: ASCII, Latin-1 and common"
                " punctuation. Pages preload it.",
                "Figtree's Latin Extended-A, which the browser fetches only for text that uses it.",
            ),
            # The fallback face next/font/google generated for Figtree, kept in app/globals.css.
            core_options='adjustFontFallback: false, fallback: ["Figtree Fallback"],',
        ),
        Font(
            name="figtree-print",
            sources=print_sources,
            core=print_core,
            # Everything the print layout sets, so the preview draws what the PDF prints.
            extended=printable - print_core,
            # The preview turns kerning and ligatures off. Fractions stay: HarfBuzz builds them
            # around a fraction slash whatever the CSS says.
            features=["ccmp", "mark", "mkmk", "frac", "numr", "dnom"],
            shaping=[{f: False for f in ["kern", "liga", "clig", "dlig", "hlig", "calt"]}],
            # The TTFs are hinted. Chrome on Linux and macOS ignores the hints, but Windows
            # grid-fits with them, so keep them and the preview rasterizes as before there too.
            # Without them each file is about 40% smaller.
            hinting=True,
            inert_boundary=True,
            source_note="public/fonts/figtree",
            module="print-font.ts",
            export="printFont",
            docs=(
                "The print fonts for the survey print preview, so it sets text as the PDF does:"
                " ASCII and common punctuation. The preview preloads it.",
                "The rest of what the print layout can set, fetched only for text that uses it.",
            ),
        ),
    ]


def unicode_range(code_points: set[int]) -> str:
    runs = []
    for _, group in itertools.groupby(enumerate(sorted(code_points)), lambda p: p[1] - p[0]):
        run = [c for _, c in group]
        runs.append(f"U+{run[0]:04X}" + (f"-{run[-1]:04X}" if len(run) > 1 else ""))
    return ", ".join(runs)


def reserved_font_names(font: TTFont) -> list[str]:
    copyright_notice = font["name"].getDebugName(0) or ""
    return re.findall(r"Reserved Font Names? [\"'“]([^\"'”]+)", copyright_notice)


# Family, full, unique, PostScript and typographic family names; the copyright notice keeps its own.
FONT_NAME_IDS = {1, 3, 4, 6, 16, 18, 21}


def rename(font: TTFont, reserved: str, replacement: str):
    """The OFL forbids a Reserved Font Name on a modified font."""
    for record in font["name"].names:
        if record.nameID in FONT_NAME_IDS:
            text = record.toUnicode()
            if record.nameID == 6:
                record.string = text.replace(reserved.replace(" ", ""), replacement.replace(" ", ""))
            else:
                record.string = text.replace(reserved, replacement)


def cut(source: Path, code_points: set[int], font: Font) -> bytes:
    # Keep the source's timestamp so a rerun writes the same bytes, and its glyph bounding boxes:
    # FreeType places a glyph at its box's left edge minus its left side bearing, and
    # recalculating the boxes of composites like the tabular 0 moves them by a unit.
    tt = TTFont(source, recalcTimestamp=False, recalcBBoxes=False)
    options = subset.Options()
    options.layout_features = font.features
    options.hinting = font.hinting
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.name_languages = [0x409]
    options.name_legacy = False
    options.glyph_names = False
    options.notdef_outline = False
    # Browsers ignore the style table, and every file is a single static instance.
    options.drop_tables += ["STAT"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=code_points)
    subsetter.subset(tt)
    for reserved in reserved_font_names(tt):
        rename(tt, reserved, "Subset")
    sfnt = io.BytesIO()
    tt.save(sfnt)
    sfnt.seek(0)
    out = io.BytesIO()
    woff2.compress(sfnt, out, transform_tables={"glyf", "loca", "hmtx"})
    return out.getvalue()


class Shaper:
    def __init__(self, font: TTFont):
        font.flavor = None
        sfnt = io.BytesIO()
        font.save(sfnt)
        self.tt = TTFont(io.BytesIO(sfnt.getvalue()), recalcBBoxes=False)
        self.cmap = set(self.tt.getBestCmap())
        self.glyphs = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        self.hb = hb.Font(hb.Face(hb.Blob(sfnt.getvalue())))
        self.outlines: dict[int, tuple] = {}

    def outline(self, gid: int):
        """The glyph's outline and advance, and the offset FreeType places it at."""
        if gid not in self.outlines:
            name = self.order[gid]
            glyph = self.glyphs[name]
            pen = DecomposingRecordingPen(self.glyphs)
            glyph.draw(pen)
            box = self.tt["glyf"][name]
            offset = getattr(box, "xMin", 0) - self.tt["hmtx"][name][1] if box.numberOfContours else 0
            self.outlines[gid] = (tuple(pen.value), glyph.width, offset)
        return self.outlines[gid]

    def shape(self, text: str, features: dict[str, bool]):
        """Outlines and positions, or None where the font can't set the text."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction, buf.script, buf.language = "ltr", "Latn", "en"
        hb.shape(self.hb, buf, features)
        if any(info.codepoint == 0 for info in buf.glyph_infos):
            return None
        return [
            (self.outline(info.codepoint), info.cluster, *pos.position)
            for info, pos in zip(buf.glyph_infos, buf.glyph_positions)
        ]


def through_range(source: Path, code_points: set[int]) -> Shaper:
    """The source as Chrome sees it through a face's unicode-range: nothing else maps."""
    tt = TTFont(source, recalcBBoxes=False)
    for table in tt["cmap"].tables:
        table.cmap = {c: glyph for c, glyph in table.cmap.items() if c in code_points}
    return Shaper(tt)


# Chrome tries the faces of a family from the last declared, and write_module declares the core
# last. A face can set characters outside its range by decomposing them into ones inside it.
FACE_ORDER = ["core", "extended"]


def first_face(shapers: dict[str, Shaper], text: str, features: dict[str, bool]):
    for part in FACE_ORDER:
        if (shaped := shapers[part].shape(text, features)) is not None:
            return part, shaped
    return None, None


VERTICAL_METRICS = {
    "hhea": ["ascent", "descent", "lineGap"],
    "OS/2": ["sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent", "fsSelection"],
    "post": ["underlinePosition", "underlineThickness"],
    "head": ["unitsPerEm"],
}


def check_file(font: Font, label: str, out: Shaper, code_points: set[int], source: Shaper) -> list[str]:
    problems = []
    if out.cmap != code_points:
        problems.append(f"{label}: maps {unicode_range(out.cmap ^ code_points)} against its range")
    for table, fields in VERTICAL_METRICS.items():
        for name in fields:
            if getattr(out.tt[table], name) != getattr(source.tt[table], name):
                problems.append(f"{label}: {table}.{name} changed")
    features = {
        record.FeatureTag
        for tag in ("GSUB", "GPOS")
        if tag in out.tt
        for record in out.tt[tag].table.FeatureList.FeatureRecord
    }
    if extra := features - set(font.features):
        problems.append(f"{label}: unexpected features {sorted(extra)}")
    if "fvar" in out.tt:
        problems.append(f"{label}: still variable")
    if not font.hinting:
        hinted = [t for t in ("fpgm", "prep", "cvt ") if t in out.tt]
        hinted += [n for n in out.order if getattr(out.tt["glyf"][n], "program", None)]
        if hinted:
            problems.append(f"{label}: hinting left in {hinted[:5]}")
    family = out.tt["name"].getDebugName(1) or ""
    if any(reserved in family for reserved in reserved_font_names(source.tt)):
        problems.append(f"{label}: still carries its Reserved Font Name")
    return problems


def check_shaping(font: Font, label: str, outs: dict[str, Shaper], refs: dict[str, Shaper], source: Shaper) -> list[str]:
    """Every character of the source, and every pair a face sets together, the way Chrome sets them."""
    problems = []
    for features in font.shaping:
        by_face: dict[str, list[str]] = {part: [] for part in FACE_ORDER}
        mismatched = []
        for c in sorted(source.cmap):
            ref_part, ref_shape = first_face(refs, chr(c), features)
            if (ref_part, ref_shape) != first_face(outs, chr(c), features):
                mismatched.append(chr(c))
            elif ref_part:
                by_face[ref_part].append(chr(c))
        for part, chars in by_face.items():
            texts = ["".join(chars)] + [a + b for a, b in itertools.product(chars, chars)]
            mismatched += [t for t in texts if outs[part].shape(t, features) != refs[part].shape(t, features)]
        if mismatched:
            problems.append(f"{label} {features}: {len(mismatched)} strings set differently, e.g. {mismatched[:5]}")
    return problems


def boundary_pairs(font: Font, source: Shaper) -> int:
    """Pairs that would kern or substitute together but sit in different files."""
    core = sorted(font.core & source.cmap)
    extended = sorted(font.extended & source.cmap)
    count = 0
    for features in font.shaping:
        for a, b in itertools.chain(itertools.product(core, extended), itertools.product(extended, core)):
            apart = source.shape(chr(a), features) + source.shape(chr(b), features)
            together = source.shape(chr(a) + chr(b), features)
            # Clusters restart per run; compare outlines and positions only.
            if [g[:1] + g[2:] for g in together] != [g[:1] + g[2:] for g in apart]:
                count += 1
    return count


def write_module(font: Font):
    def call(part: str, options: str) -> str:
        if len(font.sources) == 1:
            # A single file's weight and style go on the class too, as next/font/google put them.
            [weight] = font.sources
            src = f'src: "./{font.files[(weight, part)].name}", weight: "{weight}", style: "normal",'
        else:
            entries = ", ".join(
                f'{{ path: "./{font.files[(weight, part)].name}", weight: "{weight}" }}'
                for weight in sorted(font.sources)
            )
            src = f"src: [{entries}],"
        options = f"\n  {options}" if options else ""
        return f"""localFont({{
  {src}{options}
  declarations: [
    {{ prop: "font-family", value: "{font.export}" }},
    {{ prop: "unicode-range", value: "{font.ranges[part]}" }},
  ],
}})"""

    def doc(text: str) -> str:
        lines = textwrap.wrap(text, 96)
        return "/**\n" + "".join(f" * {line}\n" for line in lines) + " */"

    core_doc, extended_doc = font.docs
    (OUT / font.module).write_text(
        f"""// Generated by scripts/fonts/subset-fonts.py from {font.source_note}. Rerun it with
// `npm run fonts:subset` rather than editing this file.
import localFont from "next/font/local";

{doc(extended_doc)}
export const {font.export}Extended = {call("extended", "preload: false, adjustFontFallback: false,")};

{doc(core_doc + " Declared last, so Chrome tries it first.")}
export const {font.export} = {call("core", font.core_options)};
"""
    )


def main():
    OUT.mkdir(exist_ok=True)
    problems = []
    for font in fonts():
        for weight, source_path in font.sources.items():
            source = Shaper(TTFont(source_path, recalcBBoxes=False))
            outs, refs = {}, {}
            for part, wanted in [("core", font.core), ("extended", font.extended)]:
                code_points = wanted & source.cmap
                if font.ranges.setdefault(part, unicode_range(code_points)) != unicode_range(code_points):
                    problems.append(f"{font.name}: weights differ in which {part} characters they hold")
                data = cut(source_path, code_points, font)
                path = OUT / f"{font.name}-{weight}-{part}.woff2"
                path.write_bytes(data)
                font.files[(weight, part)] = path
                print(f"{path.relative_to(ROOT)}  {len(data):>6} bytes  {len(code_points):>3} characters")
                outs[part] = Shaper(TTFont(io.BytesIO(data), recalcBBoxes=False))
                refs[part] = through_range(source_path, code_points)
                problems += check_file(font, f"{path.name}", outs[part], code_points, source)
            problems += check_shaping(font, f"{font.name} {weight}", outs, refs, source)
            crossing = boundary_pairs(font, source)
            print(f"  {crossing} pairs would kern or substitute across the core/extended boundary")
            if crossing and font.inert_boundary:
                problems.append(f"{font.name} {weight}: {crossing} pairs interact across files")
        write_module(font)
    for problem in problems:
        print("FAIL", problem, file=sys.stderr)
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
