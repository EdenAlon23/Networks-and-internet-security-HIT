# Networks & Security Hub · HIT

A study companion for two HIT courses, created by **Eden Alon**:

1. **רשתות תקשורת** (Computer Networks), the prerequisite course
2. **אבטחת רשתות ומשרתת** (Network and Server Security)

It explains each topic down to the packet level: where each packet goes, which headers it carries and why, the exact steps of every protocol, attack and defense, and every calculation the networks exam asks for. The whole site is available in English and in Hebrew.

**Live site:** https://edenalon23.github.io/Networks-and-internet-security-HIT/

## What's inside

### Course 1 · Computer Networks (prerequisite)

| Subject | Chapters |
|---|---|
| Foundations | N01 The Internet and its layers · N02 Delay, loss and throughput |
| Application layer | N03 HTTP and the web · N04 Email and DNS · N05 P2P, video streaming and sockets |
| Transport layer | N06 Transport and reliable data transfer · N07 TCP |
| Network layer | N08 Data plane (IPv4, subnetting, DHCP, NAT, IPv6, SDN) · N09 Control plane (Dijkstra, distance vector, OSPF, BGP, ICMP) |
| Link layer and exam | N10 Link layer and LANs · N11 Exam toolkit (formula sheet, solved patterns) |
| Hands-on | N12 Network tools lab (Wireshark, tcpdump, ping, traceroute, dig, curl, netcat, ss, iperf3) |

### Course 2 · Network and Server Security

| Subject | Chapters |
|---|---|
| Foundations | 00 Packet foundations · 01 Intro to cyber security |
| Reconnaissance | 02 OSINT and reconnaissance · 03 Scanning |
| Attacks on the network | 04 Sniffing and poisoning · 05 DoS and DDoS |
| Cryptography | 06 Symmetric cryptography · 07 Public-key cryptography · 08 Email security |
| Defense and practice | 09 Firewalls and access control · 10 Tools lab · 11 Command reference |

Every security chapter opens with a "Before you start" box linking to the networks sections it builds on.

### Course aids

- **T01 Teaching and exam guide:** how the two courses connect, what to show in each lesson, the misconception to address in each chapter, and a two-week exam plan.

### Features

- **51 step-by-step packet animations.** Play or step through each one; every step shows the actual header fields.
- **Diagrams and header bit-layouts** throughout the topic chapters (SVG, light and dark themes).
- **Worked examples** in exam format for every calculation topic.
- **153 practice questions** with explanations: a quiz at the end of every topic chapter, and a practice page that builds mixed sets per chapter or per course.
- **Instant search** across both courses and all animations (press `/`).
- **English / עברית switch** in the top bar. Technical terms, protocol names and header field names stay in English.
- Responsive layout with light and dark themes.

## Run locally

It's a static site with no build step. Serve the folder with any static server, because chapters are loaded with `fetch` and won't load from `file://`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Structure

```
index.html     shell: navigation, home page, search, quiz page, chapter router
anim.js        animation player and the security-course scenarios
anim-net.js    networks-course scenarios (English + Hebrew narration)
anim-he.js     Hebrew titles and narration for the security animations
quiz.js        question bank (English + Hebrew) and quiz engine
ch/*.html      one HTML fragment per chapter (English)
ch/he/*.html   the same chapters in Hebrew
```

## Disclaimer

This is an independent study aid written by a student. It is not official course material, and it is not affiliated with or endorsed by HIT or the course staff. The explanations are original summaries of the course topics, and notes marked as additions go beyond the slides. Tools are described for learning and for authorized lab use only.
