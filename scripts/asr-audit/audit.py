# 音频内容审计:faster-whisper 听写字音频,与字表比对
# 用法: uv run audit.py [--voice tianmei] [--sample 20] [--out result.json]
import sys, json, re, argparse, subprocess
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
from imageio_ffmpeg import get_ffmpeg_exe
from pypinyin import lazy_pinyin, Style
from collections import Counter

# 拼音归一:杀掉 whisper 的同音字/繁体化/数字误报,只留真错位
NUMMAP = str.maketrans('0123456789', '零一二三四五六七八九')
# 按音节比,不用字符串子串:子串会把「足(zu)」当「左(zuo)」判成匹配
def sylkey(text):
    return lazy_pinyin(text.translate(NUMMAP))

def subset(a, b):
    """a 的音节多重集是否为 b 的子集(容忍 whisper 漏字/重复)"""
    cb = Counter(b)
    return all(cb[k] >= v for k, v in Counter(a).items())

# 带调拼音(zu2/zuo3):pykey 会把 zu/zuo 归一到同一基,声调错查不出来,单字播报要另比声调
def tone3(text):
    return ''.join(lazy_pinyin(text.translate(NUMMAP), style=Style.TONE3))

# 声调符号 -> 数字声调(zú -> zu2),与 gen-voice-audio.mjs 的 toneDigit 同规则
TONE_MAP = {'ā': ('a', 1), 'á': ('a', 2), 'ǎ': ('a', 3), 'à': ('a', 4),
            'ē': ('e', 1), 'é': ('e', 2), 'ě': ('e', 3), 'è': ('e', 4),
            'ī': ('i', 1), 'í': ('i', 2), 'ǐ': ('i', 3), 'ì': ('i', 4),
            'ō': ('o', 1), 'ó': ('o', 2), 'ǒ': ('o', 3), 'ò': ('o', 4),
            'ū': ('u', 1), 'ú': ('u', 2), 'ǔ': ('u', 3), 'ù': ('u', 4),
            'ǖ': ('v', 1), 'ǘ': ('v', 2), 'ǚ': ('v', 3), 'ǜ': ('v', 4)}

def pinyin_tone3(pinyin):
    tone, out = 0, ''
    for ch in pinyin:
        t = TONE_MAP.get(ch)
        if t:
            tone, out = t[1], out + t[0]
        elif ch == 'ü':
            out += 'v'
        else:
            out += ch
    return out + (str(tone) if tone else '0')

def tone_diff(exp_pinyin, asr_text):
    """同音不同调则返回 (期望声调, 听到声调);否则 None"""
    if not exp_pinyin or not asr_text:
        return None
    e = pinyin_tone3(exp_pinyin)
    a = tone3(asr_text[0])
    if not e or not a or e.endswith('0'):
        return None
    if e.rstrip('0123456789') != a.rstrip('0123456789'):
        return None
    if e[-1] == a[-1]:
        return None
    return e[-1], a[-1]

# PyAV 19 与 faster-whisper 不兼容,改用 ffmpeg 直接解码
def load_audio(path, sr=16000):
    out = subprocess.run([get_ffmpeg_exe(), '-i', str(path), '-f', 's16le', '-ac', '1',
                          '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(out, np.int16).astype(np.float32) / 32768.0

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # 仓库根
PUNCT = re.compile(r'[\s,，。.、!？?;;::""\'\'()()\-…—~·]+')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice', default='tianmei')
    ap.add_argument('--sample', type=int, default=0, help='只扫前 N 个(0=全量)')
    ap.add_argument('--out', default='result.json')
    ap.add_argument('--model', default='small')
    args = ap.parse_args()

    chars = json.loads((HERE / 'chars.json').read_text(encoding='utf-8'))
    hexmap = {format(ord(c['char']), 'x'): c for c in chars}
    dup = len(chars) - len(hexmap)
    print(f'字表 {len(chars)} 字,hex 去重后 {len(hexmap)}(重复 {dup})', flush=True)

    model = WhisperModel(args.model, device='cpu', compute_type='int8')
    files = sorted((ROOT / 'upload-cloud/audio' / args.voice).glob('*.mp3'))
    if args.sample:
        files = files[:args.sample]

    results, done = [], 0
    for f in files:
        stem = f.stem
        is_word = stem.endswith('-word')
        hexs = stem[:-5] if is_word else stem
        exp = hexmap.get(hexs)
        if exp is None:
            continue  # voice-* 固定文案,不在本次审计范围
        segs, _ = model.transcribe(load_audio(f), language='zh', condition_on_previous_text=False)
        clean = PUNCT.sub('', ''.join(s.text for s in segs))
        expect = exp['char'] + (exp['word'] if is_word else '')
        s_exp, s_asr = sylkey(expect), sylkey(clean)
        ok = subset(s_exp, s_asr) or subset(s_asr, s_exp)  # 音节级双向包含:容忍漏字/重复
        # 声调单独比:同音不同调(zu2 -> zuo3)时 ok 仍为 True,只能靠声调判定
        td = None if is_word else tone_diff(exp.get('pinyin', ''), clean)
        results.append({'file': f'{args.voice}/{f.name}', 'char': exp['char'],
                        'expect': expect, 'asr': clean, 'ok': ok,
                        'tone_bad': bool(td),
                        'tone_expect': td[0] if td else None,
                        'tone_heard': td[1] if td else None})
        done += 1
        if done % 50 == 0:
            bad = sum(1 for r in results if not r['ok'])
            print(f'  {done}/{len(files)} 不匹配 {bad}', flush=True)

    bad = [r for r in results if not r['ok']]
    tone_bad = [r for r in results if r['tone_bad']]
    (HERE / args.out).write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
    (HERE / 'tone-mismatch.json').write_text(json.dumps(tone_bad, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n总计 {len(results)},不匹配 {len(bad)},声调不符 {len(tone_bad)},明细已写 {args.out}')
    for r in bad[:80]:
        print(f"  {r['file']}  期望「{r['expect']}」 听到「{r['asr']}」")
    if tone_bad:
        print('\n声调不符(同音不同调,需人耳复核):')
        for r in tone_bad[:80]:
            print(f"  {r['file']}  期望「{r['expect']}」{r['tone_expect']}声 听到「{r['asr']}」{r['tone_heard']}声")

if __name__ == '__main__':
    main()
