from PIL import Image
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "assets", "images")
logo = Image.open(os.path.join(BASE, "internew-logo.jpg")).convert("RGBA")

# Trim uniform white border around the logo so it fills nicely
def trim_white(img, thresh=245):
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < thresh or g < thresh or b < thresh:
                left = min(left, x); right = max(right, x)
                top = min(top, y); bottom = max(bottom, y)
    if right <= left or bottom <= top:
        return img
    pad = 8
    left = max(0, left - pad); top = max(0, top - pad)
    right = min(w, right + pad); bottom = min(h, bottom + pad)
    return img.crop((left, top, right, bottom))

logo = trim_white(logo)


def make_square(size, scale, bg=(255, 255, 255, 255), out=None):
    canvas = Image.new("RGBA", (size, size), bg)
    max_dim = int(size * scale)
    lw, lh = logo.size
    ratio = min(max_dim / lw, max_dim / lh)
    nw, nh = int(lw * ratio), int(lh * ratio)
    resized = logo.resize((nw, nh), Image.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    canvas.convert("RGB").save(out, "PNG")
    print("wrote", out, size)


make_square(1024, 0.80, out=os.path.join(BASE, "icon.png"))
make_square(1024, 0.62, out=os.path.join(BASE, "adaptive-icon.png"))
make_square(512, 0.78, out=os.path.join(BASE, "favicon.png"))
make_square(1024, 0.55, out=os.path.join(BASE, "splash-image.png"))
