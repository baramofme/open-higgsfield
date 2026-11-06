#!/usr/bin/env python3
"""Apply GT-mandated token fixes to video-surface.css (t_bb8f3edb).

Targets genuine, visible defects only (content-domain/feed/inherited-typography
DOC-DIFFs are intentionally NOT touched). Each fix matches HF computed GT values:
  · CTA #214 : width fills column (inline-grid had no width) + font 16/600/lh24
  · #218/#220 credit spans inherit the CTA font fix (no separate edit needed)
  · #115/#270/#275 video fallback leaves : explicit 16/24 (inert, but makes leaves match)
  · #292 help span : explicit 16/24
  · #113/#198 fieldsets : neutralize UA 2px groove border -> solid 0px (matches HF)
All styling via --ohf-* (semantic, same-value) or --ctl-vid-* (component-local). No literals
in rule bodies; the only new literal is the --ctl-vid-px24 token declaration.
"""
import pathlib, sys
P = pathlib.Path("/home/baramofme/open-higgsfield/.worktrees/t_bb8f3edb/src/openhiggsfield/video-surface.css")
css = P.read_text(encoding="utf-8")

def rule_block(sel):
    """Return (start_index, end_index) of a rule `.ohf-vid-nNNN { ... }` located by its selector."""
    i = css.index(sel + " {")
    j = css.index("\n}", i) + 2  # past the closing brace line
    return i, j

edits = []  # list of (sel, transformation)

def insert_after_open(sel, decl):
    i, _ = rule_block(sel)
    head_end = css.index("{", i) + 1
    edits.append((head_end, head_end, decl))

def replace_in(sel, old, new):
    i, j = rule_block(sel)
    k = css.index(old, i)
    assert k < j, f"{old!r} not within {sel}"
    edits.append((k, k + len(old), new))

# 1. new line-height token (24px; --o-leading-normal=1.45 does NOT match GT's fixed 24px)
tok_anchor = "  --ctl-vid-px16: 16px;"
assert css.count(tok_anchor) == 1
k = css.index(tok_anchor) + len(tok_anchor)
edits.append((k, k, "\n  --ctl-vid-px24: 24px;"))

# 2. CTA button #214: weight medium->semibold(600, ==GT), add width/font-size/line-height
replace_in(".ohf-vid-n214",
           "  font-weight: var(--ohf-font-weight-medium);",
           "  font-size: var(--ohf-font-size-lead);\n"
           "  line-height: var(--ctl-vid-px24);\n"
           "  font-weight: var(--ohf-font-weight-semibold);\n"
           "  width: var(--ctl-vid-p100);")

# 3. fieldset #113/#198: neutralize UA groove border -> solid 0px (matches HF preflight)
BORDER_RESET = ("  border-top-width: var(--ctl-vid-px0);\n"
                "  border-right-width: var(--ctl-vid-px0);\n"
                "  border-bottom-width: var(--ctl-vid-px0);\n"
                "  border-left-width: var(--ctl-vid-px0);\n"
                "  border-top-style: solid;\n"
                "  border-right-style: solid;\n"
                "  border-bottom-style: solid;\n"
                "  border-left-style: solid;\n")
for fs in (".ohf-vid-n113", ".ohf-vid-n198"):
    insert_after_open(fs, "\n" + BORDER_RESET)

# 4. text-bearing leaves that leaked to root/UA typography -> explicit 16/24 (match GT)
FS_LH = ("  font-size: var(--ohf-font-size-lead);\n"
         "  line-height: var(--ctl-vid-px24);\n")
for vid in (".ohf-vid-n115", ".ohf-vid-n270", ".ohf-vid-n275", ".ohf-vid-n292"):
    insert_after_open(vid, "\n" + FS_LH)

# apply edits back-to-front so earlier offsets stay valid
edits.sort(key=lambda t: t[0], reverse=True)
for a, b, text in edits:
    css = css[:a] + text + css[b:]

P.write_text(css, encoding="utf-8")
print("applied edits:", len(edits), "-> bytes", len(css))
# sanity: ensure every --ctl-vid-px24 reference is backed by a declaration
assert "--ctl-vid-px24: 24px;" in css
refs = css.count("var(--ctl-vid-px24)")
print("px24 refs:", refs)
