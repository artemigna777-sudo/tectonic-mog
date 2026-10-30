"""Музыка + звуки для ролика 06 «Переписка»: pop на сообщения, тики набора, свист переезда, динь, удар штампа.
Читает videos/v06-times.json, берёт music/_06-base.wav (кусок образца) и пишет music/06-perepiska.wav."""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
T = json.loads((HERE / "videos/v06-times.json").read_text())
t, END = T["t"], T["end"]
SR = 44100
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(HERE / "music/_06-base.wav"), "-t", str(END), "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"],
                     capture_output=True, check=True).stdout
mus = np.frombuffer(raw, dtype=np.int16).astype(np.float32).reshape(-1, 2) / 32768
n = int(END * SR)
mus = np.pad(mus, ((0, max(0, n - len(mus))), (0, 0)))[:n]
sfx = np.zeros((n, 2), dtype=np.float32)

def add(at, sig, gain=1.0, pan=0.0):
    i = int(at * SR)
    sig = sig[: n - i]
    sfx[i : i + len(sig), 0] += sig * gain * (1 - max(0, pan))
    sfx[i : i + len(sig), 1] += sig * gain * (1 + min(0, pan))

def tone(f, d, decay=40, f2=None):
    x = np.arange(int(d * SR)) / SR
    fr = f if f2 is None else np.linspace(f, f2, len(x))
    ph = 2 * np.pi * np.cumsum(fr * np.ones_like(x)) / SR if f2 is not None else 2 * np.pi * f * x
    return (np.sin(ph) * np.exp(-decay * x)).astype(np.float32)

def noise(d, lo, hi, env):
    x = np.random.default_rng(7).standard_normal(int(d * SR)).astype(np.float32)
    spec = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    spec[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(spec, len(x)).astype(np.float32)
    y /= np.abs(y).max() + 1e-9
    return y * env(np.linspace(0, 1, len(x)))

POP_IN, POP_OUT = tone(620, 0.12, 38, 780), tone(900, 0.12, 38, 1100)
for k in ("s3", "s4", "btitle"):
    add(t[k], POP_IN, 0.5, -0.2)
add(t["s1"] + 0.03, POP_IN, 0.4, -0.2)
for k in ("m1", "m2", "m3", "bphoto"):
    add(t[k], POP_OUT, 0.5, 0.2)
for k in ("b1", "b2", "b3"):
    add(t[k], tone(1320, 0.18, 22) + 0.5 * tone(1980, 0.18, 26), 0.3)
for i in range(5):  # тики набора
    add(t["typing"] + 0.1 + i * 0.2, tone(300, 0.04, 90), 0.22)
sweep = lambda e: np.sin(np.pi * e) ** 1.5
add(t["slideB"] - 0.02, noise(0.4, 400, 5000, sweep), 0.55, -0.1)
add(t["slideA"] - 0.02, noise(0.4, 400, 5000, sweep), 0.55, 0.1)
add(t["result"], tone(1046, 0.5, 9) + 0.6 * tone(1568, 0.5, 11) + 0.4 * tone(2093, 0.5, 13), 0.5)
add(t["notice"], tone(70, 0.5, 9, 40) + 0.5 * noise(0.5, 60, 600, lambda e: np.exp(-14 * e)), 1.1)
add(t["endtext2"], tone(220, 0.25, 12, 330), 0.25)
add(t["cta"], tone(110, 0.6, 7, 55) + 0.4 * tone(880, 0.6, 10), 0.8)

mix = mus * 0.95 + sfx * 0.6
fade = np.minimum(1, (END - np.arange(n) / SR) / 0.4)[:, None]
mix = np.clip(mix * fade, -1, 1)
out = HERE / "music/06-perepiska.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("ok", out)
