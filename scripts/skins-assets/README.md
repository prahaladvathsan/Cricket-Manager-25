# Skin Asset Sources

Drop image files into the per-league folders below, then run:

```
node scripts/build-official-skins.mjs
```

The script will pick up whatever's present and skip what's missing. Re-running is safe and produces deterministic output (same inputs → byte-identical `.cm25skin` files).

## Layout

```
scripts/skins-assets/
├── ipl/
│   ├── wallpaper.jpg            (optional, 1920×1080, ≤1 MB)
│   ├── logo-light.png           (optional, transparent PNG, ≤500 KB)
│   ├── logo-dark.png            (optional)
│   └── teams/
│       ├── MI/badge.png         (Mumbai Indians)
│       ├── MI/icon.png          (optional)
│       ├── MI/banner.png        (optional)
│       ├── CSK/badge.png        (Chennai Super Kings)
│       ├── CSK/icon.png
│       ├── CSK/banner.png
│       ├── RCB/badge.png        (Royal Challengers Bangalore)
│       ├── KKR/badge.png        (Kolkata Knight Riders)
│       ├── DC/badge.png         (Delhi Capitals)
│       ├── RR/badge.png         (Rajasthan Royals)
│       ├── PBKS/badge.png       (Punjab Kings)
│       ├── SRH/badge.png        (Sunrisers Hyderabad)
│       ├── GT/badge.png         (Gujarat Titans)
│       └── LSG/badge.png        (Lucknow Super Giants)
└── bbl/
    ├── wallpaper.jpg
    ├── logo-light.png
    ├── logo-dark.png
    └── teams/
        ├── SIX/badge.png        (Sydney Sixers)
        ├── THU/badge.png        (Sydney Thunder)
        ├── STR/badge.png        (Adelaide Strikers)
        ├── HEA/badge.png        (Brisbane Heat)
        ├── SCO/badge.png        (Perth Scorchers)
        ├── STA/badge.png        (Melbourne Stars)
        ├── REN/badge.png        (Melbourne Renegades)
        └── HUR/badge.png        (Hobart Hurricanes)
```

## Image Specs

| Field | Format | Recommended Size | Max Size |
|---|---|---|---|
| Badge | PNG (transparent bg) | 200×200 px | 500 KB |
| Icon | PNG (transparent bg) | 128×128 px | 250 KB |
| Banner | PNG / SVG | 800×200 px | 500 KB |
| Wallpaper | JPG | 1920×1080 px | 1 MB |
| Logo (light/dark) | PNG (transparent bg) | 800×200 px | 500 KB |

If a team folder is missing entirely, the WPL defaults stay in place. If a single asset (e.g. `banner.png`) is missing but `badge.png` exists, only the badge is used.

## Legal Notice

See `/LEGAL.md` at the repo root before bundling third-party trademarks. The IPL/BBL logos and team names are registered trademarks. Document any sourcing decisions there.

## Where to find imagery

- **IPL**: iplt20.com (terms permitting), Wikipedia commons (some logos are uploaded as fair-use; check license)
- **BBL**: bigbash.com.au, Wikipedia commons

Save files with the exact case-sensitive folder names listed above (e.g. `CSK`, not `csk`). Build script does not normalize.
