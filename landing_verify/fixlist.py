#!/usr/bin/env python3
"""비교 결과 전체를 앵커별로 출력(fixlist). 이슈 필드는 anchor/hf/kind/detail."""
import json, collections

cmp = json.load(open("ohf_hf_image_compare.json"))
issues = cmp["issues"]
kinds = collections.Counter(i["kind"] for i in issues)
print("KINDS:", dict(kinds), "TOTAL:", len(issues), "CHECKED:", cmp.get("checked"))
print()
byanch = collections.defaultdict(list)
for i in issues:
    byanch[i["anchor"]].append(i)
for a in sorted(byanch):
    print(f"### {a} ({len(byanch[a])})")
    for i in byanch[a]:
        print(f"  [{i['kind']}] #{i['hf']} {i['detail']}")
    print()
