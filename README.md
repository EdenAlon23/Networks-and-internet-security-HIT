# NetSec Study Hub · HIT

A study companion for the HIT course **אבטחת רשתות ומשרתת** (Network and Server Security), created by **Eden Alon**.

It explains each topic in the course down to the packet level: where each packet goes, which headers it carries and why, and the exact steps of every protocol, attack and defense.

**Live site:** https://edenalon23.github.io/Networks-and-internet-security-HIT/

## What's inside

| Subject | Chapters |
|---|---|
| Foundations | 00 Packet foundations · 01 Intro to cyber security |
| Reconnaissance | 02 OSINT and reconnaissance · 03 Scanning |
| Attacks on the network | 04 Sniffing and poisoning · 05 DoS and DDoS |
| Cryptography | 06 Symmetric cryptography · 07 Public-key cryptography · 08 Email security |
| Defense and practice | 09 Firewalls and access control · 10 Tools lab |

- **35 step-by-step packet animations.** You can play each one or step through it, and every step shows the actual header fields.
- **Instant search** across all chapters and animations (press `/`).
- **Interactive widgets**, such as a Caesar cipher and a small RSA calculator.
- **Exam-review tables** at the end of every chapter.
- Responsive layout with light and dark themes.

## Run locally

It's a static site with no build step. Serve the folder with any static server, because chapters are loaded with `fetch` and won't load from `file://`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html     shell: navigation, intro page, search, chapter router
anim.js        animation scenarios and the SVG player
ch/*.html      one HTML fragment per chapter
```

## Disclaimer

This is an independent study aid written by a student. It is not official course material, and it is not affiliated with or endorsed by HIT or the course staff. The explanations are original summaries of the course topics, and real-world notes marked as additions go beyond the slides. Tools are described for learning and for authorized lab use only.
