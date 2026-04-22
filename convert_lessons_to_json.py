import ast
import json
import os
import re
from typing import Dict, Any

ROOT = os.path.dirname(os.path.abspath(__file__))
LESSON_SCRIPT = os.path.join(ROOT, "assets", "js", "lesson-script.js")
OUT_DIR = os.path.join(ROOT, "lessons_json")

# Canonical learning path order used by dashboard/progress pages.
CANONICAL_ORDER = [
    "present-simple",
    "present-continuous",
    "past-simple",
    "present-perfect",
    "future-simple",
    "past-continuous",
    "present-perfect-continuous",
    "past-perfect",
    "future-perfect",
    "future-continuous",
    "past-perfect-continuous",
    "future-perfect-continuous",
]


def strip_js_comments(text: str) -> str:
    out = []
    i = 0
    in_str = False
    quote = ""
    esc = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if in_str:
            out.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                in_str = False
                quote = ""
            i += 1
            continue

        if ch in ("'", '"'):
            in_str = True
            quote = ch
            out.append(ch)
            i += 1
            continue

        if ch == "/" and nxt == "/":
            i += 2
            while i < len(text) and text[i] not in "\r\n":
                i += 1
            continue

        if ch == "/" and nxt == "*":
            i += 2
            while i + 1 < len(text) and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
            continue

        out.append(ch)
        i += 1

    return "".join(out)


def js_object_to_python_literal(text: str) -> str:
    res = []
    i = 0
    in_str = False
    quote = ""
    esc = False

    while i < len(text):
        ch = text[i]

        if in_str:
            res.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                in_str = False
                quote = ""
            i += 1
            continue

        if ch in ("'", '"'):
            in_str = True
            quote = ch
            res.append(ch)
            i += 1
            continue

        if ch.isalpha() or ch == "_":
            j = i
            while j < len(text) and (text[j].isalnum() or text[j] == "_"):
                j += 1
            token = text[i:j]

            k = j
            while k < len(text) and text[k].isspace():
                k += 1

            if k < len(text) and text[k] == ":":
                prev = i - 1
                while prev >= 0 and text[prev].isspace():
                    prev -= 1
                prev_char = text[prev] if prev >= 0 else ""
                if prev_char in "{,":
                    res.append("'")
                    res.append(token)
                    res.append("'")
                    i = j
                    continue

            if token == "true":
                res.append("True")
                i = j
                continue
            if token == "false":
                res.append("False")
                i = j
                continue
            if token == "null":
                res.append("None")
                i = j
                continue

            res.append(token)
            i = j
            continue

        res.append(ch)
        i += 1

    lit = "".join(res)
    lit = re.sub(r",\s*([}\]])", r"\1", lit)
    return lit


def main() -> None:
    with open(LESSON_SCRIPT, "r", encoding="utf-8") as f:
        src = f.read()

    start_marker = "const lessonsData = {"
    end_markers = [
        "\n};\n\nasync function loadLessonFromJson",
        "\n};\n\nfunction loadLesson()",
    ]
    start = src.find(start_marker)
    end = -1
    for marker in end_markers:
        end = src.find(marker, start)
        if end != -1:
            break

    if start == -1 or end == -1:
        raise RuntimeError("Could not find lessonsData block")

    block = src[start + len("const lessonsData = "):end + 2]
    no_comments = strip_js_comments(block)
    py_lit = js_object_to_python_literal(no_comments)

    lessons: Dict[str, Any] = ast.literal_eval(py_lit)

    order_map = {tense_id: idx + 1 for idx, tense_id in enumerate(CANONICAL_ORDER)}

    # Keep known learning path first, append any unknown tenses after it alphabetically.
    unknown_tenses = sorted([tid for tid in lessons.keys() if tid not in order_map])
    next_order = len(order_map) + 1
    for tense_id in unknown_tenses:
        order_map[tense_id] = next_order
        next_order += 1

    os.makedirs(OUT_DIR, exist_ok=True)
    for tense, lesson in lessons.items():
        if isinstance(lesson, dict):
            if "order" not in lesson:
                lesson["order"] = order_map.get(tense, 999)
            for key in ("videoFile", "videoFile2", "videoFile3", "videoFile4"):
                if key in lesson and isinstance(lesson[key], str) and not lesson[key].startswith("assets/video/"):
                    lesson[key] = "assets/video/" + lesson[key]
        out_path = os.path.join(OUT_DIR, f"{tense}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(lesson, f, ensure_ascii=True, indent=2)

    manifest_path = os.path.join(OUT_DIR, "manifest.json")
    ordered_tenses = sorted(list(lessons.keys()), key=lambda tid: order_map.get(tid, 999))
    manifest_lessons = [
        {"id": tense_id, "order": order_map.get(tense_id, 999)}
        for tense_id in ordered_tenses
    ]
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "lessons": manifest_lessons,
                "tenses": ordered_tenses,
            },
            f,
            ensure_ascii=True,
            indent=2,
        )

    print(f"Generated {len(lessons)} lesson files")


if __name__ == "__main__":
    main()
