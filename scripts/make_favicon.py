# make_favicon.py — generate the platform favicon.ico (GO-1 palette).
# Draws a graphite rounded square with a white house silhouette + orange door,
# exports a multi-size ICO at src/app/favicon.ico and public/favicon.ico.
from PIL import Image, ImageDraw

GRAPHITE = (0x1A, 0x23, 0x30, 255)   # GO-1 primary
ORANGE   = (0xD4, 0x87, 0x5A, 255)   # GO-1 accent
WHITE    = (255, 255, 255, 255)

S = 256  # master size

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Rounded-square background
d.rounded_rectangle([8, 8, S - 8, S - 8], radius=52, fill=GRAPHITE)

# House silhouette (white): roof triangle + body
# Baseline and geometry tuned for legibility at 16px
roof = [(128, 46), (34, 130), (222, 130)]            # triangle apex + eaves
body = [(58, 118), (198, 118), (198, 208), (58, 208)]  # walls
d.polygon(roof, fill=WHITE)
d.rectangle([58, 118, 198, 208], fill=WHITE)  # walls

# Orange door on the house body
d.rounded_rectangle([108, 138, 148, 208], radius=8, fill=ORANGE)

# Export multi-resolution ICO
out_main = "/home/z/my-project/src/app/favicon.ico"
out_pub = "/home/z/my-project/public/favicon.ico"
img.save(out_main, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
img.save(out_pub, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("written:", out_main, "and", out_pub)
