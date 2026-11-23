# 声调体检:用 F0 曲线判定单字音频的声调(2声=上升 zú,3声=降升 zuǒ)
# 用法: uv run tone_check.py [voice:hex ...]   不带参数则体检 4 音色全部单字
# 说明: 曲线基于基频轨迹的半段中位数差(rel)与峰值位置(peak),只作筛查,结论仍需人耳确认
import sys, json, subprocess
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import numpy as np
from imageio_ffmpeg import get_ffmpeg_exe

ROOT = Path(__file__).resolve().parent.parent.parent
SR = 16000
VOICES = ['tianmei', 'xiaoling', 'warm', 'tong']

def load(path, sr=SR):
    out = subprocess.run([get_ffmpeg_exe(), '-i', str(path), '-f', 's16le', '-ac', '1',
                          '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(out, np.int16).astype(np.float32) / 32768.0

def voiced(x, win=320):
    n = len(x)//win
    rms = np.array([np.sqrt((x[i*win:(i+1)*win]**2).mean()) for i in range(n)])
    thr = max(rms.max()*0.08, 0.004)
    idx = np.where(rms > thr)[0]
    return x[idx[0]*win:(idx[-1]+1)*win] if len(idx) else x

def f0(x, hop=80, win=1024):
    vals = []
    for i in range(0, len(x)-win, hop):
        seg = x[i:i+win]
        if np.sqrt((seg**2).mean()) < 0.02:
            vals.append(np.nan); continue
        seg = seg - seg.mean()
        ac = np.correlate(seg, seg, 'full')[win-1:]
        lo, hi = int(SR/450), int(SR/70)
        cand = [(ac[k], k) for k in range(lo, min(hi, len(ac)))
                if ac[k] > ac[k-1] and ac[k] >= ac[k+1] and ac[k] > 0.25*ac.max()]
        if not cand:
            vals.append(np.nan); continue
        cand.sort(reverse=True)
        pick = None
        for _, k in cand:
            f = SR/k
            if 100 <= f <= 400: pick = f; break
        vals.append(pick if pick else SR/cand[0][1])
    return np.array(vals)

def contour(path):
    x = load(path)
    v = f0(voiced(x))
    v = v[~np.isnan(v)]
    if len(v) < 8: return None
    k = 5
    v = np.convolve(np.pad(v, (k, k), mode='edge'), np.ones(2*k+1)/(2*k+1), mode='valid')
    n = len(v)
    first, second = np.median(v[:n//2]), np.median(v[n//2:])
    return (second-first)/max(first, 1e-9), int(np.argmax(v))/n, first, second

def shape(rel, peak):
    if rel > 0.08: return '2声(上升)'
    if rel < -0.08: return '4声(下降)'
    if peak < 0.45: return '3声(降升)'
    return '1声/平'

if __name__ == '__main__':
    if len(sys.argv) > 1:
        for spec in sys.argv[1:]:
            p = (Path(spec) if '/' in spec or spec.endswith('.mp3')
                 else ROOT/'upload-cloud'/'audio'/spec.replace(':', '/')+'.mp3')
            if not p.exists(): print(f'{spec}: 缺失'); continue
            r = contour(p)
            print(f'{spec}: {shape(r[0], r[1])} rel={r[0]:+.3f} peak={r[1]:.2f} f0 {r[2]:.0f}->{r[3]:.0f}')
    else:
        chars = json.loads((ROOT/'scripts/asr-audit/chars.json').read_text(encoding='utf-8'))
        from pypinyin import lazy_pinyin, Style
        for voice in VOICES:
            for c in chars:
                p = ROOT/'upload-cloud'/'audio'/voice/(format(ord(c['char']), 'x')+'.mp3')
                if not p.exists(): continue
                r = contour(p)
                if not r: continue
                py = lazy_pinyin(c['char'], style=Style.TONE)[0]
                print(f'{voice}/{c["char"]}({py}): {shape(r[0], r[1])} rel={r[0]:+.3f} peak={r[1]:.2f}')
