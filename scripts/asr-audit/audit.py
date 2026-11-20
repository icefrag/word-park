# 音频内容审计:faster-whisper 听写字音频,与字表比对
# 用法: uv run audit.py [--voice tianmei] [--sample 20] [--out result.json]
import sys, json, re, argparse, subprocess
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
from imageio_ffmpeg import get_ffmpeg_exe
from pypinyin import lazy_pinyin

# 拼音归一:杀掉 whisper 的同音字/繁体化/数字误报,只留真错位
NUMMAP = str.maketrans('0123456789', '零一二三四五六七八九')
def pykey(text):
    return ''.join(lazy_pinyin(text.translate(NUMMAP)))

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
        p_exp, p_asr = pykey(expect), pykey(clean)
        ok = p_exp in p_asr or p_asr in p_exp  # 双向 contains:容忍省略号重复与漏字
        results.append({'file': f'{args.voice}/{f.name}', 'char': exp['char'],
                        'expect': expect, 'asr': clean, 'ok': ok})
        done += 1
        if done % 50 == 0:
            bad = sum(1 for r in results if not r['ok'])
            print(f'  {done}/{len(files)} 不匹配 {bad}', flush=True)

    bad = [r for r in results if not r['ok']]
    (HERE / args.out).write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'\n总计 {len(results)},不匹配 {len(bad)},明细已写 {args.out}')
    for r in bad[:80]:
        print(f"  {r['file']}  期望「{r['expect']}」 听到「{r['asr']}」")

if __name__ == '__main__':
    main()
