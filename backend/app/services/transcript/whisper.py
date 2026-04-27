import asyncio
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import Settings


class TranscriptionError(Exception):
    pass


@dataclass
class WhisperResult:
    text: str
    duration_seconds: float | None


def _download_audio(video_url: str, out_dir: Path) -> tuple[Path, float | None]:
    try:
        import yt_dlp
    except ImportError as e:
        raise TranscriptionError("yt-dlp not installed") from e

    from app.services.transcript.ytdlp_opts import build_opts

    out_tmpl = str(out_dir / "audio.%(ext)s")
    opts = build_opts(
        extra={
            "format": "bestaudio/best",
            "outtmpl": out_tmpl,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "128",
                }
            ],
        }
    )
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
    duration = None
    if isinstance(info, dict):
        raw = info.get("duration")
        if isinstance(raw, (int, float)):
            duration = float(raw)
    for p in out_dir.iterdir():
        if p.suffix.lower() in {".mp3", ".m4a", ".webm", ".opus", ".wav"}:
            return p, duration
    raise TranscriptionError("yt-dlp produced no audio file")


def _transcribe_openai(audio_path: Path, settings: Settings) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.openai_api_key)
    with audio_path.open("rb") as f:
        resp = client.audio.transcriptions.create(model="whisper-1", file=f)
    return resp.text


def _transcribe_local(audio_path: Path, settings: Settings) -> str:
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        raise TranscriptionError(
            "faster-whisper not installed; install with extras [whisper-local]"
        ) from e

    model = WhisperModel(settings.whisper_local_model, device="auto", compute_type="auto")
    segments, _ = model.transcribe(str(audio_path))
    return " ".join(s.text for s in segments).strip()


def _run(video_url: str, settings: Settings) -> WhisperResult:
    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        audio, duration = _download_audio(video_url, out_dir)
        if settings.whisper_backend == "local":
            text = _transcribe_local(audio, settings)
        else:
            text = _transcribe_openai(audio, settings)
        return WhisperResult(text=text, duration_seconds=duration)


async def transcribe_with_whisper(video_url: str, settings: Settings) -> WhisperResult:
    return await asyncio.to_thread(_run, video_url, settings)
