import pytest

from app.services.research import youtube_video_id

VID = "dQw4w9WgXcQ"


@pytest.mark.parametrize(
    "url,expected",
    [
        (f"https://www.youtube.com/watch?v={VID}", VID),
        (f"https://youtube.com/watch?v={VID}&list=PLabc&t=30", VID),
        (f"https://youtu.be/{VID}", VID),
        (f"https://youtu.be/{VID}?t=42", VID),
        (f"https://www.youtube.com/shorts/{VID}", VID),
        (f"https://m.youtube.com/watch?v={VID}", VID),
        (f"https://www.youtube.com/embed/{VID}", VID),
        # Non-YouTube sources still land in the library; they just never match.
        ("https://www.tiktok.com/@chef/video/123", None),
        ("https://www.instagram.com/reel/abc/", None),
        # Malformed / too short to be a real id
        ("https://www.youtube.com/watch?v=short", None),
        ("https://www.youtube.com/watch", None),
        ("not a url", None),
        ("", None),
        (None, None),
    ],
)
def test_youtube_video_id(url, expected):
    assert youtube_video_id(url) == expected
