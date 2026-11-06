#!/usr/bin/env python3
"""t_483bdaf0 — 피드 카드 autoplay 가시 경계 실측(스윕).

HF live(:9222)·OHF(:3114 via :9335) 의 각 영상 재생/정지 경계(뷰포트 높이 vs
교차 발화)를 스윕으로 수확 — HF 의 autoplay 트리거 임계값/rootMargin 를 JS 를
읽지 않고 라이브 실측으로 결정하고 OHF 와 비교한다.
"""
import asyncio, json, urllib.request, sys
import websockets
_msg=0
async def send(ws,method,params=None,session=None):
    global _msg
    _msg+=1; mid=_msg
    m={"id":mid,"method":method,"params":params or {}}
    if session: m["sessionId"]=session
    await ws.send(json.dumps(m))
    while True:
        raw=await asyncio.wait_for(ws.recv(),timeout=30); d=json.loads(raw)
        if d.get("id")==mid:
            if "error" in d: raise RuntimeError(f"{method}->{d['error']}")
            return d.get("result",{})
def http_json(ep,path):
    with urllib.request.urlopen(ep+path,timeout=10) as r: return json.loads(r.read().decode())

VID_JS=r"""
(() => {
  const rect=el=>{const r=el.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};};
  const vh=window.innerHeight;
  return JSON.stringify(Array.from(document.querySelectorAll('video')).map(v=>{
    const r=rect(v); const visible=Math.max(0,Math.min(r.y+r.h,vh)-Math.max(r.y,0));
    return {cls:String(v.className||'').slice(0,24),y:+r.y.toFixed(1),h:+r.h.toFixed(1),
            visRatio:+(visible/r.h).toFixed(3),paused:v.paused,currentTime:+v.currentTime.toFixed(2)};
  }));
})()
"""
async def snap(ws,sid):
    r=await send(ws,"Runtime.evaluate",{"expression":VID_JS,"returnByValue":True},sid)
    return json.loads(r["result"]["value"])
async def sweep(ws,sid,label):
    res={}
    for h in [900,700,500,400,360,330,305,280,250,220,200,180,150,120,90]:
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":h,"deviceScaleFactor":1,"mobile":False},sid)
        await asyncio.sleep(1.2)
        res[h]=await snap(ws,sid)
    await send(ws,"Emulation.setDeviceMetricsOverride",
               {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},sid)
    return res
async def run(ep,url,is_hf):
    ver=http_json(ep,"/json/version")
    async with websockets.connect(ver["webSocketDebuggerUrl"],max_size=16_000_000) as ws:
        t=await send(ws,"Target.createTarget",{"url":"about:blank"}); target=t["targetId"]
        sid=(await send(ws,"Target.attachToTarget",{"targetId":target,"flatten":True}))["sessionId"]
        await send(ws,"Page.enable",{},sid); await send(ws,"Runtime.enable",{},sid)
        await send(ws,"Network.enable",{},sid)
        await send(ws,"Emulation.setDeviceMetricsOverride",
                   {"width":1440,"height":900,"deviceScaleFactor":1,"mobile":False},sid)
        await send(ws,"Page.navigate",{"url":url},sid)
        # settle
        for _ in range(50):
            await asyncio.sleep(0.5); s=await snap(ws,sid)
            if any(not v["paused"] for v in s): break
        r=await sweep(ws,sid,"x")
        try: await send(ws,"Target.closeTarget",{"targetId":target})
        except Exception: pass
        return r
async def main():
    hf,ohf=await asyncio.gather(run("http://127.0.0.1:9222","https://higgsfield.ai/ko/ai/video?model=minimax_h3",True),
                                run("http://127.0.0.1:9335","http://127.0.0.1:3114/",False))
    out="/home/baramofme/open-higgsfield/.worktrees/t_483bdaf0/anim_verify/hf_autoplay_boundary.json"
    with open(out,"w") as f: json.dump({"hf":hf,"ohf":ohf},f,ensure_ascii=False,indent=1)
    print("=== autoplay boundary sweep (each video: paused flips at vh) ===")
    print("HF")
    for h,arr in hf.items():
        print(" vh",h, [(v["cls"][:18],"paused="+str(v["paused"]),"vis="+str(v["visRatio"])) for v in arr])
    print("OHF")
    for h,arr in ohf.items():
        print(" vh",h, [(v["cls"][:18],"paused="+str(v["paused"]),"vis="+str(v["visRatio"])) for v in arr])
if __name__=="__main__": asyncio.run(main())
