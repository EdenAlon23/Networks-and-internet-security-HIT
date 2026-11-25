/* Packet animation player + scenario library.
   A scenario = nodes on a stage + ordered steps. Each step can move packets between nodes,
   pulse nodes, update node sub-text (tables, counters) and show the exact header fields. */
(function () {
  'use strict';
  // ---------- helpers for compact scenario authoring ----------
  const P = (f, t, l, c, o) => Object.assign({ f, t, l, c: c || 'n' }, o || {});
  const H = (t, f) => ({ t, f });
  const N = (id, x, y, l, s, k, w) => ({ id, x, y, l, s: s || '', k: k || 'h', w: w || 132 });

  const S = [];
  const add = (o) => S.push(o);

  // ======================= 00 · PACKET FOUNDATIONS =======================
  add({ id: 'encap', ch: '00', title: 'Encapsulation: how one HTTP request becomes a frame', h: 290,
    nodes: [N('a7', 140, 40, 'Application', 'HTTP'), N('a4', 140, 105, 'Transport', 'TCP'), N('a3', 140, 170, 'Network', 'IP'), N('a2', 140, 240, 'Link', 'Ethernet'),
      N('b7', 620, 40, 'Application', 'web server'), N('b4', 620, 105, 'Transport', 'TCP'), N('b3', 620, 170, 'Network', 'IP'), N('b2', 620, 240, 'Link', 'Ethernet')],
    links: [['a2', 'b2']],
    steps: [
      { at: ['a7'], say: 'The browser creates an HTTP request. At the application layer it is only text, with no addresses at all.', h: [H('HTTP request', [['Line', 'GET / HTTP/1.1'], ['Host', 'example.com'], ['User-Agent', 'Mozilla/5.0 ...']])] },
      { p: [P('a7', 'a4', 'DATA')], say: 'Transport wraps it in a TCP header (20 bytes minimum). The ports say which process gets the data: a random source port, destination port 80. The unit is now a <b>segment</b>.', h: [H('TCP header (added)', [['Src Port', '51000', 1], ['Dst Port', '80', 1], ['Seq / Ack', '1001 / 5001'], ['Flags', 'PSH, ACK'], ['Window', '64240'], ['Checksum', 'covers header + data + pseudo-header']])] },
      { p: [P('a4', 'a3', 'TCP | DATA')], say: 'Network adds the IPv4 header: source and destination IP (end to end, they do not change on the way), TTL, and Protocol=6 so the receiver knows to hand it to TCP. The unit is now a <b>packet</b>.', h: [H('IPv4 header (added)', [['Version / IHL', '4 / 5 (20 B)'], ['Total Length', '160'], ['Identification', '0x1c46'], ['Flags', 'DF=1'], ['TTL', '64', 1], ['Protocol', '6 (TCP)', 1], ['Src IP', '192.168.1.10', 1], ['Dst IP', '93.184.216.34', 1]])] },
      { p: [P('a3', 'a2', 'IP | TCP | DATA')], say: 'Link adds the Ethernet header. The destination MAC is NOT the server: it is the default gateway (found with ARP). EtherType 0x0800 means "IPv4 inside". An FCS (CRC-32) trailer detects bit errors. The unit is now a <b>frame</b>.', h: [H('Ethernet II (added)', [['Dst MAC', '00:1a:2b:3c:4d:5e (gateway)', 1], ['Src MAC', 'aa:bb:cc:00:00:10'], ['EtherType', '0x0800 (IPv4)', 1], ['FCS', 'CRC-32 trailer']])] },
      { p: [P('a2', 'b2', 'ETH | IP | TCP | DATA | FCS')], say: 'Bits go on the wire. Every router on the way strips the frame, reads IP, lowers TTL and builds a NEW frame for the next hop (see "Routing: what changes at each hop").', h: [H('On the wire', [['Ethernet', '14 B + 4 B FCS'], ['IPv4', '20 B'], ['TCP', '20 B'], ['Payload', '120 B'], ['Frame total', '178 B']])] },
      { p: [P('b2', 'b3', 'IP | TCP | DATA')], say: 'The receiver checks the FCS, sees its own MAC and EtherType 0x0800, removes the Ethernet header and passes the packet up to IP.' },
      { p: [P('b3', 'b4', 'TCP | DATA')], say: 'IP checks that the destination IP is its own and that the header checksum is valid, reassembles fragments if needed, and uses Protocol=6 to pass it to TCP.' },
      { p: [P('b4', 'b7', 'DATA')], say: 'TCP checks the checksum and sequence number (in order, no duplicates), sends an ACK, and uses Dst Port 80 to deliver to the listening process. This is <b>demultiplexing</b>.' },
    ] });

  add({ id: 'route', ch: '00', title: 'Routing: what changes at each hop', h: 250,
    nodes: [N('pc', 75, 130, 'PC', '192.168.1.10\nMAC PC'), N('r1', 285, 130, 'R1', 'LAN 192.168.1.1\nWAN 10.0.0.1', 'r'), N('r2', 480, 130, 'R2', '10.0.0.2', 'r'), N('sv', 680, 130, 'Server', '93.184.216.34', 's')],
    links: [['pc', 'r1'], ['r1', 'r2'], ['r2', 'sv']],
    steps: [
      { at: ['pc'], say: 'The PC asks: is 93.184.216.34 in my subnet (192.168.1.0/24)? No. So it sends to the default gateway 192.168.1.1, and uses ARP to learn the gateway MAC.' },
      { p: [P('pc', 'r1', 'frame #1')], say: 'In this frame the destination MAC is the router, but the destination IP is the server. Two address layers with two jobs: MAC = next hop, IP = final destination.', h: [H('Ethernet', [['Src MAC', 'PC'], ['Dst MAC', 'R1-LAN', 1]]), H('IPv4', [['Src IP', '192.168.1.10'], ['Dst IP', '93.184.216.34'], ['TTL', '64']])] },
      { at: ['r1'], say: 'R1 strips the Ethernet header, decrements TTL to 63, recomputes the header checksum (TTL changed), and finds the longest-prefix match in its routing table: next hop R2. With NAT, this is also where the source IP is rewritten.', h: [H('IPv4 after R1', [['TTL', '63', 1], ['Header checksum', 'recomputed', 1], ['Src / Dst IP', 'unchanged (no NAT)']])] },
      { p: [P('r1', 'r2', 'frame #2')], say: 'A brand-new frame: new source and destination MAC. The IP packet inside is the same apart from TTL and checksum.', h: [H('Ethernet', [['Src MAC', 'R1-WAN', 1], ['Dst MAC', 'R2', 1]]), H('IPv4', [['Dst IP', '93.184.216.34'], ['TTL', '63']])] },
      { p: [P('r2', 'sv', 'frame #3')], say: 'R2 repeats the process: TTL 62, new frame to the server MAC.', h: [H('Ethernet', [['Src MAC', 'R2', 1], ['Dst MAC', 'Server', 1]]), H('IPv4', [['TTL', '62', 1]])] },
      { at: ['sv'], say: 'The server sees TTL=62. Starting values are 64 (Linux/macOS), 128 (Windows) or 255 (network gear), so 64-62 = 2 hops. This is exactly what traceroute and passive OS fingerprinting use.' },
    ] });

  add({ id: 'arp', ch: '00', title: 'ARP: finding the MAC behind an IP', h: 300,
    nodes: [N('A', 115, 70, 'Host A', '192.168.1.10 · AA\nARP cache: empty'), N('S', 380, 160, 'Switch', '', 'r'), N('B', 645, 70, 'Host B', '192.168.1.20 · BB\nARP cache: empty'), N('C', 645, 250, 'Host C', '192.168.1.30 · CC')],
    links: [['A', 'S'], ['S', 'B'], ['S', 'C']],
    steps: [
      { at: ['A'], say: 'A wants to send to 192.168.1.20. IP knows the destination address, but Ethernet needs a MAC. A checks its ARP cache: no entry.' },
      { p: [P('A', 'S', 'ARP who-has .20?')], say: 'A sends an ARP Request as a broadcast (dst ff:ff:ff:ff:ff:ff). ARP sits directly on Ethernet (EtherType 0x0806), not on IP.', h: [H('Ethernet', [['Dst MAC', 'ff:ff:ff:ff:ff:ff', 1], ['Src MAC', 'AA'], ['EtherType', '0x0806 (ARP)', 1]]), H('ARP', [['HTYPE / PTYPE', '1 (Ethernet) / 0x0800'], ['HLEN / PLEN', '6 / 4'], ['Opcode', '1 = request', 1], ['Sender MAC / IP', 'AA / 192.168.1.10'], ['Target MAC / IP', '00:00:00:00:00:00 / 192.168.1.20']])] },
      { p: [P('S', 'B', 'who-has .20?'), P('S', 'C', 'who-has .20?')], set: { B: '192.168.1.20 · BB\nARP: .10 → AA' }, say: 'The switch floods the broadcast to every port. C sees a target IP that is not its own and drops it. B recognizes its IP and also caches A (sender fields), since it will need to reply.' },
      { p: [P('B', 'S', 'ARP .20 is-at BB')], say: 'B replies by unicast, straight to AA.', h: [H('Ethernet', [['Dst MAC', 'AA'], ['Src MAC', 'BB'], ['EtherType', '0x0806']]), H('ARP', [['Opcode', '2 = reply', 1], ['Sender MAC / IP', 'BB / 192.168.1.20', 1], ['Target MAC / IP', 'AA / 192.168.1.10']])] },
      { p: [P('S', 'A', 'ARP .20 is-at BB')], set: { A: '192.168.1.10 · AA\nARP: .20 → BB' }, say: 'A caches the answer for a limited time. There is no authentication: most stacks accept replies they never asked for. ARP poisoning (chapter 04) is built on exactly this.' },
      { p: [P('A', 'S', 'IPv4 → .20')], say: 'Now the real packet can go out: Ethernet dst = BB, EtherType 0x0800.', h: [H('Ethernet', [['Dst MAC', 'BB', 1], ['EtherType', '0x0800 (IPv4)']])] },
      { p: [P('S', 'B', 'IPv4 → .20')], say: 'The switch already learned BB is on port 2 (from the reply), so this frame goes only there.' },
    ] });

  add({ id: 'frag', ch: '00', title: 'IP fragmentation and reassembly', h: 270,
    nodes: [N('A', 95, 135, 'Host A', 'link MTU 4000'), N('R', 380, 135, 'Router', 'next link MTU 1500', 'r'), N('B', 650, 135, 'Host B', 'reassembly buffer\n(empty)', 's', 150)],
    links: [['A', 'R'], ['R', 'B']],
    steps: [
      { p: [P('A', 'R', 'IP 4000 B')], say: 'A sends one 4000-byte datagram: 20 bytes of IP header + 3980 bytes of data. The sender picks Identification=777; every fragment of this datagram will carry the same ID.', h: [H('IPv4', [['Total Length', '4000'], ['Identification', '777', 1], ['Flags', 'DF=0, MF=0'], ['Fragment Offset', '0'], ['Protocol', '17 (UDP)'], ['Data', '3980 B']])] },
      { at: ['R'], say: 'The outgoing link has MTU 1500, and DF=0 so splitting is allowed. Each fragment needs its own 20-byte IP header, leaving 1480 bytes of data. Offset is counted in 8-byte units, so every fragment except the last must carry a multiple of 8 bytes: 1480 / 8 = 185.', h: [H('Router calculation', [['Max data per fragment', '1500 - 20 = 1480', 1], ['Is 1480 divisible by 8?', 'yes → offsets 0, 185, 370', 1], ['Last fragment data', '3980 - 2×1480 = 1020'], ['Fragments', '3']])] },
      { p: [P('R', 'B', 'F1 1500 B'), P('R', 'B', 'F2 1500 B'), P('R', 'B', 'F3 1040 B')], say: 'Only F1 carries the UDP/TCP header (the ports!). F2 and F3 are just data. Fragments can arrive out of order and even over different paths.', h: [H('F1', [['Total Length', '1500'], ['ID', '777'], ['MF', '1', 1], ['Offset', '0 (byte 0)', 1]]), H('F2', [['Total Length', '1500'], ['ID', '777'], ['MF', '1', 1], ['Offset', '185 (byte 1480)', 1]]), H('F3', [['Total Length', '1040'], ['ID', '777'], ['MF', '0 (last)', 1], ['Offset', '370 (byte 2960)', 1]])] },
      { at: ['B'], set: { B: 'key: src,dst,proto,ID=777\n[0-1479] [1480-2959]\n[2960-3979] complete' }, say: 'B groups fragments by (Src IP, Dst IP, Protocol, ID). Each fragment is copied into the buffer at Offset×8. The fragment with MF=0 reveals the total size: 2960 + 1020 = 3980. When there are no holes, the datagram is complete and goes up to UDP. Only the final destination reassembles; routers never do.' },
      { at: ['B'], say: 'If one fragment is lost, B waits for a timer (about 30 s on Linux), throws everything away and sends ICMP Time Exceeded (Type 11, Code 1). IP has no retransmission: one lost fragment means the whole datagram is lost.' },
      { p: [P('A', 'R', 'IP 4000 B, DF=1')], say: 'Now A sends with DF=1 (Don\'t Fragment), as modern stacks do for TCP.', h: [H('IPv4', [['Flags', 'DF=1', 1], ['Total Length', '4000']])] },
      { p: [P('R', 'A', 'ICMP 3/4', 'w')], say: 'R must drop it and returns ICMP Destination Unreachable, Code 4, with the next-hop MTU. A lowers its packet size to 1500. This is <b>Path MTU Discovery</b>. A firewall that blocks all ICMP breaks it (a "PMTU black hole").', h: [H('ICMP', [['Type', '3 (Destination Unreachable)', 1], ['Code', '4 (Fragmentation needed and DF set)', 1], ['Next-hop MTU', '1500', 1], ['Payload', 'original IP header + first 8 data bytes']])] },
    ] });

  add({ id: 'tcp', ch: '00', title: 'TCP: handshake, data and teardown', h: 250,
    nodes: [N('C', 120, 125, 'Client', '192.168.1.10:51000\nCLOSED', 'h', 150), N('S', 640, 125, 'Server', '93.184.216.34:80\nLISTEN', 's', 150)],
    links: [['C', 'S']],
    steps: [
      { p: [P('C', 'S', 'SYN')], set: { C: '192.168.1.10:51000\nSYN-SENT' }, say: 'The client picks a random ISN (1000 here; in reality 32 random bits, so nobody can guess it and inject packets). MSS 1460 = MTU 1500 - 20 IP - 20 TCP.', h: [H('TCP', [['Src / Dst Port', '51000 / 80'], ['Seq', '1000 (ISN)', 1], ['Ack', '0'], ['Flags', 'SYN', 1], ['Window', '64240'], ['Options', 'MSS 1460, SACK, WScale']])] },
      { p: [P('S', 'C', 'SYN, ACK')], set: { S: '93.184.216.34:80\nSYN-RCVD (backlog)' }, say: 'The server stores a half-open entry in its backlog, picks its own ISN and acknowledges: Ack = 1001 = client Seq + 1 (a SYN consumes one sequence number).', h: [H('TCP', [['Seq', '5000 (server ISN)', 1], ['Ack', '1001', 1], ['Flags', 'SYN, ACK', 1]])] },
      { p: [P('C', 'S', 'ACK')], set: { C: '192.168.1.10:51000\nESTABLISHED', S: '93.184.216.34:80\nESTABLISHED' }, say: 'Three-way handshake done. Both sides know each other\'s ISN.', h: [H('TCP', [['Seq', '1001'], ['Ack', '5001', 1], ['Flags', 'ACK', 1]])] },
      { p: [P('C', 'S', 'PSH,ACK 100 B')], say: 'The client sends 100 bytes (the HTTP request). Seq is the number of the first byte in this segment.', h: [H('TCP', [['Seq', '1001'], ['Ack', '5001'], ['Flags', 'PSH, ACK'], ['Payload', '100 B', 1]])] },
      { p: [P('S', 'C', 'ACK + 500 B')], say: 'The server acknowledges Ack=1101 (1001 + 100 = the next byte it expects) and sends its response.', h: [H('TCP', [['Seq', '5001'], ['Ack', '1101', 1], ['Payload', '500 B']])] },
      { p: [P('C', 'S', 'ACK')], say: 'Client confirms: Ack = 5001 + 500 = 5501.', h: [H('TCP', [['Seq', '1101'], ['Ack', '5501', 1]])] },
      { p: [P('C', 'S', 'FIN, ACK')], set: { C: '192.168.1.10:51000\nFIN-WAIT-1' }, say: 'Graceful close: FIN also consumes one sequence number.', h: [H('TCP', [['Seq', '1101'], ['Ack', '5501'], ['Flags', 'FIN, ACK', 1]])] },
      { p: [P('S', 'C', 'ACK'), P('S', 'C', 'FIN, ACK')], set: { S: '93.184.216.34:80\nLAST-ACK', C: '192.168.1.10:51000\nTIME-WAIT' }, say: 'The server acknowledges (Ack 1102) and sends its own FIN (Seq 5501).' },
      { p: [P('C', 'S', 'ACK')], set: { S: '93.184.216.34:80\nCLOSED', C: '192.168.1.10:51000\nTIME-WAIT (2·MSL)' }, say: 'The client stays in TIME-WAIT to absorb late packets. A RST, by contrast, kills the connection at once with no handshake, which is what TCP reset attacks abuse (the attacker must guess a Seq inside the window).', h: [H('TCP', [['Ack', '5502', 1]])] },
    ] });

  add({ id: 'dns', ch: '00', title: 'DNS resolution over UDP 53', h: 310,
    nodes: [N('C', 85, 250, 'Client', 'stub resolver'), N('R', 300, 250, 'Resolver', '8.8.8.8\ncache: empty', 's'), N('root', 470, 45, 'Root server', '"."', 's'), N('tld', 670, 120, '.com TLD', 'a.gtld-servers.net', 's'), N('au', 670, 250, 'Authoritative', 'ns1.example.com', 's')],
    links: [['C', 'R'], ['R', 'root'], ['R', 'tld'], ['R', 'au']],
    steps: [
      { p: [P('C', 'R', 'Q: www.example.com A')], say: 'UDP because a query is small and fast. The random source port and the random 16-bit ID are the only "password" that ties an answer to its question.', h: [H('IP / UDP', [['Src', '192.168.1.10:53124', 1], ['Dst', '8.8.8.8:53']]), H('DNS', [['ID', '0x1a2b', 1], ['QR / Opcode', '0 (query) / 0'], ['RD', '1 (recursion desired)'], ['Question', 'www.example.com  A  IN']])] },
      { p: [P('R', 'root', 'Q (iterative)')], say: 'Nothing in the cache. The resolver asks a root server iteratively, with its own new ID and source port.', h: [H('DNS', [['ID', '0x77f0', 1], ['RD', '0'], ['Question', 'www.example.com A']])] },
      { p: [P('root', 'R', 'referral: com NS')], say: 'The root does not know the answer; it refers the resolver to the .com servers (Authority section) and gives their IPs (Additional section, "glue").', h: [H('DNS', [['ANCOUNT', '0'], ['Authority', 'com. NS a.gtld-servers.net', 1], ['Additional', 'a.gtld-servers.net A 192.5.6.30']])] },
      { p: [P('R', 'tld', 'Q')], say: 'Same question to the .com TLD server.' },
      { p: [P('tld', 'R', 'referral: example.com NS')], say: 'Another referral: who is authoritative for example.com.', h: [H('DNS', [['Authority', 'example.com. NS ns1.example.com', 1], ['Additional', 'ns1.example.com A ...']])] },
      { p: [P('R', 'au', 'Q')], say: 'Finally the authoritative server.' },
      { p: [P('au', 'R', 'A 93.184.216.34')], set: { R: '8.8.8.8\ncache: www → 93.184.216.34\n(TTL 3600 s)' }, say: 'A real answer: AA=1 (authoritative). The resolver caches it for the TTL, so the next client gets it instantly. Poisoning this cache poisons every client behind it.', h: [H('DNS', [['QR', '1'], ['AA', '1', 1], ['Answer', 'www.example.com A 93.184.216.34', 1], ['TTL', '3600']])] },
      { p: [P('R', 'C', 'answer')], say: 'The client accepts it only if the ID and the port match its query. Answers larger than 512 bytes (without EDNS) and zone transfers move to TCP 53.', h: [H('IP / UDP', [['Src', '8.8.8.8:53'], ['Dst', '192.168.1.10:53124', 1]]), H('DNS', [['ID', '0x1a2b (matches)', 1], ['QR / RA', '1 / 1'], ['Answer', 'A 93.184.216.34']])] },
    ] });

  add({ id: 'trace', ch: '00', title: 'ping and traceroute: ICMP and TTL', h: 240,
    nodes: [N('pc', 75, 120, 'PC', '192.168.1.10'), N('r1', 285, 120, 'R1', '10.0.0.1', 'r'), N('r2', 480, 120, 'R2', '10.0.1.1', 'r'), N('sv', 680, 120, 'Target', '93.184.216.34', 's')],
    links: [['pc', 'r1'], ['r1', 'r2'], ['r2', 'sv']],
    steps: [
      { p: [P('pc', 'sv', 'ICMP echo request')], say: 'ping: ICMP Echo Request (Type 8). The Identifier ties replies to this ping process, the Sequence counts the probes.', h: [H('ICMP', [['Type / Code', '8 / 0 (Echo Request)', 1], ['Identifier', '0x0b5c'], ['Sequence', '1'], ['Data', '56 B (timestamp + pattern)']])] },
      { p: [P('sv', 'pc', 'ICMP echo reply')], say: 'Echo Reply (Type 0). The TTL in the reply hints at the OS: about 64 = Linux, about 128 = Windows, about 255 = router.', h: [H('ICMP', [['Type / Code', '0 / 0 (Echo Reply)', 1], ['Sequence', '1']]), H('IP', [['TTL', '62 (started at 64, 2 hops)', 1]])] },
      { p: [P('pc', 'r1', 'UDP TTL=1')], say: 'traceroute (Linux) sends UDP to an unlikely high port (33434) with TTL=1.', h: [H('IP / UDP', [['TTL', '1', 1], ['Protocol', '17'], ['Dst Port', '33434']])] },
      { p: [P('r1', 'pc', 'ICMP 11/0', 'w')], say: 'R1 decrements TTL to 0, drops the packet and returns ICMP Time Exceeded. Its source IP reveals R1. The ICMP quotes the original IP header + 8 bytes, so traceroute knows which probe it belongs to.', h: [H('ICMP', [['Type / Code', '11 / 0 (TTL exceeded in transit)', 1], ['Src IP', '10.0.0.1', 1], ['Payload', 'original IP header + UDP header']])] },
      { p: [P('pc', 'r2', 'UDP TTL=2')], say: 'TTL=2: survives R1, dies at R2.' },
      { p: [P('r2', 'pc', 'ICMP 11/0', 'w')], say: 'Now R2 is revealed (10.0.1.1).', h: [H('ICMP', [['Type / Code', '11 / 0'], ['Src IP', '10.0.1.1', 1]])] },
      { p: [P('pc', 'sv', 'UDP TTL=3')], say: 'TTL=3 reaches the target.' },
      { p: [P('sv', 'pc', 'ICMP 3/3', 'w')], say: 'Nobody listens on that port, so the target returns Port Unreachable: we have arrived. Windows tracert uses ICMP Echo instead of UDP and gets an Echo Reply at the end.', h: [H('ICMP', [['Type / Code', '3 / 3 (Port Unreachable)', 1], ['Src IP', '93.184.216.34']])] },
    ] });

  // ======================= 01 · INTRO =======================
  add({ id: 'depth', ch: '01', title: 'Defense in depth: each layer stops something different', h: 260,
    nodes: [N('a', 70, 130, 'Attacker', 'Internet', 'a', 110), N('acl', 215, 130, 'Edge router', 'ACL', 'r', 110), N('fw', 360, 130, 'Firewall', 'stateful', 'r', 110), N('ips', 505, 130, 'IPS / WAF', 'signatures', 'r', 110), N('app', 660, 130, 'Web app', 'auth + input\nvalidation', 's', 130)],
    links: [['a', 'acl'], ['acl', 'fw'], ['fw', 'ips'], ['ips', 'app']],
    steps: [
      { p: [P('a', 'acl', 'spoofed src 10.0.0.5', 'a', { drop: 1 })], say: 'A packet from the Internet claiming a private source address is dropped by the edge router (ingress filtering, BCP 38).' },
      { p: [P('a', 'fw', 'SYN → :23 telnet', 'a', { drop: 1 })], say: 'Telnet is not in the allow list, so the firewall drops it (default deny).' },
      { p: [P('a', 'ips', "GET /?id=1' OR 1=1--", 'a', { drop: 1 })], say: 'Port 80 is allowed, so the request passes the firewall. The WAF/IPS matches an SQL injection pattern in the payload and blocks it.' },
      { p: [P('a', 'app', 'login: admin/admin', 'a', { drop: 1 })], say: 'A request with valid syntax reaches the app. The application layer (strong passwords, lockout, MFA) is the last line. No single layer is perfect; together they cover each other\'s gaps.' },
    ] });

  // ======================= 02 · OSINT =======================
  add({ id: 'axfr', ch: '02', title: 'DNS reconnaissance and zone transfer (AXFR)', h: 250,
    nodes: [N('r', 110, 125, 'Researcher', 'dig / dnsrecon', 'a'), N('dns', 390, 45, 'Resolver', '', 's'), N('ns', 650, 170, 'ns1.target.com', 'authoritative', 's', 150)],
    links: [['r', 'dns'], ['r', 'ns']],
    steps: [
      { p: [P('r', 'dns', 'NS? MX? TXT? target.com')], say: 'Passive-looking queries reveal a lot: NS (who hosts DNS), MX (mail provider), TXT/SPF (which services may send mail for the domain, e.g. include:_spf.google.com).' },
      { p: [P('dns', 'r', 'NS ns1 · MX mx1 · SPF ...')], say: 'Each record is a clue about infrastructure and third-party vendors.', h: [H('Answers', [['NS', 'ns1.target.com'], ['MX', '10 mx1.target.com'], ['TXT', 'v=spf1 include:_spf.google.com ip4:203.0.113.0/24 -all', 1]])] },
      { p: [P('r', 'ns', 'TCP 53: AXFR target.com')], say: 'A zone transfer request goes over TCP 53 (answers are large). It exists so secondary DNS servers can copy the zone.', h: [H('DNS over TCP', [['Dst Port', '53 (TCP)', 1], ['QTYPE', '252 = AXFR', 1], ['Command', 'dig axfr @ns1.target.com target.com']])] },
      { p: [P('ns', 'r', 'whole zone!', 'a')], say: 'A misconfigured server returns every record: www, vpn, dev, test, internal hostnames. A full map of attack surface in one packet exchange. Defense: allow-transfer only to secondary server IPs, plus TSIG signatures.', h: [H('Leaked records', [['vpn.target.com', 'A 203.0.113.10', 1], ['dev.target.com', 'A 203.0.113.44', 1], ['jira.target.com', 'CNAME ...']])] },
    ] });

  // ======================= 03 · SCANNING =======================
  add({ id: 'syn-scan', ch: '03', title: 'SYN scan (nmap -sS): open, closed, filtered', h: 230,
    nodes: [N('A', 110, 115, 'Scanner', '10.0.0.5', 'a'), N('T', 630, 115, 'Target', '10.0.0.9\n22 ? · 23 ? · 25 ?', 's', 150)], links: [['A', 'T']],
    steps: [
      { p: [P('A', 'T', 'SYN → :22', 'a')], say: 'nmap -sS ("half-open"). It needs root because it crafts raw packets instead of using the OS connect() call.', h: [H('TCP', [['Dst Port', '22'], ['Flags', 'SYN', 1], ['Seq', 'random'], ['Window', '1024 (a typical nmap value)']])] },
      { p: [P('T', 'A', 'SYN, ACK')], say: 'Open port: the target\'s stack answers SYN/ACK.' },
      { p: [P('A', 'T', 'RST', 'a')], set: { T: '10.0.0.9\n22 open\n23 ? · 25 ?' }, say: 'The scanner never completes the handshake: it sends RST. The service never sees a full connection, so the application does not log it. Verdict: <b>open</b>.' },
      { p: [P('A', 'T', 'SYN → :23', 'a')], say: 'Next port.' },
      { p: [P('T', 'A', 'RST, ACK')], set: { T: '10.0.0.9\n22 open · 23 closed\n25 ?' }, say: 'Closed port: the stack answers RST/ACK. The host is alive but nothing listens. Verdict: <b>closed</b>.' },
      { p: [P('A', 'T', 'SYN → :25', 'a', { drop: 1 })], set: { T: '10.0.0.9\n22 open · 23 closed\n25 filtered' }, say: 'No answer even after a retransmission (or ICMP 3/13 "administratively prohibited"): a firewall dropped it. Verdict: <b>filtered</b>.' },
    ] });

  add({ id: 'connect-scan', ch: '03', title: 'TCP connect scan (nmap -sT)', h: 220,
    nodes: [N('A', 110, 110, 'Scanner', 'no root needed', 'a'), N('T', 650, 110, 'Target :80', 'web server', 's')], links: [['A', 'T']],
    steps: [
      { p: [P('A', 'T', 'SYN', 'a')], say: 'Uses the normal connect() system call, so it works without root privileges.' },
      { p: [P('T', 'A', 'SYN, ACK')], say: 'Port open.' },
      { p: [P('A', 'T', 'ACK', 'a')], say: 'The handshake completes: a real connection exists, and the service (and its logs) see it.' },
      { p: [P('A', 'T', 'RST, ACK', 'a')], say: 'The scanner closes immediately. Slower and noisier than -sS, but reliable.' },
    ] });

  add({ id: 'stealth', ch: '03', title: 'FIN, Xmas and Null scans', h: 220,
    nodes: [N('A', 110, 110, 'Scanner', '', 'a'), N('T', 650, 110, 'Target (Linux)', '22 open · 23 closed', 's', 150)], links: [['A', 'T']],
    steps: [
      { p: [P('A', 'T', 'FIN → :22', 'a', { drop: 1 })], say: 'RFC 793 rule: a segment without SYN, RST or ACK sent to an OPEN port is silently discarded. No reply = open|filtered.', h: [H('TCP flags per scan', [['-sF FIN', 'FIN', 1], ['-sX Xmas', 'FIN, PSH, URG ("lit up like a tree")'], ['-sN Null', 'no flags at all']])] },
      { p: [P('A', 'T', 'FIN → :23', 'a')], say: 'The same segment to a CLOSED port...' },
      { p: [P('T', 'A', 'RST, ACK')], say: '...gets a RST. So RST = closed. These scans slip past simple stateless filters that only block SYN. Windows ignores the RFC and sends RST for every port, so these scans show everything as closed there (itself an OS clue).' },
    ] });

  add({ id: 'udp-scan', ch: '03', title: 'UDP scan (nmap -sU)', h: 220,
    nodes: [N('A', 110, 110, 'Scanner', '', 'a'), N('T', 650, 110, 'Target', '53 open · 161 closed', 's')], links: [['A', 'T']],
    steps: [
      { p: [P('A', 'T', 'UDP → :161', 'a')], say: 'UDP has no handshake, so there is no SYN/ACK to look for.' },
      { p: [P('T', 'A', 'ICMP 3/3', 'w')], say: 'A closed port triggers ICMP Port Unreachable. That is the only clear signal.', h: [H('ICMP', [['Type / Code', '3 / 3 (Port Unreachable)', 1]])] },
      { p: [P('A', 'T', 'DNS query → :53', 'a')], say: 'nmap sends a protocol-specific payload to well-known ports to provoke an answer.' },
      { p: [P('T', 'A', 'DNS response')], say: 'An answer = open. No answer = open|filtered (cannot tell). Linux rate-limits ICMP errors (about 1 per second), so a full UDP scan is very slow.' },
    ] });

  add({ id: 'ack-scan', ch: '03', title: 'ACK scan: mapping firewall rules', h: 230,
    nodes: [N('A', 90, 115, 'Scanner', '', 'a'), N('F', 380, 115, 'Firewall', '', 'r'), N('T', 670, 115, 'Target', '', 's')], links: [['A', 'F'], ['F', 'T']],
    steps: [
      { p: [P('A', 'T', 'ACK → :80', 'a')], say: 'An ACK with no connection. A stateless filter that allows "anything with ACK" lets it through.' },
      { p: [P('T', 'A', 'RST')], say: 'Any host answers a stray ACK with RST, open or closed. RST = <b>unfiltered</b> (the firewall lets this port through).' },
      { p: [P('A', 'F', 'ACK → :22', 'a', { drop: 1 })], say: 'No answer = <b>filtered</b>. The ACK scan does not find open ports; it maps the firewall rule set. A stateful firewall drops all of these, since they belong to no connection.' },
    ] });

  add({ id: 'idle', ch: '03', title: 'Idle (zombie) scan (nmap -sI)', h: 290,
    nodes: [N('A', 95, 160, 'Attacker', 'never talks to target', 'a'), N('Z', 380, 50, 'Zombie', 'IPID = ?', 'h'), N('T', 665, 160, 'Target', ':80 open · :81 closed', 's')], links: [['A', 'Z'], ['Z', 'T'], ['A', 'T']],
    steps: [
      { p: [P('A', 'Z', 'SYN/ACK', 'a')], say: 'The zombie is an idle host whose IP ID increases by 1 for every packet it sends (global, predictable IPID). The attacker probes it with an unexpected SYN/ACK.' },
      { p: [P('Z', 'A', 'RST, IPID 1000')], set: { Z: 'IPID = 1000' }, say: 'The zombie answers RST. The attacker records IPID = 1000.', h: [H('IP', [['Identification', '1000', 1]])] },
      { p: [P('A', 'T', 'SYN :80, src = Zombie', 'a')], say: 'Now a spoofed SYN to the target, with the ZOMBIE as source address.', h: [H('IP / TCP', [['Src IP', 'Zombie (spoofed)', 1], ['Dst Port', '80'], ['Flags', 'SYN']])] },
      { p: [P('T', 'Z', 'SYN, ACK')], say: 'Port 80 is open, so the target sends SYN/ACK to the zombie.' },
      { p: [P('Z', 'T', 'RST (IPID 1001)')], set: { Z: 'IPID = 1001' }, say: 'The zombie never sent a SYN, so it replies RST, and its IPID goes up to 1001.' },
      { p: [P('A', 'Z', 'SYN/ACK', 'a')], say: 'Probe the zombie again.' },
      { p: [P('Z', 'A', 'RST, IPID 1002')], set: { Z: 'IPID = 1002' }, say: 'IPID jumped by 2 (1000 → 1002) → port 80 is <b>open</b>. If the port were closed, the target would send RST to the zombie, the zombie would ignore it, and the IPID would rise by only 1. The target only ever sees the zombie\'s address.', h: [H('Decision', [['+2', 'open', 1], ['+1', 'closed or filtered'], ['other', 'zombie not idle, retry']])] },
    ] });

  add({ id: 'frag-scan', ch: '03', title: 'Fragmentation scan (nmap -f)', h: 240,
    nodes: [N('A', 90, 120, 'Scanner', '', 'a'), N('F', 380, 120, 'Packet filter', 'checks flags', 'r', 140), N('T', 670, 120, 'Target', 'reassembles', 's')], links: [['A', 'F'], ['F', 'T']],
    steps: [
      { p: [P('A', 'F', 'frag 1: ports+seq', 'a'), P('A', 'F', 'frag 2: ack+FLAGS', 'a'), P('A', 'F', 'frag 3: win+csum', 'a')], say: 'nmap -f splits the 20-byte TCP header into 8-byte IP fragments. The flags byte (offset 13 of the TCP header) is in fragment 2, not fragment 1.', h: [H('Fragments', [['frag 1', 'offset 0, MF=1: sport, dport, seq', 1], ['frag 2', 'offset 1 (8 B), MF=1: ack, data-offset, FLAGS', 1], ['frag 3', 'offset 2 (16 B), MF=0: window, checksum, urg']])] },
      { p: [P('F', 'T', 'frag 1', 'a'), P('F', 'T', 'frag 2', 'a'), P('F', 'T', 'frag 3', 'a')], say: 'A simple filter that only inspects the first fragment cannot see SYN, so it lets them through.' },
      { at: ['T'], say: 'The target reassembles a normal SYN and answers as usual. Defense: firewalls and IDSs that reassemble before inspecting, and drop tiny fragments (RFC 1858).' },
    ] });

  // ======================= 04 · SNIFFING =======================
  add({ id: 'cam', ch: '04', title: 'Switch CAM table and MAC flooding', h: 300,
    nodes: [N('A', 100, 60, 'A', 'port 1 · AA'), N('B', 100, 245, 'B', 'port 2 · BB'), N('C', 660, 60, 'C', 'port 3 · CC'), N('M', 660, 245, 'Attacker', 'port 4 · sniffing', 'a'), N('S', 380, 150, 'Switch', 'CAM: empty', 'r', 160)],
    links: [['A', 'S'], ['B', 'S'], ['C', 'S'], ['M', 'S']],
    steps: [
      { p: [P('A', 'S', 'AA → BB')], set: { S: 'CAM: AA→p1' }, say: 'The switch learns: source MAC AA lives on port 1.' },
      { p: [P('S', 'B', 'AA → BB'), P('S', 'C', 'AA → BB'), P('S', 'M', 'AA → BB')], say: 'BB is not in the table yet, so the frame is flooded to every port (unknown unicast).' },
      { p: [P('B', 'S', 'BB → AA')], set: { S: 'CAM: AA→p1, BB→p2' }, say: 'Learn BB → port 2.' },
      { p: [P('S', 'A', 'BB → AA')], say: 'AA is known, so the frame goes only to port 1. The attacker sees nothing. This is why sniffing on a switched network is hard.' },
      { p: [P('M', 'S', 'src 3e:..', 'a'), P('M', 'S', 'src 91:..', 'a'), P('M', 'S', 'src 07:..', 'a')], set: { S: 'CAM: FULL\n(thousands of fake MACs)' }, say: 'macof sends thousands of frames per second, each with a random source MAC, until the table (a few thousand entries) is full.' },
      { p: [P('A', 'S', 'AA → CC')], say: 'A sends to C, whose MAC could not be learned because the table is full.' },
      { p: [P('S', 'C', 'AA → CC'), P('S', 'B', 'AA → CC'), P('S', 'M', 'AA → CC', 'a')], say: 'Fail-open: unknown destinations are flooded, and the switch behaves like a hub. The attacker now captures the traffic. Defense: port security (limit MACs per port, shut the port on violation).' },
    ] });

  add({ id: 'arp-poison', ch: '04', title: 'ARP poisoning: man in the middle', h: 300,
    nodes: [N('V', 110, 70, 'Victim', '192.168.1.10 · VV\nARP: .1 → GG'), N('G', 650, 70, 'Gateway', '192.168.1.1 · GG\nARP: .10 → VV', 'r'), N('M', 380, 240, 'Attacker', '192.168.1.66 · MM', 'a')],
    links: [['V', 'G'], ['V', 'M'], ['M', 'G']],
    steps: [
      { p: [P('M', 'V', 'ARP: .1 is-at MM', 'a')], set: { V: '192.168.1.10 · VV\nARP: .1 → MM ✗' }, say: 'An unsolicited ARP reply: "192.168.1.1 is at MM". The victim overwrites its cache. No request needed, no authentication.', h: [H('ARP (forged)', [['Opcode', '2 (reply)'], ['Sender MAC', 'MM (attacker)', 1], ['Sender IP', '192.168.1.1 (gateway!)', 1], ['Target', 'VV / 192.168.1.10']])] },
      { p: [P('M', 'G', 'ARP: .10 is-at MM', 'a')], set: { G: '192.168.1.1 · GG\nARP: .10 → MM ✗' }, say: 'The same lie to the gateway about the victim. Now both directions are poisoned.' },
      { p: [P('V', 'M', 'to 8.8.8.8')], say: 'The victim sends Internet traffic: Dst IP 8.8.8.8, but Dst MAC = MM. The frame lands at the attacker.', h: [H('Frame', [['Dst MAC', 'MM', 1], ['Dst IP', '8.8.8.8']])] },
      { p: [P('M', 'G', 'forward', 'a')], say: 'The attacker forwards it (ip_forward=1) so the victim notices nothing. Every packet can now be read and even modified.' },
      { p: [P('G', 'M', 'reply')], say: 'The reply comes back to the attacker too...' },
      { p: [P('M', 'V', 'forward', 'a')], say: '...and is passed to the victim. The attacker re-sends forged replies every few seconds so caches do not heal. Tools: arpspoof, ettercap, bettercap. Defense: Dynamic ARP Inspection on the switch, static ARP for critical hosts, and encryption (TLS/SSH) so MITM sees only ciphertext.' },
    ] });

  add({ id: 'dhcp', ch: '04', title: 'DHCP (DORA) and a rogue DHCP server', h: 290,
    nodes: [N('C', 110, 150, 'New client', '0.0.0.0 · CC', 'h', 140), N('S', 650, 60, 'DHCP server', '192.168.1.1', 's'), N('M', 650, 240, 'Rogue DHCP', '192.168.1.66', 'a')],
    links: [['C', 'S'], ['C', 'M']],
    steps: [
      { p: [P('C', 'S', 'DISCOVER'), P('C', 'M', 'DISCOVER')], say: 'The client has no IP yet, so it uses source 0.0.0.0 and broadcasts. The xid ties replies to this request.', h: [H('IP / UDP', [['Src', '0.0.0.0:68', 1], ['Dst', '255.255.255.255:67', 1]]), H('DHCP', [['op', '1 (BOOTREQUEST)'], ['xid', '0x3903F326'], ['chaddr', 'CC'], ['Option 53', 'DISCOVER', 1]])] },
      { p: [P('M', 'C', 'OFFER (rogue)', 'a'), P('S', 'C', 'OFFER', 'n', { d: 2 })], say: 'Both servers answer. DHCP has no authentication; the client usually takes the FIRST offer. A rogue server that answers faster hands out its own gateway and DNS: MITM on all traffic.', h: [H('Rogue OFFER', [['yiaddr', '192.168.1.50'], ['Option 3 Router', '192.168.1.66', 1], ['Option 6 DNS', '192.168.1.66', 1], ['Option 51 Lease', '86400 s']])] },
      { p: [P('C', 'S', 'REQUEST'), P('C', 'M', 'REQUEST')], say: 'The REQUEST is broadcast too, so every server learns which offer was chosen (Option 54, server identifier).', h: [H('DHCP', [['Option 53', 'REQUEST'], ['Option 54', '192.168.1.66 (chosen)', 1], ['Option 50', '192.168.1.50']])] },
      { p: [P('M', 'C', 'ACK', 'a')], set: { C: '192.168.1.50\nGW + DNS = .66 ✗' }, say: 'DORA done. Defense: DHCP snooping on the switch (only trusted ports may send OFFER/ACK). Related attack: DHCP starvation, thousands of DISCOVERs with fake MACs until the address pool is empty.' },
    ] });

  add({ id: 'dns-poison', ch: '04', title: 'DNS cache poisoning (Kaminsky)', h: 270,
    nodes: [N('A', 100, 210, 'Attacker', '', 'a'), N('R', 380, 210, 'Resolver', 'cache', 's'), N('NS', 660, 210, 'ns.bank.com', 'real authoritative', 's', 140), N('U', 380, 50, 'Users', 'trust the resolver')],
    links: [['A', 'R'], ['R', 'NS'], ['U', 'R']],
    steps: [
      { p: [P('A', 'R', 'Q: rnd123.bank.com', 'a')], say: 'The attacker asks for a random name that is not cached, so the resolver must go out now. A new random name each attempt means unlimited retries.' },
      { p: [P('R', 'NS', 'Q rnd123 (ID ?)')], say: 'The resolver queries the real server with a random ID and source port.', h: [H('Query', [['ID', 'random 16 bit (65,536)', 1], ['Src port', 'random 16 bit (with randomization)', 1]])] },
      { p: [P('A', 'R', 'fake ID 0x0001', 'a'), P('A', 'R', 'fake ID 0x0002', 'a'), P('A', 'R', 'fake ID 0xBEEF', 'a')], say: 'A flood of forged answers using the real server\'s source IP and guessed IDs. The key part is the Authority section: "the name server for bank.com is mine".', h: [H('Forged response', [['Src IP', 'ns.bank.com (spoofed)', 1], ['ID', 'guess', 1], ['Answer', 'rnd123.bank.com A 6.6.6.6'], ['Authority', 'bank.com NS ns.evil.com', 1], ['Additional', 'ns.evil.com A 6.6.6.6']])] },
      { p: [P('NS', 'R', 'real answer', 'n', { drop: 1 })], set: { R: 'cache: bank.com NS →\nns.evil.com ✗' }, say: 'If one guess matched (ID and port) before the real answer, the real one is discarded. The whole domain is poisoned for the TTL.' },
      { p: [P('U', 'R', 'www.bank.com?')], say: 'Every user of this resolver now gets the attacker\'s address. Defense: source port randomization (16+16 bits, about 4 billion combinations), DNSSEC signatures, 0x20 case randomization, DoT/DoH between client and resolver.' },
    ] });

  // ======================= 05 · DoS =======================
  add({ id: 'syn-flood', ch: '05', title: 'SYN flood and SYN cookies', h: 300,
    nodes: [N('A', 90, 150, 'Attacker', '', 'a'), N('X', 380, 45, 'Spoofed IPs', 'do not exist / silent'), N('S', 665, 150, 'Server', 'backlog 0/128', 's'), N('L', 380, 255, 'Legit client', '')],
    links: [['A', 'S'], ['S', 'X'], ['L', 'S']],
    steps: [
      { p: [P('A', 'S', 'SYN src=rand', 'a'), P('A', 'S', 'SYN src=rand', 'a'), P('A', 'S', 'SYN src=rand', 'a')], set: { S: 'backlog 90/128' }, say: 'Thousands of SYNs per second, each with a random spoofed source IP.', h: [H('IP / TCP', [['Src IP', 'random, e.g. 203.0.113.77', 1], ['Flags', 'SYN']])] },
      { p: [P('S', 'X', 'SYN/ACK'), P('S', 'X', 'SYN/ACK'), P('S', 'X', 'SYN/ACK')], set: { S: 'backlog 128/128 FULL' }, say: 'The server answers the fake addresses and waits for an ACK that never comes (retransmits about 5 times over tens of seconds). Each half-open entry holds memory.' },
      { p: [P('L', 'S', 'SYN', 'n', { drop: 1 })], say: 'A legitimate user is refused: no room in the backlog. Bandwidth is fine; the state table is the bottleneck.' },
      { at: ['S'], set: { S: 'SYN cookies ON\nbacklog not used' }, say: 'SYN cookies: the server stores nothing. It encodes the connection inside its ISN: hash(src, dst, ports, time, secret) + MSS bits.' },
      { p: [P('L', 'S', 'SYN')], say: 'A legitimate SYN arrives.' },
      { p: [P('S', 'L', 'SYN/ACK seq=cookie')], say: 'The server replies with the cookie as its Seq and forgets everything.' },
      { p: [P('L', 'S', 'ACK ack=cookie+1')], set: { S: 'connection rebuilt\nfrom the cookie' }, say: 'Only a real client returns ACK = cookie+1. The server verifies the hash and only then creates state. Spoofed sources never answer, so they cost nothing.' },
    ] });

  add({ id: 'smurf', ch: '05', title: 'Smurf attack (ICMP to broadcast)', h: 300,
    nodes: [N('A', 90, 60, 'Attacker', '', 'a'), N('R', 330, 150, 'Router', 'to 192.168.1.255', 'r'), N('h1', 640, 50, 'Host 1', ''), N('h2', 640, 150, 'Host 2', ''), N('h3', 640, 250, 'Host 3', ''), N('V', 90, 250, 'Victim', '198.51.100.7', 's')],
    links: [['A', 'R'], ['R', 'h1'], ['R', 'h2'], ['R', 'h3'], ['R', 'V']],
    steps: [
      { p: [P('A', 'R', 'echo req src=Victim', 'a')], say: 'One ICMP Echo Request to a subnet broadcast address, with the VICTIM as the forged source.', h: [H('IP / ICMP', [['Src IP', '198.51.100.7 (victim, spoofed)', 1], ['Dst IP', '192.168.1.255 (directed broadcast)', 1], ['ICMP', 'Type 8 Echo Request']])] },
      { p: [P('R', 'h1', 'echo req'), P('R', 'h2', 'echo req'), P('R', 'h3', 'echo req')], say: 'The router turns it into a link-layer broadcast. Every host on the subnet receives it.' },
      { p: [P('h1', 'V', 'echo reply', 'a'), P('h2', 'V', 'echo reply', 'a'), P('h3', 'V', 'echo reply', 'a')], say: 'Every host answers the "sender", the victim. 1 packet becomes N packets (N = hosts on the subnet). Defense: no ip directed-broadcast (default since 1999), ingress filtering (BCP 38). A stateless filter is enough to block it.' },
    ] });

  add({ id: 'dns-amp', ch: '05', title: 'DNS amplification (reflection DDoS)', h: 300,
    nodes: [N('A', 90, 150, 'Attacker / botnet', '', 'a'), N('r1', 380, 50, 'Open resolver 1', '', 's'), N('r2', 380, 150, 'Open resolver 2', '', 's'), N('r3', 380, 250, 'Open resolver 3', '', 's'), N('V', 670, 150, 'Victim', '198.51.100.7', 'h')],
    links: [['A', 'r1'], ['A', 'r2'], ['A', 'r3'], ['r1', 'V'], ['r2', 'V'], ['r3', 'V']],
    steps: [
      { p: [P('A', 'r1', '64 B ANY?', 'a'), P('A', 'r2', '64 B ANY?', 'a'), P('A', 'r3', '64 B ANY?', 'a')], say: 'Small queries (about 64 bytes) with a spoofed source = the victim, asking for a big answer (ANY, DNSSEC records, EDNS0 with 4096-byte buffer).', h: [H('IP / UDP / DNS', [['Src IP', 'victim (spoofed)', 1], ['Dst Port', '53'], ['QTYPE', 'ANY (255)'], ['EDNS0 buffer', '4096']])] },
      { p: [P('r1', 'V', '3000 B', 'a'), P('r2', 'V', '3000 B', 'a'), P('r3', 'V', '3000 B', 'a')], say: 'Each resolver sends a large reply to the victim: about 50× amplification, and the victim only sees the resolvers\' IPs. Same idea: NTP monlist (~550×), memcached (up to ~50,000×). Defense: close open resolvers, response rate limiting, BCP 38, upstream scrubbing.' },
    ] });

  add({ id: 'frag-attacks', ch: '05', title: 'Teardrop and Ping of Death (fragment abuse)', h: 220,
    nodes: [N('A', 110, 110, 'Attacker', '', 'a'), N('T', 650, 110, 'Target', 'old IP stack', 's')], links: [['A', 'T']],
    steps: [
      { p: [P('A', 'T', 'F1 off 0, 36 B', 'a'), P('A', 'T', 'F2 off 24, 4 B', 'a')], say: 'Teardrop: F2 starts inside F1 and ends before F1 does (overlap). Old reassembly code computed the copy length as end - start, which came out negative → a huge memcpy → crash (Windows 95/NT, Linux 2.0).', h: [H('Overlapping fragments', [['F1', 'bytes 0-35, MF=1'], ['F2', 'bytes 24-27, MF=0', 1], ['Bug', 'len = F2.end - F1.end < 0', 1]])] },
      { at: ['T'], set: { T: 'kernel panic ✗' }, say: 'The target crashes. Fixed stacks discard overlapping or inconsistent fragments.' },
      { p: [P('A', 'T', '...last frag off 8189', 'a')], set: { T: 'buffer overflow ✗' }, say: 'Ping of Death: each fragment is legal, but the last one has offset 8189 (×8 = 65,512 bytes) + 100 bytes of data = 65,612 > 65,535, the maximum IP size. Reassembly overflows a 64 KB buffer. Defense: check offset×8 + length ≤ 65,535, and drop malformed fragments at the firewall.' },
    ] });

  // ======================= 06 · SYMMETRIC =======================
  add({ id: 'sym', ch: '06', title: 'Symmetric encryption and the key problem', h: 260,
    nodes: [N('A', 100, 160, 'Alice', 'key K'), N('E', 380, 50, 'Eve', 'listens', 'a'), N('B', 660, 160, 'Bob', 'key K')], links: [['A', 'B']],
    steps: [
      { at: ['A'], say: 'Alice computes C = E(K, "ATTACK AT DAWN") with a shared secret key K (for example AES-128).' },
      { p: [P('A', 'B', 'C = 8f3a91c2...'), P('A', 'E', 'copy of C', 'a')], say: 'The ciphertext crosses the network. Eve captures it, but without K she sees only random-looking bytes.' },
      { at: ['B'], say: 'Bob computes P = D(K, C) and reads the message. Fast and strong.' },
      { at: ['A', 'B'], say: 'The problem: how did K get to both sides without Eve seeing it? With n users, every pair needs its own key: n(n-1)/2 keys (1000 users → 499,500 keys). This is what public-key crypto (chapter 07) solves.' },
    ] });

  add({ id: 'cbc', ch: '06', title: 'Block modes: ECB vs CBC', h: 270,
    nodes: [N('p1', 120, 40, 'P1', '"YELLOW SUBMARINE"'), N('p2', 400, 40, 'P2', '"YELLOW SUBMARINE"'), N('iv', 120, 140, 'IV ⊕', 'random'), N('x2', 400, 140, 'C1 ⊕', ''), N('c1', 120, 240, 'C1', '', 's'), N('c2', 400, 240, 'C2', '', 's'), N('ecb', 660, 140, 'ECB', 'same P → same C', 'a')],
    links: [['p1', 'iv'], ['iv', 'c1'], ['p2', 'x2'], ['x2', 'c2'], ['c1', 'x2']],
    steps: [
      { at: ['ecb'], say: 'ECB encrypts every block independently: two identical plaintext blocks give two identical ciphertext blocks. Patterns leak (the famous "ECB penguin").' },
      { p: [P('p1', 'iv', 'P1')], say: 'CBC: the first block is XORed with a random IV before encryption.' },
      { p: [P('iv', 'c1', 'E(K, P1 ⊕ IV)')], set: { c1: '3ad7...' }, say: 'C1 = E(K, P1 ⊕ IV).' },
      { p: [P('c1', 'x2', 'C1'), P('p2', 'x2', 'P2')], say: 'Each next block is XORed with the previous ciphertext block (chaining).' },
      { p: [P('x2', 'c2', 'E(K, P2 ⊕ C1)')], set: { c2: '91be... (different!)' }, say: 'C2 differs from C1 even though P2 = P1. The IV is sent in the clear but must be unpredictable; a reused IV leaks whether two messages start the same.' },
    ] });

  // ======================= 07 · PUBLIC KEY =======================
  add({ id: 'dh', ch: '07', title: 'Diffie-Hellman key exchange (p=23, g=5)', h: 270,
    nodes: [N('A', 110, 120, 'Alice', 'secret a = 6'), N('B', 650, 120, 'Bob', 'secret b = 15'), N('E', 380, 240, 'Eve', 'sees p, g, A, B', 'a', 150)], links: [['A', 'B']],
    steps: [
      { at: ['A', 'B'], say: 'Public parameters: prime p = 23, generator g = 5. Each side picks a private number and never sends it.' },
      { p: [P('A', 'B', 'A = 5^6 mod 23 = 8'), P('A', 'E', '8', 'a')], say: 'Alice sends A = g^a mod p = 8. Eve sees it.' },
      { p: [P('B', 'A', 'B = 5^15 mod 23 = 19'), P('B', 'E', '19', 'a')], say: 'Bob sends B = g^b mod p = 19.' },
      { at: ['A', 'B'], set: { A: 'K = 19^6 mod 23 = 2', B: 'K = 8^15 mod 23 = 2' }, say: 'Both compute the same secret: (g^b)^a = (g^a)^b = g^(ab) mod p = 2.' },
      { at: ['E'], say: 'Eve knows 23, 5, 8 and 19. To get K she must solve a discrete logarithm (find a from 5^a ≡ 8), which is infeasible for 2048-bit p. But plain DH has no authentication, so it is open to MITM (next video).' },
    ] });

  add({ id: 'dh-mitm', ch: '07', title: 'Man in the middle on unauthenticated DH', h: 250,
    nodes: [N('A', 100, 125, 'Alice', ''), N('M', 380, 125, 'Mallory', 'in the path', 'a'), N('B', 660, 125, 'Bob', '')], links: [['A', 'M'], ['M', 'B']],
    steps: [
      { p: [P('A', 'M', 'g^a')], say: 'Alice sends g^a, believing it goes to Bob.' },
      { p: [P('M', 'B', 'g^m', 'a')], say: 'Mallory replaces it with her own g^m.' },
      { p: [P('B', 'M', 'g^b')], say: 'Bob answers with g^b.' },
      { p: [P('M', 'A', 'g^m', 'a')], set: { A: 'key K1 = g^am', B: 'key K2 = g^bm', M: 'knows K1 and K2' }, say: 'Two separate keys: Alice↔Mallory and Mallory↔Bob. Mallory decrypts, reads, re-encrypts. Fix: authenticate the DH values (signatures + certificates), which is exactly what TLS does.' },
    ] });

  add({ id: 'rsa', ch: '07', title: 'RSA: encrypt and sign with small numbers', h: 260,
    nodes: [N('A', 110, 130, 'Alice', 'has Bob\'s public key\n(e=7, n=187)'), N('B', 650, 130, 'Bob', 'p=17, q=11', 's', 150)], links: [['A', 'B']],
    steps: [
      { at: ['B'], set: { B: 'n=187, φ=160\ne=7, d=23 (7·23=161≡1)' }, say: 'Key generation: n = 17·11 = 187, φ(n) = 16·10 = 160. Pick e = 7 (coprime to 160), find d = 23 since 7·23 = 161 ≡ 1 (mod 160). Public key (7, 187), private key (23, 187).' },
      { p: [P('B', 'A', 'public key (7, 187)')], say: 'Bob publishes (e, n). Secrecy is fine; what matters is authenticity (certificates).' },
      { p: [P('A', 'B', 'C = 88^7 mod 187 = 11')], say: 'Alice encrypts M = 88: C = M^e mod n = 11.' },
      { at: ['B'], say: 'Bob decrypts: 11^23 mod 187 = 88. Only d undoes e, and finding d requires factoring n.' },
      { p: [P('B', 'A', 'msg + s = 42^23 mod 187 = 168')], say: 'Signing is the reverse: Bob hashes the message (h = 42 here) and computes s = h^d mod n = 168 with his PRIVATE key.' },
      { at: ['A'], say: 'Alice verifies with the PUBLIC key: 168^7 mod 187 = 42 = hash of the message ✓. Integrity, authenticity and non-repudiation.' },
    ] });

  // ======================= 08 · EMAIL =======================
  add({ id: 'smtp', ch: '08', title: 'Email delivery: SMTP, MX, SPF/DKIM, IMAP', h: 290,
    nodes: [N('ua', 75, 160, 'Alice MUA', 'Outlook', 'h', 110), N('msa', 245, 160, 'smtp.a.com', 'MSA/MTA', 's', 120), N('dns', 245, 45, 'DNS', '', 's', 100), N('mx', 470, 160, 'mx.b.com', 'MTA', 's', 120), N('mda', 680, 160, 'Mailbox', 'MDA', 's', 110), N('bu', 680, 260, 'Bob MUA', '', 'h', 110)],
    links: [['ua', 'msa'], ['msa', 'dns'], ['msa', 'mx'], ['mx', 'mda'], ['mda', 'bu']],
    steps: [
      { p: [P('ua', 'msa', 'SMTP :587')], say: 'Submission on port 587 with STARTTLS and AUTH: the server checks who Alice is.', h: [H('SMTP dialogue', [['C', 'EHLO laptop.a.com'], ['C', 'STARTTLS → AUTH LOGIN', 1], ['C', 'MAIL FROM:<alice@a.com>', 1], ['C', 'RCPT TO:<bob@b.com>', 1], ['C', 'DATA ... "." QUIT'], ['S', '250 OK / 354 / 221']])] },
      { p: [P('msa', 'dns', 'MX b.com?')], say: 'Where does b.com receive mail? Ask DNS for the MX record.' },
      { p: [P('dns', 'msa', 'MX 10 mx.b.com')], say: 'Lower preference number = tried first.' },
      { p: [P('msa', 'mx', 'SMTP :25')], say: 'Server-to-server SMTP on port 25. Every MTA adds a Received: header. TLS between servers is only opportunistic. Plain SMTP does not verify that MAIL FROM or From: are true: that is why spoofing is easy.', h: [H('Added headers', [['Received', 'from smtp.a.com (203.0.113.5) by mx.b.com', 1], ['DKIM-Signature', 'd=a.com; s=sel1; bh=...; b=...', 1]])] },
      { at: ['mx'], say: 'Checks at the receiver: SPF (is 203.0.113.5 allowed in a.com\'s TXT record?), DKIM (verify the signature with the key at sel1._domainkey.a.com), DMARC (policy if both fail, plus alignment with the From: domain).' },
      { p: [P('mx', 'mda', 'deliver')], say: 'Delivered to Bob\'s mailbox.' },
      { p: [P('mda', 'bu', 'IMAP :993')], say: 'Bob reads with IMAP over TLS (993) or POP3S (995). Note that everything above protects the transport hop by hop; the message itself is readable on every server. End-to-end protection needs PGP or S/MIME.' },
    ] });

  add({ id: 'pgp', ch: '08', title: 'PGP: sign, compress, encrypt, encode', h: 230,
    nodes: [N('m', 70, 110, 'Message', '', 'h', 100), N('sg', 215, 110, 'Sign', 'SHA-256 + RSA(KR_A)', 'h', 140), N('z', 365, 110, 'Compress', 'ZIP', 'h', 100), N('en', 520, 110, 'Encrypt', 'AES(Ks)\nKs → RSA(KU_B)', 'h', 140), N('r64', 685, 110, 'Radix-64', 'ASCII armor', 's', 110)],
    links: [['m', 'sg'], ['sg', 'z'], ['z', 'en'], ['en', 'r64']],
    steps: [
      { p: [P('m', 'sg', 'M')], say: 'Authentication: hash the message and encrypt the hash with Alice\'s PRIVATE key. The signature is attached to M.' },
      { p: [P('sg', 'z', 'M + Sig')], say: 'Compression comes AFTER signing (so the signature does not depend on the ZIP implementation) and BEFORE encryption (compressed data has less redundancy, which makes cryptanalysis harder, and it is smaller).' },
      { p: [P('z', 'en', 'Z(M + Sig)')], say: 'Confidentiality: a random one-time session key Ks encrypts the data symmetrically (fast); Ks itself is encrypted with Bob\'s PUBLIC key (RSA). This hybrid is used everywhere, TLS included.' },
      { p: [P('en', 'r64', 'E_Ks(...) + E_KUB(Ks)')], say: 'Radix-64 turns the binary into printable ASCII so it survives email systems (every 3 bytes become 4 characters, +33%).' },
      { at: ['r64'], say: 'Bob reverses it: decode Radix-64, decrypt Ks with his private key, decrypt, decompress, verify the signature with Alice\'s public key.' },
    ] });

  // ======================= 09 · FIREWALLS =======================
  add({ id: 'fw-state', ch: '09', title: 'Stateless vs stateful firewall', h: 290,
    nodes: [N('C', 95, 80, 'Client (inside)', '192.168.1.10'), N('F', 380, 150, 'Firewall', 'stateless:\nallow in if ACK', 'r', 150), N('S', 665, 80, 'Web server', '', 's'), N('A', 665, 245, 'Attacker', 'outside', 'a')],
    links: [['C', 'F'], ['F', 'S'], ['F', 'A']],
    steps: [
      { p: [P('C', 'S', 'SYN → :80')], say: 'Outbound SYN to port 80: allowed by the rule "inside → any:80".' },
      { p: [P('S', 'C', 'SYN/ACK')], say: 'Stateless trick: allow inbound packets only if the ACK flag is set. The reply passes.' },
      { p: [P('A', 'C', 'forged ACK', 'a')], say: 'But an attacker can also set ACK. The stateless filter has no memory, so it lets the packet in (ACK scan, some covert channels).' },
      { at: ['F'], set: { F: 'stateful table:\n.10:51000 ↔ S:80 EST' }, say: 'Switch to stateful inspection: the firewall records every connection it sees opening (5-tuple, state, sequence window).' },
      { p: [P('A', 'F', 'forged ACK', 'a', { drop: 1 })], say: 'The forged ACK matches no entry in the table → dropped. Only real replies to inside-initiated connections enter. Price: memory per connection, which itself can be flooded.' },
    ] });

  add({ id: 'nat', ch: '09', title: 'NAT / PAT translation', h: 300,
    nodes: [N('p1', 90, 60, 'PC1', '192.168.1.10'), N('p2', 90, 240, 'PC2', '192.168.1.11'), N('N', 380, 150, 'NAT router', 'public 84.1.2.3\ntable: empty', 'r', 160), N('S', 670, 80, 'Server', '93.184.216.34', 's'), N('A', 670, 240, 'Outsider', '', 'a')],
    links: [['p1', 'N'], ['p2', 'N'], ['N', 'S'], ['N', 'A']],
    steps: [
      { p: [P('p1', 'N', 'src .10:5000')], set: { N: 'public 84.1.2.3\n.10:5000 ↔ :62001' }, say: 'PC1 opens a connection. Source: private RFC 1918 address.' },
      { p: [P('N', 'S', 'src 84.1.2.3:62001')], say: 'NAT rewrites the source IP and port, recomputes the IP and TCP checksums, and stores the mapping.', h: [H('Rewrite', [['Src IP', '192.168.1.10 → 84.1.2.3', 1], ['Src Port', '5000 → 62001', 1], ['Checksums', 'recomputed']])] },
      { p: [P('p2', 'N', 'src .11:5000')], set: { N: 'public 84.1.2.3\n.10:5000 ↔ :62001\n.11:5000 ↔ :62002' }, say: 'PC2 happens to use the same source port. PAT tells them apart by giving a different public port.' },
      { p: [P('S', 'N', 'dst 84.1.2.3:62001')], say: 'The reply comes to the public port...' },
      { p: [P('N', 'p1', 'dst .10:5000')], say: '...and is translated back using the table.' },
      { p: [P('A', 'N', 'SYN → :3389', 'a', { drop: 1 })], say: 'An unsolicited inbound connection matches no mapping, so it has nowhere to go. That is a side effect, not a firewall: outbound malware traffic passes freely, UPnP can open ports, and IPv6 has no NAT.' },
    ] });

  add({ id: 'proxy', ch: '09', title: 'Application proxy: two separate connections', h: 230,
    nodes: [N('C', 100, 110, 'Client', ''), N('P', 380, 110, 'Proxy', 'bastion host\nparses HTTP', 'r', 150), N('S', 660, 110, 'Server', '', 's')], links: [['C', 'P'], ['P', 'S']],
    steps: [
      { p: [P('C', 'P', 'GET /index.html')], say: 'The client\'s TCP connection ends at the proxy. Packets from outside never reach the client directly.' },
      { at: ['P'], say: 'The proxy parses the full request: method, URL, headers, user identity. It can enforce rules a packet filter cannot see (URL categories, file types, authentication).' },
      { p: [P('P', 'S', 'new connection: GET')], say: 'It opens a NEW connection to the server and repeats the request.' },
      { p: [P('S', 'P', '200 OK + body')], say: 'The response is inspected too (malware scanning, data-loss rules)...' },
      { p: [P('P', 'C', '200 OK')], say: '...and only then passed on. Strongest control, but one proxy per protocol and extra latency.' },
      { p: [P('C', 'P', 'BitTorrent handshake', 'a', { drop: 1 })], say: 'A protocol the proxy does not allow is recognized from its payload, whatever port it uses. That is why the lecture says BitTorrent needs an application-level firewall.' },
    ] });

  // ======================= 10 · TOOLS =======================
  add({ id: 'methodology', ch: '10', title: 'Lab workflow: how the tools feed each other', h: 270,
    nodes: [N('o', 85, 70, 'OSINT', 'whois · dig · Shodan', 'h', 140), N('d', 300, 70, 'Discovery', 'nmap -sn · arp-scan', 'h', 140), N('p', 520, 70, 'Port scan', 'nmap -sS -sU', 'h', 130), N('v', 690, 160, 'Service / OS', 'nmap -sV -O · nc', 'h', 130), N('w', 450, 240, 'Traffic analysis', 'Wireshark · tcpdump', 's', 150), N('r', 150, 240, 'Report + fix', 'firewall rules, patches', 'h', 150)],
    links: [['o', 'd'], ['d', 'p'], ['p', 'v'], ['v', 'w'], ['w', 'r']],
    steps: [
      { p: [P('o', 'd', 'IP ranges, domains')], say: 'In an authorized lab or engagement, OSINT gives the scope: domains, IP blocks (whois/RIR), hostnames (DNS), exposed services already indexed (Shodan).' },
      { p: [P('d', 'p', 'live hosts')], say: 'Host discovery narrows thousands of addresses to the live ones (ICMP echo, TCP SYN to 443, ARP on a local LAN).' },
      { p: [P('p', 'v', 'open ports')], say: 'Port scanning finds which doors are open. Its output (open / closed / filtered) also tells you about the firewall.' },
      { p: [P('v', 'w', 'versions, OS')], say: 'Version and OS detection map ports to concrete software, which is what you look up in vulnerability databases (CVE).' },
      { p: [P('w', 'r', 'evidence')], say: 'Wireshark shows what each probe looked like on the wire and how the target answered, which is also exactly what defenders see. The output of the whole chain is a report with fixes.' },
    ] });

  // ---------- player ----------
  const KIND = { h: ['--surface', '--line'], a: ['--atk-soft', '--atk'], r: ['--warn-soft', '--warn'], s: ['--def-soft', '--def'] };
  const PC = { n: '--accent', a: '--atk', w: '--warn', d: '--def' };
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

  function nodeH(n) { return n.hh || (30 + (n.s ? n.s.split('\n').length * 15 : 0)); }

  function Player(root, sc) {
    this.sc = sc; this.i = -1; this.playing = false; this.speed = 1; this.timers = []; this.raf = 0;
    root.innerHTML = '';
    root.classList.add('ap');
    const head = document.createElement('div'); head.className = 'ap-head';
    head.innerHTML = '<span class="ap-kicker">Animation</span><span class="ap-title"></span>';
    head.querySelector('.ap-title').textContent = sc.title;
    const body = document.createElement('div'); body.className = 'ap-body';
    const stage = document.createElement('div'); stage.className = 'ap-stage';
    const svg = el('svg', { viewBox: '0 0 760 ' + (sc.h || 260), role: 'img', 'aria-label': sc.title });
    stage.appendChild(svg);
    const hdr = document.createElement('div'); hdr.className = 'ap-hdr';
    body.append(stage, hdr);
    const say = document.createElement('div'); say.className = 'ap-say'; say.setAttribute('aria-live', 'polite');
    const ctr = document.createElement('div'); ctr.className = 'ap-ctr';
    ctr.innerHTML = '<button type="button" data-a="restart" aria-label="Restart">↺</button><button type="button" data-a="prev" aria-label="Previous step">⏮</button><button type="button" data-a="play" class="ap-play" aria-label="Play">▶ Play</button><button type="button" data-a="next" aria-label="Next step">⏭</button><div class="ap-dots"></div><label class="ap-spd">Speed <select><option value="0.6">0.6×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>';
    root.append(head, body, say, ctr);
    this.svg = svg; this.hdr = hdr; this.sayEl = say; this.ctr = ctr; this.root = root;
    const dots = ctr.querySelector('.ap-dots');
    sc.steps.forEach((s, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ap-dot'; b.setAttribute('aria-label', 'Step ' + (k + 1)); b.onclick = () => { this.pause(); this.go(k); }; dots.appendChild(b); });
    ctr.addEventListener('click', (e) => {
      const a = e.target.closest('button[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'play') this.playing ? this.pause() : this.play();
      if (act === 'next') { this.pause(); this.go(Math.min(this.i + 1, sc.steps.length - 1)); }
      if (act === 'prev') { this.pause(); this.go(Math.max(this.i - 1, 0)); }
      if (act === 'restart') { this.pause(); this.go(0); this.play(); }
    });
    ctr.querySelector('select').addEventListener('change', (e) => { this.speed = parseFloat(e.target.value) || 1; });
    this.draw();
    this.go(0, true);
  }
  Player.prototype.draw = function () {
    const sc = this.sc, svg = this.svg; this.pos = {};
    sc.nodes.forEach(n => {
      this.pos[n.id] = n;
      const texts = [n.s || ''].concat(sc.steps.filter(st => st.set && st.set[n.id] != null).map(st => st.set[n.id]));
      let m = n.l.length * 8.6 + 20;
      texts.forEach(t => t.split('\n').forEach(ln => { m = Math.max(m, ln.length * 6.9 + 18); }));
      n.w = Math.max(n.w, Math.ceil(m));
      let lines = 0; texts.forEach(t => { lines = Math.max(lines, t.split('\n').filter(Boolean).length); });
      n.hh = 30 + lines * 15;
    });
    const gl = el('g', {}, svg);
    (sc.links || []).forEach(([a, b]) => { const A = this.pos[a], B = this.pos[b]; el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'ap-link' }, gl); });
    this.nodeEls = {};
    const gn = el('g', { direction: 'ltr' }, svg);
    sc.nodes.forEach(n => {
      const h = nodeH(n), g = el('g', { class: 'ap-node', transform: 'translate(' + n.x + ',' + n.y + ')' }, gn);
      const [fill, stroke] = KIND[n.k] || KIND.h;
      el('rect', { x: -n.w / 2, y: -h / 2, width: n.w, height: h, rx: 9, style: 'fill:var(' + fill + ');stroke:var(' + stroke + ')' }, g);
      const t = el('text', { x: 0, y: -h / 2 + 20, 'text-anchor': 'middle', class: 'ap-nl' }, g); t.textContent = n.l;
      const sub = el('g', {}, g);
      this.nodeEls[n.id] = { g, sub, h, rect: g.firstChild };
    });
    this.pk = el('g', { direction: 'ltr' }, svg);
  };
  Player.prototype.setSub = function (id, text) {
    const ne = this.nodeEls[id], n = this.pos[id]; if (!ne) return;
    while (ne.sub.firstChild) ne.sub.removeChild(ne.sub.firstChild);
    const lines = (text || '').split('\n').filter(Boolean);
    const h = Math.max(ne.h, 30 + lines.length * 15);
    ne.rect.setAttribute('height', h); ne.rect.setAttribute('y', -h / 2);
    ne.g.querySelector('.ap-nl').setAttribute('y', -h / 2 + 20);
    lines.forEach((ln, k) => { const t = el('text', { x: 0, y: -h / 2 + 37 + k * 15, 'text-anchor': 'middle', class: 'ap-ns' }, ne.sub); t.textContent = ln; });
  };
  Player.prototype.stateAt = function (i) {
    const st = {}; this.sc.nodes.forEach(n => { st[n.id] = n.s; });
    for (let k = 0; k < i; k++) { const s = this.sc.steps[k].set; if (s) Object.assign(st, s); }
    return st;
  };
  Player.prototype.clear = function () {
    this.timers.forEach(clearTimeout); this.timers = []; cancelAnimationFrame(this.raf);
    while (this.pk.firstChild) this.pk.removeChild(this.pk.firstChild);
    Object.values(this.nodeEls).forEach(ne => ne.g.classList.remove('pulse'));
  };
  Player.prototype.renderHdr = function (step) {
    const hdr = this.hdr; hdr.innerHTML = '';
    if (!step.h || !step.h.length) { hdr.innerHTML = '<p class="ap-empty">No new header in this step.</p>'; return; }
    step.h.forEach(hh => {
      const box = document.createElement('div'); box.className = 'ap-hbox';
      const t = document.createElement('div'); t.className = 'ap-ht'; t.textContent = hh.t; box.appendChild(t);
      const tb = document.createElement('table');
      hh.f.forEach(([k, v, hl]) => { const tr = document.createElement('tr'); if (hl) tr.className = 'hl'; const a = document.createElement('th'); a.textContent = k; const b = document.createElement('td'); b.textContent = v; tr.append(a, b); tb.appendChild(tr); });
      box.appendChild(tb); hdr.appendChild(box);
    });
  };
  Player.prototype.go = function (i, still) {
    this.clear(); this.i = i;
    const sc = this.sc, step = sc.steps[i], st = this.stateAt(i);
    Object.keys(st).forEach(id => this.setSub(id, st[id]));
    this.sayEl.innerHTML = '<span class="ap-n">Step ' + (i + 1) + ' / ' + sc.steps.length + '</span> ' + step.say;
    this.renderHdr(step);
    this.ctr.querySelectorAll('.ap-dot').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
    const finish = () => {
      if (step.set) Object.keys(step.set).forEach(id => this.setSub(id, step.set[id]));
      (step.at || []).forEach(id => this.nodeEls[id] && this.nodeEls[id].g.classList.add('pulse'));
      if (step.set) Object.keys(step.set).forEach(id => this.nodeEls[id] && this.nodeEls[id].g.classList.add('pulse'));
      if (this.playing) {
        const hold = (1800 + (step.say || '').replace(/<[^>]+>/g, '').length * 38) / this.speed;
        this.timers.push(setTimeout(() => { if (this.i < sc.steps.length - 1) this.go(this.i + 1); else this.pause(true); }, hold));
      }
    };
    const pk = step.p || [];
    if (!pk.length) { finish(); return; }
    const items = pk.map((p, k) => this.makePacket(p, k, pk.length));
    if (still || reduce()) { items.forEach(it => this.place(it, it.drop ? 0.5 : 1, true)); finish(); return; }
    const dur = 1150 / this.speed, gap = 260 / this.speed, t0 = performance.now();
    const tick = (now) => {
      let done = true;
      items.forEach((it, k) => {
        const delay = (it.d != null ? it.d : k) * gap;
        let u = Math.max(0, Math.min(1, (now - t0 - delay) / dur));
        if (u < 1) done = false;
        const end = it.drop ? 0.5 : 1;
        this.place(it, u * end, u >= 1);
      });
      if (!done) this.raf = requestAnimationFrame(tick); else finish();
    };
    this.raf = requestAnimationFrame(tick);
  };
  Player.prototype.makePacket = function (p, k, n) {
    const A = this.pos[p.f], B = this.pos[p.t];
    const g = el('g', { class: 'ap-pk', opacity: 0 }, this.pk);
    const w = Math.max(54, p.l.length * 7 + 18);
    const off = n > 1 ? (k - (n - 1) / 2) * 24 : 0;
    el('rect', { x: -w / 2, y: -12, width: w, height: 24, rx: 12, style: 'fill:var(' + (PC[p.c] || PC.n) + ')' }, g);
    const t = el('text', { x: 0, y: 4.5, 'text-anchor': 'middle', class: 'ap-pl' }, g); t.textContent = p.l;
    let x = null;
    if (p.drop) { x = el('text', { x: 0, y: -18, 'text-anchor': 'middle', class: 'ap-x', opacity: 0 }, g); x.textContent = '✗ dropped'; }
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1, cx = Math.abs(dx / len), cy = Math.abs(dy / len);
    const ext = (hw, hh) => Math.min(cx > 1e-6 ? hw / cx : 1e9, cy > 1e-6 ? hh / cy : 1e9);
    const pkHalf = ext(w / 2, 12);
    const a0 = Math.min(len * 0.4, ext(A.w / 2, this.nodeEls[p.f].h / 2) + pkHalf + 4) / len;
    const a1 = 1 - Math.min(len * 0.4, ext(B.w / 2, this.nodeEls[p.t].h / 2) + pkHalf + 4) / len;
    return { g, A, B, off, drop: p.drop, d: p.d, x, a0, a1 };
  };
  Player.prototype.place = function (it, u, arrived) {
    const dx = it.B.x - it.A.x, dy = it.B.y - it.A.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const v = it.a0 + (it.a1 - it.a0) * u;
    const x = it.A.x + dx * v + nx * it.off, y = it.A.y + dy * v + ny * it.off;
    it.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
    it.g.setAttribute('opacity', u > 0 || arrived ? 1 : 0);
    if (it.x && arrived) it.x.setAttribute('opacity', 1);
  };
  Player.prototype.play = function () {
    if (this.i >= this.sc.steps.length - 1) this.i = -1;
    this.playing = true; this.btn('⏸ Pause', 'Pause');
    this.go(this.i + 1);
  };
  Player.prototype.pause = function (ended) {
    this.playing = false; this.btn(ended ? '↺ Replay' : '▶ Play', ended ? 'Replay' : 'Play');
    this.timers.forEach(clearTimeout); this.timers = [];
  };
  Player.prototype.btn = function (txt, label) { const b = this.ctr.querySelector('.ap-play'); b.textContent = txt; b.setAttribute('aria-label', label); };
  Player.prototype.destroy = function () { this.pause(); this.clear(); };

  window.Anim = {
    scenarios: S,
    byChapter: (ch) => S.filter(s => s.ch === ch),
    get: (id) => S.find(s => s.id === id),
    mount: (root, id) => new Player(root, typeof id === 'string' ? S.find(s => s.id === id) : id),
  };
})();
