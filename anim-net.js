/* Computer Networks course animations. Loaded after anim.js: pushes scenarios into Anim.scenarios
   and their Hebrew narration into window.ANIM_HE. Each step's "say" is [english, hebrew]. */
(function () {
  'use strict';
  if (!window.Anim) return;
  const P = (f, t, l, c, o) => Object.assign({ f, t, l, c: c || 'n' }, o || {});
  const H = (t, f) => ({ t, f });
  const N = (id, x, y, l, s, k, w) => ({ id, x, y, l, s: s || '', k: k || 'h', w: w || 132 });
  window.ANIM_HE = window.ANIM_HE || {};
  const add = (o) => {
    window.ANIM_HE[o.id] = { t: o.title[1], s: o.steps.map(s => s.say[1]) };
    o.title = o.title[0];
    o.steps.forEach(s => { s.say = s.say[0]; });
    window.Anim.scenarios.push(o);
  };

  // ======================= N02 · store-and-forward =======================
  add({ id: 'saf', ch: 'n02', title: ['Store-and-forward: three packets over two links', 'Store-and-forward: שלוש חבילות על שני קווים'], h: 220,
    nodes: [N('A', 100, 110, 'Source', 'L bits per packet\nrate R'), N('R', 380, 110, 'Router', 'waits for the whole packet', 'r', 190), N('B', 660, 110, 'Destination', '')],
    links: [['A', 'R'], ['R', 'B']],
    steps: [
      { at: ['A'], say: ['The source has three packets of L bits each. Each link transmits at R bps, so pushing one packet onto a link takes L/R seconds. Ignore propagation for now.', 'למקור יש שלוש חבילות של L ביט כל אחת. כל קו משדר בקצב R, ולכן דחיפת חבילה אחת לקו לוקחת L/R שניות. בינתיים מתעלמים מהתפשטות.'] },
      { p: [P('A', 'R', 'pkt 1')], set: { R: 'has pkt 1 (t = L/R)' }, say: ['t = L/R: packet 1 has fully arrived at the router. Only now may the router start forwarding it: <b>store-and-forward</b>.', 't = L/R: חבילה 1 הגיעה כולה לנתב. רק עכשיו הנתב יכול להתחיל להעביר אותה: <b>store-and-forward</b>.'] },
      { p: [P('R', 'B', 'pkt 1'), P('A', 'R', 'pkt 2')], set: { R: 'has pkt 2 (t = 2L/R)', B: 'pkt 1 at 2L/R' }, say: ['t = 2L/R: both links work in parallel. Packet 1 reaches the destination while packet 2 reaches the router.', 't = 2L/R: שני הקווים עובדים במקביל. חבילה 1 מגיעה ליעד בזמן שחבילה 2 מגיעה לנתב.'] },
      { p: [P('R', 'B', 'pkt 2'), P('A', 'R', 'pkt 3')], set: { R: 'has pkt 3 (t = 3L/R)', B: 'pkt 1, 2' }, say: ['t = 3L/R: the pipeline is full.', 't = 3L/R: הצינור מלא.'] },
      { p: [P('R', 'B', 'pkt 3')], set: { R: 'empty', B: 'all 3 at 4L/R' }, say: ['t = 4L/R: the last packet arrives. In general P packets over N links take <b>(N + P − 1)·L/R</b> = (2 + 3 − 1)·L/R. One packet over N links takes N·L/R.', 't = 4L/R: החבילה האחרונה מגיעה. באופן כללי P חבילות על N קווים לוקחות <b>(N + P − 1)·L/R</b> = (2 + 3 − 1)·L/R. חבילה אחת על N קווים לוקחת N·L/R.'], h: [H('Numbers', [['L', '10 Kbits'], ['R', '100 Mbps'], ['L/R', '0.1 ms'], ['3 packets, 2 links', '4 × 0.1 = 0.4 ms', 1]])] },
    ] });

  // ======================= N03 · HTTP =======================
  add({ id: 'http-np', ch: 'n03', title: ['Non-persistent vs persistent HTTP', 'HTTP לא-קבוע מול קבוע'], h: 230,
    nodes: [N('C', 130, 115, 'Browser', 'page = HTML + 1 image', 'h', 170), N('S', 630, 115, 'Web server', 'port 80')],
    links: [['C', 'S']],
    steps: [
      { p: [P('C', 'S', 'SYN')], say: ['<b>Non-persistent</b> (HTTP/1.0): each object needs its own TCP connection. First the handshake: SYN…', '<b>לא-קבוע</b> (HTTP/1.0): כל אובייקט צריך חיבור TCP משלו. קודם לחיצת היד: SYN…'] },
      { p: [P('S', 'C', 'SYN-ACK')], set: { C: 'RTT 1 spent on TCP' }, say: ['…SYN-ACK. One RTT has passed and no HTTP byte has moved yet.', '…SYN-ACK. עבר RTT אחד ועוד לא זז אף בית של HTTP.'] },
      { p: [P('C', 'S', 'ACK + GET /index.html')], say: ['The third handshake segment can carry the HTTP request.', 'הסגמנט השלישי של לחיצת היד יכול לשאת את בקשת ה-HTTP.'], h: [H('HTTP request', [['Line', 'GET /index.html HTTP/1.1', 1], ['Host', 'www.someschool.edu'], ['Connection', 'close', 1]])] },
      { p: [P('S', 'C', '200 OK + HTML')], set: { C: 'HTML: 2 RTT + t_trans' }, say: ['The response arrives after the 2nd RTT, plus the file transmission time. The server closes the connection. Response time = <b>2·RTT + t<sub>trans</sub></b>.', 'התשובה מגיעה אחרי ה-RTT השני, ועוד זמן שידור הקובץ. השרת סוגר את החיבור. זמן תגובה = <b>2·RTT + t<sub>trans</sub></b>.'], h: [H('HTTP response', [['Status', '200 OK', 1], ['Content-Type', 'text/html'], ['Connection', 'close']])] },
      { p: [P('C', 'S', 'SYN'), P('S', 'C', 'SYN-ACK')], say: ['The HTML references an image, so a <b>new</b> TCP connection is opened: another RTT of overhead, and another socket and buffers on the server.', 'ה-HTML מפנה לתמונה, ולכן נפתח חיבור TCP <b>חדש</b>: עוד RTT של תקורה, ועוד socket ו-buffers בשרת.'] },
      { p: [P('C', 'S', 'GET /logo.png'), P('S', 'C', '200 OK + image')], set: { C: 'total: 4 RTT' }, say: ['Two objects cost 4 RTT. <b>Persistent</b> HTTP (default in 1.1) keeps the connection open: the image would cost only 1 more RTT (3 RTT total), and with pipelining all referenced objects take about 1 RTT together.', 'שני אובייקטים עולים 4 RTT. HTTP <b>קבוע</b> (ברירת המחדל ב-1.1) משאיר את החיבור פתוח: התמונה הייתה עולה רק עוד RTT אחד (3 RTT בסך הכל), ועם pipelining כל האובייקטים יחד לוקחים בערך RTT אחד.'] },
    ] });

  add({ id: 'cond-get', ch: 'n03', title: ['Web cache and conditional GET', 'Web cache ו-GET מותנה'], h: 240,
    nodes: [N('C', 100, 120, 'Browser', ''), N('X', 380, 120, 'Proxy cache', 'empty', 'r', 190), N('S', 660, 120, 'Origin server', '')],
    links: [['C', 'X'], ['X', 'S']],
    steps: [
      { p: [P('C', 'X', 'GET /a.jpg')], say: ['The browser is configured to send all requests to the institutional cache. The cache acts as a server to the client.', 'הדפדפן מוגדר לשלוח את כל הבקשות ל-cache של המוסד. ה-cache מתנהג כשרת כלפי הלקוח.'] },
      { p: [P('X', 'S', 'GET /a.jpg')], say: ['Miss: the cache acts as a client to the origin server.', 'Miss: ה-cache מתנהג כלקוח כלפי שרת המקור.'] },
      { p: [P('S', 'X', '200 OK + object')], set: { X: 'a.jpg, Last-Modified: Mon' }, say: ['The object comes back with a Last-Modified date; the cache stores a copy.', 'האובייקט חוזר עם תאריך Last-Modified; ה-cache שומר עותק.'], h: [H('Response', [['Status', '200 OK'], ['Last-Modified', 'Mon, 22 Sep 2025 09:23:24', 1], ['Cache-Control', 'max-age=3600']])] },
      { p: [P('X', 'C', '200 OK + object')], say: ['…and forwards it to the browser.', '…ומעביר אותו לדפדפן.'] },
      { p: [P('C', 'X', 'GET /a.jpg')], say: ['Later, another user asks for the same object. The cache has a copy, but is it stale?', 'אחר כך משתמש אחר מבקש את אותו אובייקט. ל-cache יש עותק, אבל האם הוא ישן?'] },
      { p: [P('X', 'S', 'GET + If-Modified-Since')], say: ['A <b>conditional GET</b>: send the object only if it changed after the cached date.', '<b>GET מותנה</b>: לשלוח את האובייקט רק אם הוא השתנה אחרי התאריך שב-cache.'], h: [H('Request', [['Line', 'GET /a.jpg HTTP/1.1'], ['If-Modified-Since', 'Mon, 22 Sep 2025 09:23:24', 1]])] },
      { p: [P('S', 'X', '304 Not Modified')], say: ['Not changed: a tiny <b>304</b> with no body. No object transmission delay, less load on the access link.', 'לא השתנה: <b>304</b> קטן בלי גוף. אין השהיית שידור של האובייקט, ופחות עומס על קו הגישה.'] },
      { p: [P('X', 'C', '200 OK (from cache)', 'd')], say: ['The client is served from the cache at LAN speed. With hit rate h, only (1 − h) of requests cross the access link.', 'הלקוח מקבל מה-cache במהירות של ה-LAN. עם שיעור פגיעות h, רק (1 − h) מהבקשות עוברות בקו הגישה.'] },
    ] });

  // ======================= N05 · DASH and BitTorrent =======================
  add({ id: 'dash', ch: 'n05', title: ['DASH: adaptive streaming over HTTP', 'DASH: סטרימינג מסתגל מעל HTTP'], h: 250,
    nodes: [N('C', 130, 125, 'Video client', 'buffer: 0 s', 'h', 190), N('S', 640, 125, 'CDN server', 'chunks @ 1, 3, 6 Mbps', 'h', 170)],
    links: [['C', 'S']],
    steps: [
      { p: [P('C', 'S', 'GET manifest.mpd')], say: ['The video is split into chunks (a few seconds each), each encoded at several rates. The client first fetches the <b>manifest</b>.', 'הווידאו מחולק ל-chunks (כמה שניות כל אחד), וכל אחד מקודד בכמה קצבים. הלקוח קודם מביא את ה-<b>manifest</b>.'] },
      { p: [P('S', 'C', 'manifest')], say: ['The manifest lists a URL for every chunk at every rate.', 'ה-manifest מפרט URL לכל chunk בכל קצב.'], h: [H('manifest.mpd', [['1 Mbps', '/v/1M/chunk-N.m4s'], ['3 Mbps', '/v/3M/chunk-N.m4s'], ['6 Mbps', '/v/6M/chunk-N.m4s']])] },
      { p: [P('C', 'S', 'GET 3M/chunk-1'), P('S', 'C', 'chunk 1 (3 Mbps)')], set: { C: 'buffer: 4 s · measured 5 Mbps' }, say: ['The client starts at a middle rate and measures how fast the chunk arrived.', 'הלקוח מתחיל בקצב אמצעי ומודד כמה מהר ה-chunk הגיע.'] },
      { p: [P('C', 'S', 'GET 6M/chunk-2'), P('S', 'C', 'chunk 2 (6 Mbps)')], set: { C: 'buffer: 6 s · measured 8 Mbps' }, say: ['Bandwidth looks good, so the client asks for the next chunk at the highest rate. The client decides, not the server.', 'רוחב הפס נראה טוב, ולכן הלקוח מבקש את ה-chunk הבא בקצב הגבוה. הלקוח מחליט, לא השרת.'] },
      { p: [P('C', 'S', 'GET 6M/chunk-3'), P('S', 'C', 'chunk 3 (slow!)', 'w')], set: { C: 'buffer: 2 s · measured 2 Mbps' }, say: ['Congestion: the chunk arrives slowly and the buffer drains.', 'עומס: ה-chunk מגיע לאט וה-buffer מתרוקן.'] },
      { p: [P('C', 'S', 'GET 1M/chunk-4'), P('S', 'C', 'chunk 4 (1 Mbps)')], set: { C: 'buffer: 5 s · no stall' }, say: ['The client drops to 1 Mbps to refill the buffer and avoid a freeze. When, which rate, and which server (URL) are all client choices.', 'הלקוח יורד ל-1 Mbps כדי למלא את ה-buffer ולמנוע קפיאה. מתי, באיזה קצב ומאיזה שרת (URL) הן כולן החלטות של הלקוח.'] },
    ] });

  add({ id: 'torrent', ch: 'n05', title: ['BitTorrent: tracker, chunks and tit-for-tat', 'BitTorrent: ‏tracker, ‏chunks ו-tit-for-tat'], h: 290,
    nodes: [N('A', 110, 145, 'Alice (new)', 'has: none'), N('T', 380, 40, 'Tracker', 'list of peers', 'r'), N('B', 650, 60, 'Bob', 'has: 1 2 3'), N('C', 650, 230, 'Carol', 'has: 2 4'), N('D', 380, 250, 'Dave', 'has: 1 4')],
    links: [['A', 'T'], ['A', 'B'], ['A', 'C'], ['A', 'D']],
    steps: [
      { p: [P('A', 'T', 'register')], say: ['A file is divided into 256 KB chunks. Alice joins the torrent: she registers with the tracker.', 'הקובץ מחולק ל-chunks של 256 KB. אליס מצטרפת ל-torrent: היא נרשמת ב-tracker.'] },
      { p: [P('T', 'A', 'peers: B, C, D')], say: ['The tracker returns a subset of peers. Alice opens TCP connections to them: her <b>neighbors</b>.', 'ה-tracker מחזיר תת-קבוצה של עמיתים. אליס פותחת אליהם חיבורי TCP: ה-<b>שכנים</b> שלה.'] },
      { p: [P('B', 'A', 'have 1 2 3'), P('C', 'A', 'have 2 4'), P('D', 'A', 'have 1 4')], say: ['Neighbors tell her which chunks they hold. Counts: chunk 1 ×2, 2 ×2, 3 ×1, 4 ×2.', 'השכנים מספרים לה אילו chunks יש להם. ספירה: chunk 1 ×2, ‏2 ×2, ‏3 ×1, ‏4 ×2.'] },
      { p: [P('A', 'B', 'request chunk 3'), P('B', 'A', 'chunk 3')], set: { A: 'has: 3' }, say: ['<b>Rarest first</b>: Alice requests chunk 3, held by only one neighbor, so rare chunks spread quickly.', '<b>הנדיר קודם</b>: אליס מבקשת את chunk 3, שיש רק לשכן אחד, כך ש-chunks נדירים מתפזרים מהר.'] },
      { p: [P('A', 'C', 'send chunk 3', 'd')], set: { C: 'has: 2 3 4' }, say: ['<b>Tit-for-tat</b>: Alice uploads to the 4 peers sending to her at the highest rate (re-evaluated every 10 s); others are "choked". Every 30 s she also <b>optimistically unchokes</b> one random peer, which is how newcomers get their first chunks.', '<b>Tit-for-tat</b>: אליס מעלה ל-4 העמיתים ששולחים לה בקצב הגבוה ביותר (נבדק מחדש כל 10 שניות); האחרים "חנוקים". כל 30 שניות היא גם עושה <b>optimistic unchoke</b> לעמית אקראי, וכך מצטרפים חדשים מקבלים את ה-chunks הראשונים.'] },
      { p: [P('C', 'A', 'chunk 4'), P('D', 'A', 'chunk 1'), P('B', 'A', 'chunk 2')], set: { A: 'has: 1 2 3 4 ✓' }, say: ['Alice now uploads while she downloads, adding capacity to the swarm. That is why P2P distribution time grows so slowly with N.', 'אליס מעלה בזמן שהיא מורידה, ומוסיפה קיבולת לנחיל. לכן זמן ההפצה ב-P2P גדל כל כך לאט עם N.'] },
    ] });

  // ======================= N06 · reliable data transfer =======================
  add({ id: 'rdt3', ch: 'n06', title: ['rdt 3.0: alternating bit with loss and timeout', 'rdt 3.0: ביט מתחלף עם אובדן ו-timeout'], h: 230,
    nodes: [N('S', 130, 115, 'Sender', 'next seq = 0', 'h', 180), N('R', 630, 115, 'Receiver', 'expects 0', 'h', 190)],
    links: [['S', 'R']],
    steps: [
      { p: [P('S', 'R', 'pkt0')], set: { R: 'expects 1' }, say: ['The sender sends pkt0 and starts a timer. The receiver delivers it and ACKs.', 'השולח שולח pkt0 ומפעיל טיימר. המקבל מעביר אותו למעלה ושולח ACK.'] },
      { p: [P('R', 'S', 'ack0')], set: { S: 'next seq = 1' }, say: ['ack0 arrives: stop the timer, flip the sequence bit.', 'ack0 מגיע: עוצרים את הטיימר, הופכים את ביט הרצף.'] },
      { p: [P('S', 'R', 'pkt1', 'n', { drop: true })], say: ['pkt1 is <b>lost</b>. The receiver never sees it, so it sends nothing.', 'pkt1 <b>אובד</b>. המקבל לא רואה אותו, ולכן לא שולח כלום.'] },
      { at: ['S'], set: { S: 'TIMEOUT → resend pkt1' }, say: ['The timer expires: retransmit pkt1. This is what rdt 3.0 adds: a countdown timer.', 'הטיימר פג: שולחים שוב את pkt1. זה מה ש-rdt 3.0 מוסיף: טיימר.'] },
      { p: [P('S', 'R', 'pkt1')], set: { R: 'expects 0' }, say: ['pkt1 arrives this time.', 'הפעם pkt1 מגיע.'] },
      { p: [P('R', 'S', 'ack1', 'n', { drop: true })], say: ['Now the <b>ACK</b> is lost.', 'עכשיו ה-<b>ACK</b> אובד.'] },
      { p: [P('S', 'R', 'pkt1 (again)')], set: { R: 'expects 0 · dup dropped' }, say: ['Timeout again, pkt1 is resent. The receiver expects 0, sees 1: a <b>duplicate</b>. It discards the data but re-ACKs 1. Sequence numbers make this safe.', 'שוב timeout, ‏pkt1 נשלח שוב. המקבל מצפה ל-0, רואה 1: <b>כפילות</b>. הוא זורק את המידע אבל שולח שוב ack1. מספרי הרצף הופכים את זה לבטוח.'] },
      { p: [P('R', 'S', 'ack1')], set: { S: 'next seq = 0' }, say: ['Correct, but slow: one packet per RTT. U = (L/R) / (RTT + L/R). Pipelining (GBN, SR) fixes that.', 'נכון, אבל איטי: חבילה אחת לכל RTT. ‏U = (L/R) / (RTT + L/R). ‏Pipelining ‏(GBN, ‏SR) פותר את זה.'] },
    ] });

  add({ id: 'gbn', ch: 'n06', title: ['Go-Back-N with window 4', 'Go-Back-N עם חלון 4'], h: 230,
    nodes: [N('S', 130, 115, 'Sender', 'window [0 1 2 3]', 'h', 200), N('R', 630, 115, 'Receiver', 'expects 0', 'h', 190)],
    links: [['S', 'R']],
    steps: [
      { p: [P('S', 'R', '0'), P('S', 'R', '1'), P('S', 'R', '2', 'n', { drop: true }), P('S', 'R', '3')], set: { R: 'got 0 1 · 3 discarded' }, say: ['The sender may have up to N = 4 unACKed packets in flight. Packet 2 is lost. The receiver delivers 0 and 1, then gets 3 out of order: GBN <b>discards</b> it (no receiver buffer).', 'השולח יכול להחזיק עד N = 4 חבילות שלא אושרו. חבילה 2 אובדת. המקבל מעביר 0 ו-1, ואז מקבל את 3 לא לפי הסדר: GBN <b>זורק</b> אותה (אין buffer אצל המקבל).'] },
      { p: [P('R', 'S', 'ack0'), P('R', 'S', 'ack1'), P('R', 'S', 'ack1')], set: { S: 'window [2 3 4 5]' }, say: ['ACKs are <b>cumulative</b>: ack1 means "everything up to 1". For packet 3 the receiver re-sends ack1 (a duplicate). The window slid to start at 2, so 4 and 5 may be sent.', 'ACKים <b>מצטברים</b>: ack1 פירושו "הכל עד 1". על חבילה 3 המקבל שולח שוב ack1 (כפול). החלון זז ומתחיל ב-2, ולכן אפשר לשלוח את 4 ו-5.'] },
      { p: [P('S', 'R', '4'), P('S', 'R', '5')], set: { R: '4, 5 discarded too' }, say: ['4 and 5 are also out of order, also discarded, each answered with ack1.', 'גם 4 ו-5 לא לפי הסדר, גם הן נזרקות, ועל כל אחת עונים ack1.'] },
      { at: ['S'], set: { S: 'TIMEOUT(2): resend 2–5' }, say: ['GBN keeps <b>one timer</b> for the oldest unACKed packet. It expires: resend packet 2 <b>and everything after it</b>.', 'GBN מחזיק <b>טיימר אחד</b> לחבילה הוותיקה ביותר שלא אושרה. הוא פג: שולחים שוב את 2 <b>וכל מה שאחריה</b>.'] },
      { p: [P('S', 'R', '2'), P('S', 'R', '3'), P('S', 'R', '4'), P('S', 'R', '5')], set: { R: 'delivered 0–5' }, say: ['All four arrive in order and are delivered. Simple receiver, but a single loss costs a whole window of retransmissions.', 'כל הארבע מגיעות לפי הסדר ומועברות. מקבל פשוט, אבל אובדן אחד עולה חלון שלם של שידורים חוזרים.'] },
      { p: [P('R', 'S', 'ack5')], set: { S: 'window [6 7 8 9]' }, say: ['One cumulative ack5 confirms everything.', 'ack5 מצטבר אחד מאשר הכל.'] },
    ] });

  add({ id: 'sr', ch: 'n06', title: ['Selective Repeat with window 4', 'Selective Repeat עם חלון 4'], h: 230,
    nodes: [N('S', 130, 115, 'Sender', 'window [0 1 2 3]', 'h', 210), N('R', 630, 115, 'Receiver', 'rcv window [0 1 2 3]', 'h', 200)],
    links: [['S', 'R']],
    steps: [
      { p: [P('S', 'R', '0'), P('S', 'R', '1'), P('S', 'R', '2', 'n', { drop: true }), P('S', 'R', '3')], set: { R: 'deliver 0 1 · buffer 3' }, say: ['Same loss as in GBN. But the SR receiver <b>buffers</b> packet 3 instead of discarding it.', 'אותו אובדן כמו ב-GBN. אבל המקבל ב-SR <b>שומר</b> את חבילה 3 ב-buffer במקום לזרוק אותה.'] },
      { p: [P('R', 'S', 'ack0'), P('R', 'S', 'ack1'), P('R', 'S', 'ack3')], set: { S: 'acked 0 1 3 · win [2 3 4 5]' }, say: ['Every packet is ACKed <b>individually</b>: ack3 means "3 arrived", not "up to 3". The sender marks 3 as received.', 'כל חבילה מאושרת <b>בנפרד</b>: ack3 פירושו "3 הגיעה", לא "עד 3". השולח מסמן את 3 כהתקבלה.'] },
      { p: [P('S', 'R', '4'), P('S', 'R', '5')], set: { R: 'buffer 3 4 5' }, say: ['4 and 5 are buffered too, and ACKed individually.', 'גם 4 ו-5 נשמרות ב-buffer ומאושרות בנפרד.'] },
      { at: ['S'], set: { S: 'TIMEOUT(2): resend only 2' }, say: ['Each packet has its <b>own timer</b>. Only packet 2\'s timer expires, so only packet 2 is resent.', 'לכל חבילה יש <b>טיימר משלה</b>. רק הטיימר של חבילה 2 פג, ולכן רק היא נשלחת שוב.'] },
      { p: [P('S', 'R', '2')], set: { R: 'deliver 2 3 4 5' }, say: ['The gap is filled: the receiver delivers 2, 3, 4, 5 in order to the application.', 'החור התמלא: המקבל מעביר את 2, ‏3, ‏4, ‏5 לפי הסדר לאפליקציה.'] },
      { p: [P('R', 'S', 'ack2')], set: { S: 'window [6 7 8 9]' }, say: ['One retransmission instead of four. The cost: buffers and a timer per packet, and the window must be ≤ half the sequence space, or the receiver cannot tell new packets from old ones.', 'שידור חוזר אחד במקום ארבעה. המחיר: buffers וטיימר לכל חבילה, והחלון חייב להיות ≤ חצי ממרחב מספרי הרצף, אחרת המקבל לא יכול להבדיל בין חבילות חדשות לישנות.'] },
    ] });

  // ======================= N07 · TCP =======================
  add({ id: 'fastrx', ch: 'n07', title: ['TCP fast retransmit after 3 duplicate ACKs', 'TCP fast retransmit אחרי 3 ACKים כפולים'], h: 230,
    nodes: [N('S', 130, 115, 'Sender', 'cwnd 8 MSS', 'h', 200), N('R', 630, 115, 'Receiver', 'next expected 100', 'h', 190)],
    links: [['S', 'R']],
    steps: [
      { p: [P('S', 'R', 'seq 100', 'n', { drop: true }), P('S', 'R', 'seq 200'), P('S', 'R', 'seq 300'), P('S', 'R', 'seq 400')], say: ['Segments of 100 bytes. Segment 100 is lost; 200, 300 and 400 arrive out of order and are buffered.', 'סגמנטים של 100 בתים. סגמנט 100 אובד; ‏200, ‏300 ו-400 מגיעים לא לפי הסדר ונשמרים ב-buffer.'] },
      { p: [P('R', 'S', 'ACK 100'), P('R', 'S', 'ACK 100'), P('R', 'S', 'ACK 100')], set: { S: '3 dup ACKs!' }, say: ['TCP ACKs are cumulative: each arrival re-ACKs 100, the next byte expected. The sender gets <b>three duplicate ACKs</b>.', 'ACKים של TCP מצטברים: כל הגעה שולחת שוב ACK 100, הבית הבא שמצופה. השולח מקבל <b>שלושה ACKים כפולים</b>.'] },
      { p: [P('S', 'R', 'seq 100 (resend)', 'w')], set: { S: 'ssthresh 4 · cwnd 4+3' }, say: ['<b>Fast retransmit</b>: resend 100 now, without waiting for the timeout (which could be long). Reno also halves: ssthresh = cwnd/2 = 4, cwnd = ssthresh + 3 MSS (fast recovery).', '<b>Fast retransmit</b>: שולחים את 100 עכשיו, בלי לחכות ל-timeout (שעלול להיות ארוך). ‏Reno גם מחצה: ‏ssthresh = cwnd/2 = 4, ‏cwnd = ssthresh + 3 MSS ‏(fast recovery).'] },
      { p: [P('R', 'S', 'ACK 500')], set: { S: 'cwnd 4 · cong. avoidance', R: 'delivered 100–499' }, say: ['The hole is filled; one cumulative ACK 500 covers everything buffered. The sender continues in congestion avoidance from cwnd = 4. A timeout instead would have reset cwnd to 1 MSS.', 'החור התמלא; ‏ACK 500 מצטבר אחד מכסה את כל מה שנשמר. השולח ממשיך ב-congestion avoidance מ-cwnd = 4. ‏Timeout במקום זה היה מאפס את cwnd ל-1 MSS.'] },
    ] });

  add({ id: 'cwnd', ch: 'n07', title: ['TCP Reno congestion window, round by round', 'חלון העומס של TCP Reno, סיבוב אחרי סיבוב'], h: 230,
    nodes: [N('S', 130, 115, 'Sender', 'cwnd 1 · ssthresh 8', 'h', 220), N('R', 630, 115, 'Receiver', '')],
    links: [['S', 'R']],
    steps: [
      { p: [P('S', 'R', '1 seg')], set: { S: 'cwnd 1 → 2' }, say: ['<b>Slow start</b>: cwnd starts at 1 MSS and grows by 1 MSS per ACK, so it doubles every RTT.', '<b>Slow start</b>: ‏cwnd מתחיל ב-1 MSS וגדל ב-1 MSS לכל ACK, ולכן מוכפל כל RTT.'] },
      { p: [P('S', 'R', 'seg'), P('S', 'R', 'seg')], set: { S: 'cwnd 2 → 4' }, say: ['RTT 2: two segments, two ACKs, cwnd = 4.', 'RTT 2: שני סגמנטים, שני ACKים, ‏cwnd = 4.'] },
      { p: [P('S', 'R', 'seg'), P('S', 'R', 'seg'), P('S', 'R', 'seg'), P('S', 'R', 'seg')], set: { S: 'cwnd 4 → 8 = ssthresh' }, say: ['RTT 3: cwnd reaches ssthresh = 8. Exponential growth stops here.', 'RTT 3: ‏cwnd מגיע ל-ssthresh = 8. הגדילה המעריכית נעצרת כאן.'] },
      { p: [P('S', 'R', '8 segs')], set: { S: 'cwnd 8 → 9 (CA)' }, say: ['<b>Congestion avoidance</b>: +1 MSS per RTT (additive increase).', '<b>Congestion avoidance</b>: ‏+1 MSS לכל RTT (הגדלה חיבורית).'] },
      { p: [P('S', 'R', '9 segs')], set: { S: 'cwnd 9 → 10' }, say: ['RTT 5: cwnd = 10. Linear probing for spare bandwidth.', 'RTT 5: ‏cwnd = 10. גישוש לינארי אחרי רוחב פס פנוי.'] },
      { p: [P('R', 'S', '3 dup ACKs', 'w')], set: { S: 'ssthresh 5 · cwnd 5 (+3)' }, say: ['Loss detected by 3 duplicate ACKs: <b>multiplicative decrease</b>. ssthresh = 10/2 = 5, cwnd = 5 (plus 3 in fast recovery), continue linearly.', 'אובדן שזוהה ב-3 ACKים כפולים: <b>הקטנה כפלית</b>. ‏ssthresh = 10/2 = 5, ‏cwnd = 5 (ועוד 3 ב-fast recovery), ממשיכים לינארית.'] },
      { at: ['S'], set: { S: 'TIMEOUT: ssthresh 3 · cwnd 1' }, say: ['If instead a <b>timeout</b> happens at cwnd = 6: ssthresh = 3, cwnd = 1 MSS, back to slow start. The result is the AIMD "sawtooth"; average rate ≈ ¾·W/RTT.', 'אם במקום זה קורה <b>timeout</b> ב-cwnd = 6: ‏ssthresh = 3, ‏cwnd = 1 MSS, חוזרים ל-slow start. התוצאה היא "המסור" של AIMD; הקצב הממוצע ≈ ¾·W/RTT.'] },
    ] });

  // ======================= N08 · longest prefix match =======================
  add({ id: 'lpm', ch: 'n08', title: ['Longest prefix match in a forwarding table', 'Longest prefix match בטבלת העברה'], h: 290,
    nodes: [N('I', 100, 145, 'Datagram', 'dst 200.23.24.170', 'h', 160), N('R', 380, 145, 'Router', '200.23.16.0/21 → 0\n200.23.24.0/24 → 1\n200.23.24.0/21 → 2\n* → 3', 'r', 200), N('O1', 660, 50, 'Interface 1', ''), N('O2', 660, 240, 'Interface 2', '')],
    links: [['I', 'R'], ['R', 'O1'], ['R', 'O2']],
    steps: [
      { p: [P('I', 'R', 'dst .24.170')], say: ['The router looks up the destination IP in its forwarding table. Entries are prefixes, not single addresses.', 'הנתב מחפש את ה-IP של היעד בטבלת ההעברה. הרשומות הן קידומות, לא כתובות בודדות.'], h: [H('Destination in binary', [['200.23.24.170', '11001000 00010111 00011000 10101010']])] },
      { at: ['R'], say: ['Check each prefix: /21 for interface 0 needs 00010xxx in the 3rd byte; ours is 00011000: <b>no match</b>. /24 for interface 1 (00011000): <b>match, 24 bits</b>. /21 for interface 2 (00011xxx): <b>match, 21 bits</b>. Default: always matches.', 'בודקים כל קידומת: ‏/21 של ממשק 0 צריך 00010xxx בבית השלישי; אצלנו 00011000: <b>לא מתאים</b>. ‏/24 של ממשק 1 ‏(00011000): <b>מתאים, 24 ביט</b>. ‏/21 של ממשק 2 ‏(00011xxx): <b>מתאים, 21 ביט</b>. ברירת מחדל: תמיד מתאים.'], h: [H('Matches', [['200.23.16.0/21', 'no'], ['200.23.24.0/24', 'yes, 24 bits', 1], ['200.23.24.0/21', 'yes, 21 bits'], ['default', 'yes, 0 bits']])] },
      { p: [P('R', 'O1', 'to interface 1', 'd')], say: ['Several entries match, so the <b>longest prefix</b> wins: interface 1. Routers do this in nanoseconds with TCAMs, which return the result in one clock cycle regardless of table size.', 'כמה רשומות מתאימות, ולכן <b>הקידומת הארוכה ביותר</b> מנצחת: ממשק 1. נתבים עושים את זה בננו-שניות עם TCAM, שמחזיר תשובה במחזור שעון אחד בלי קשר לגודל הטבלה.'] },
      { p: [P('I', 'R', 'dst .25.1')], say: ['Another datagram: 200.23.25.1 (third byte 00011001). The /24 no longer matches; the /21 for interface 2 does.', 'Datagram אחר: ‏200.23.25.1 (הבית השלישי 00011001). ה-/24 כבר לא מתאים; ה-/21 של ממשק 2 כן.'] },
      { p: [P('R', 'O2', 'to interface 2', 'd')], say: ['A more specific route can override a larger aggregated block: exactly how an ISP keeps a customer\'s /24 reachable after the customer moves (route aggregation, N08).', 'מסלול ספציפי יותר יכול לעקוף בלוק מאוגד גדול יותר: בדיוק כך ספק שומר /24 של לקוח נגיש אחרי שהלקוח עבר (route aggregation, ‏N08).'] },
    ] });

  // ======================= N09 · routing algorithms =======================
  const g = (id, x, y, s) => N(id, x, y, id, s || '', 'h', 104);
  add({ id: 'dijkstra', ch: 'n09', title: ['Dijkstra from u, step by step', 'Dijkstra מ-u, צעד אחרי צעד'], h: 300,
    nodes: [g('u', 75, 150, 'source'), g('v', 260, 50, '∞'), g('w', 490, 50, '∞'), g('x', 260, 250, '∞'), g('y', 490, 250, '∞'), g('z', 680, 150, '∞')],
    links: [['u', 'v'], ['u', 'x'], ['u', 'w'], ['v', 'x'], ['v', 'w'], ['x', 'w'], ['x', 'y'], ['w', 'y'], ['w', 'z'], ['y', 'z']],
    steps: [
      { p: [P('u', 'v', 'LSA'), P('u', 'x', 'LSA'), P('u', 'w', 'LSA')], say: ['Link state: every router floods its link costs, so all have the full map. Costs: u-v 2, u-x 1, u-w 5, v-x 2, v-w 3, x-w 3, x-y 1, w-y 1, w-z 5, y-z 2.', 'Link state: כל נתב מציף את עלויות הקווים שלו, ולכן לכולם יש את המפה המלאה. עלויות: u-v 2, ‏u-x 1, ‏u-w 5, ‏v-x 2, ‏v-w 3, ‏x-w 3, ‏x-y 1, ‏w-y 1, ‏w-z 5, ‏y-z 2.'] },
      { at: ['u'], set: { u: 'N\' = {u}', v: '2 via u', x: '1 via u', w: '5 via u' }, say: ['Initialization: N\' = {u}. Neighbors get their direct cost, the rest stay ∞.', 'אתחול: N\' = {u}. השכנים מקבלים את העלות הישירה, השאר נשארים ∞.'] },
      { at: ['x'], set: { x: '1 ✓', w: '4 via x', y: '2 via x' }, say: ['Step 1: the smallest D not in N\' is x (1). Add it, then relax its neighbors: D(w) = min(5, 1 + 3) = 4, D(y) = 1 + 1 = 2.', 'שלב 1: ה-D הקטן ביותר מחוץ ל-N\' הוא x ‏(1). מוסיפים אותו ומעדכנים את השכנים שלו: ‏D(w) = min(5, 1 + 3) = 4, ‏D(y) = 1 + 1 = 2.'] },
      { at: ['y'], set: { y: '2 ✓', w: '3 via y', z: '4 via y' }, say: ['Step 2: y (2) (tie with v, broken arbitrarily). D(w) = min(4, 2 + 1) = 3, D(z) = 2 + 2 = 4.', 'שלב 2: ‏y ‏(2) (שוויון עם v, נשבר שרירותית). ‏D(w) = min(4, 2 + 1) = 3, ‏D(z) = 2 + 2 = 4.'] },
      { at: ['v'], set: { v: '2 ✓' }, say: ['Step 3: v (2). Through v: w would be 2 + 3 = 5 &gt; 3, x would be 4 &gt; 1. No change.', 'שלב 3: ‏v ‏(2). דרך v: ‏w היה 2 + 3 = 5 &gt; 3, ‏x היה 4 &gt; 1. אין שינוי.'] },
      { at: ['w'], set: { w: '3 ✓' }, say: ['Step 4: w (3). z through w would be 3 + 5 = 8 &gt; 4. No change.', 'שלב 4: ‏w ‏(3). ‏z דרך w היה 3 + 5 = 8 &gt; 4. אין שינוי.'] },
      { at: ['z'], set: { z: '4 ✓', u: 'done' }, say: ['Step 5: z (4). All nodes are in N\'. Shortest-path tree: x and v direct, y via x, w and z via y. Forwarding table at u: v → (u,v); x, y, w, z → (u,x). n iterations, O(n²) comparisons.', 'שלב 5: ‏z ‏(4). כל הצמתים ב-N\'. עץ המסלולים הקצרים: ‏x ו-v ישירות, ‏y דרך x, ‏w ו-z דרך y. טבלת ההעברה ב-u: ‏v ← (u,v); ‏x, ‏y, ‏w, ‏z ← (u,x). ‏n איטרציות, ‏O(n²) השוואות.'] },
    ] });

  add({ id: 'dv', ch: 'n09', title: ['Distance vector: one round of Bellman-Ford', 'Distance vector: סיבוב אחד של Bellman-Ford'], h: 260,
    nodes: [N('x', 120, 200, 'x', 'x:0 y:2 z:7', 'h', 170), N('y', 380, 50, 'y', 'x:2 y:0 z:1', 'h', 170), N('z', 640, 200, 'z', 'x:7 y:1 z:0', 'h', 170)],
    links: [['x', 'y'], ['y', 'z'], ['x', 'z']],
    steps: [
      { at: ['x', 'y', 'z'], say: ['Costs: c(x,y) = 2, c(y,z) = 1, c(x,z) = 7. Each node starts knowing only the cost to its direct neighbors.', 'עלויות: ‏c(x,y) = 2, ‏c(y,z) = 1, ‏c(x,z) = 7. כל צומת מתחיל ויודע רק את העלות לשכנים הישירים.'] },
      { p: [P('y', 'x', 'DV y'), P('y', 'z', 'DV y'), P('z', 'x', 'DV z'), P('x', 'z', 'DV x')], say: ['Each node sends its distance vector to its neighbors. Nobody has a global map: <b>distributed, iterative, asynchronous</b>.', 'כל צומת שולח את ה-distance vector שלו לשכנים. לאף אחד אין מפה גלובלית: <b>מבוזר, איטרטיבי, אסינכרוני</b>.'] },
      { at: ['x'], set: { x: 'x:0 y:2 z:3 (via y)' }, say: ['x applies Bellman-Ford: d<sub>x</sub>(z) = min{ c(x,y) + d<sub>y</sub>(z), c(x,z) + d<sub>z</sub>(z) } = min{2 + 1, 7 + 0} = <b>3</b>, via y.', 'x מפעיל Bellman-Ford: ‏d<sub>x</sub>(z) = min{ c(x,y) + d<sub>y</sub>(z), c(x,z) + d<sub>z</sub>(z) } = min{2 + 1, 7 + 0} = <b>3</b>, דרך y.'] },
      { at: ['z'], set: { z: 'x:3 (via y) y:1 z:0' }, say: ['Likewise z: d<sub>z</sub>(x) = min{1 + 2, 7 + 0} = 3, via y. y\'s vector does not change.', 'כך גם z: ‏d<sub>z</sub>(x) = min{1 + 2, 7 + 0} = 3, דרך y. הווקטור של y לא משתנה.'] },
      { p: [P('x', 'y', 'DV x (new)'), P('x', 'z', 'DV x (new)'), P('z', 'x', 'DV z (new)'), P('z', 'y', 'DV z (new)')], say: ['Because their vectors changed, x and z notify their neighbors. Nobody improves any more: the algorithm has <b>converged</b>.', 'כי הווקטורים שלהם השתנו, ‏x ו-z מודיעים לשכנים. אף אחד כבר לא משתפר: האלגוריתם <b>התכנס</b>.'] },
      { at: ['y'], set: { y: 'if c(x,y): 2 → 60 ?' }, say: ['Bad news travels slowly: if c(x,y) jumped to 60, y would believe z still reaches x at cost 3 (through y itself!) and the two would count up step by step: <b>count to infinity</b>. Poisoned reverse helps only for 2-node loops.', 'חדשות רעות מגיעות לאט: אם c(x,y) היה קופץ ל-60, ‏y היה מאמין ש-z עדיין מגיע ל-x בעלות 3 (דרך y עצמו!) ושניהם היו סופרים למעלה צעד אחרי צעד: <b>count to infinity</b>. ‏Poisoned reverse עוזר רק ללולאות של 2 צמתים.'] },
    ] });

  // ======================= N10 · link layer =======================
  add({ id: 'learn', ch: 'n10', title: ['Self-learning switch: learn, flood, forward, filter', 'Switch שלומד לבד: למידה, הצפה, העברה, סינון'], h: 290,
    nodes: [N('A', 110, 60, 'A', 'port 1'), N('Bh', 110, 230, 'B', 'port 2'), N('S', 380, 145, 'Switch', 'table: empty', 'r', 180), N('C', 650, 60, 'C', 'port 3'), N('D', 650, 230, 'D', 'port 4')],
    links: [['A', 'S'], ['Bh', 'S'], ['S', 'C'], ['S', 'D']],
    steps: [
      { p: [P('A', 'S', 'A → D')], set: { S: 'A → port 1' }, say: ['A frame from A to D arrives on port 1. The switch <b>learns</b>: MAC A lives behind port 1 (with a TTL).', 'Frame מ-A ל-D מגיע בפורט 1. ה-switch <b>לומד</b>: ה-MAC של A נמצא מאחורי פורט 1 (עם TTL).'] },
      { p: [P('S', 'Bh', 'A → D'), P('S', 'C', 'A → D'), P('S', 'D', 'A → D')], say: ['D is not in the table: <b>flood</b> to every port except the one it came from. B and C drop it (wrong MAC); D accepts it.', 'D לא בטבלה: <b>מציפים</b> לכל הפורטים חוץ מזה שממנו הגיע. ‏B ו-C זורקים אותו (MAC לא שלהם); ‏D מקבל אותו.'] },
      { p: [P('D', 'S', 'D → A')], set: { S: 'A → 1 · D → 4' }, say: ['D replies. The switch learns D → port 4.', 'D עונה. ה-switch לומד D ← פורט 4.'] },
      { p: [P('S', 'A', 'D → A', 'd')], say: ['A is known: <b>forward</b> only to port 1. No flooding, and other ports are free for other transmissions at the same time.', 'A ידוע: <b>מעבירים</b> רק לפורט 1. בלי הצפה, ושאר הפורטים פנויים לשידורים אחרים באותו זמן.'] },
      { at: ['S'], say: ['If a frame ever arrives for a destination on the <b>same</b> port it came from (e.g. behind a hub), the switch <b>filters</b> (drops) it. No configuration was needed at any point: plug-and-play. A full table (MAC flooding) turns the switch into a hub: security chapter 04.', 'אם אי פעם מגיע frame ליעד שנמצא באותו פורט שממנו הגיע (למשל מאחורי hub), ה-switch <b>מסנן</b> (זורק) אותו. לא היה צריך שום הגדרה: plug-and-play. טבלה מלאה (MAC flooding) הופכת את ה-switch ל-hub: פרק 04 בקורס האבטחה.'] },
    ] });

  add({ id: 'csmacd', ch: 'n10', title: ['CSMA/CD: collision, jam and binary backoff', 'CSMA/CD: התנגשות, jam ו-binary backoff'], h: 240,
    nodes: [N('A', 110, 120, 'NIC A', 'sense: idle', 'h', 170), N('M', 380, 120, 'Shared bus', '', 'r', 150), N('B', 650, 120, 'NIC B', 'sense: idle', 'h', 170)],
    links: [['A', 'M'], ['M', 'B']],
    steps: [
      { p: [P('A', 'M', 'frame A'), P('B', 'M', 'frame B')], say: ['Both NICs sense the channel idle and start transmitting. Because of <b>propagation delay</b>, neither has heard the other yet.', 'שני הכרטיסים מקשיבים, הערוץ שקט, ושניהם מתחילים לשדר. בגלל <b>השהיית ההתפשטות</b>, אף אחד עוד לא שמע את השני.'] },
      { at: ['M'], set: { M: 'COLLISION' }, say: ['The signals collide on the bus.', 'האותות מתנגשים על ה-bus.'] },
      { p: [P('M', 'A', 'collision', 'w'), P('M', 'B', 'collision', 'w')], set: { A: 'abort · send jam', B: 'abort · send jam' }, say: ['Each NIC detects the collision <b>while still transmitting</b> (that is why frames must be ≥ 64 bytes), aborts, and sends a 48-bit <b>jam</b> signal so everyone knows.', 'כל כרטיס מזהה את ההתנגשות <b>בזמן שהוא עדיין משדר</b> (לכן frames חייבים להיות לפחות 64 בתים), מבטל, ושולח אות <b>jam</b> של 48 ביט כדי שכולם יידעו.'] },
      { at: ['A', 'B'], set: { A: 'm=1: K∈{0,1} → 0', B: 'm=1: K∈{0,1} → 1' }, say: ['<b>Binary exponential backoff</b>: after the m-th collision pick K at random from {0, …, 2<sup>m</sup> − 1} and wait K·512 bit times. Here A picks 0, B picks 1.', '<b>Binary exponential backoff</b>: אחרי ההתנגשות ה-m בוחרים K אקראי מ-{0, …, 2<sup>m</sup> − 1} ומחכים K·512 זמני ביט. כאן A בוחר 0, ‏B בוחר 1.'] },
      { p: [P('A', 'M', 'frame A'), P('M', 'B', 'frame A')], set: { M: 'busy: A', B: 'busy → defer' }, say: ['A retransmits immediately. When B\'s backoff ends, it senses the channel busy and defers.', 'A משדר שוב מיד. כש-backoff של B נגמר, הוא שומע שהערוץ תפוס ומחכה.'] },
      { p: [P('B', 'M', 'frame B')], set: { M: 'busy: B', A: 'done', B: 'done' }, say: ['Then B sends. Had they collided again (m = 2), K would come from {0..3}: the range doubles, so heavy load spreads out automatically. Efficiency = 1 / (1 + 5·t<sub>prop</sub>/t<sub>trans</sub>).', 'אחר כך B שולח. אם היו מתנגשים שוב (m = 2), ‏K היה נבחר מ-{0..3}: הטווח מוכפל, ולכן עומס כבד מתפזר מעצמו. יעילות = 1 / (1 + 5·t<sub>prop</sub>/t<sub>trans</sub>).'] },
    ] });

  // ======================= N11 · a day in the life =======================
  add({ id: 'dayinlife', ch: 'n11', title: ['A day in the life of a web request', 'יום בחייה של בקשת web'], h: 290,
    nodes: [N('L', 100, 145, 'Laptop', 'no IP yet', 'h', 170), N('R', 340, 145, 'Campus router', 'DHCP server', 'r', 150), N('D', 600, 50, 'DNS server', ''), N('G', 620, 240, 'google.com', 'web server', 'h', 140)],
    links: [['L', 'R'], ['R', 'D'], ['R', 'G']],
    steps: [
      { p: [P('L', 'R', 'DHCP Discover')], say: ['The laptop connects. It needs an IP address, its gateway, and a DNS server: <b>DHCP</b> over UDP, IP broadcast, Ethernet broadcast.', 'המחשב מתחבר. הוא צריך כתובת IP, ‏gateway ושרת DNS: <b>DHCP</b> מעל UDP, ‏broadcast של IP ו-broadcast של Ethernet.'], h: [H('Encapsulation', [['Ethernet dst', 'FF-FF-FF-FF-FF-FF'], ['IP src / dst', '0.0.0.0 / 255.255.255.255'], ['UDP', '68 → 67'], ['DHCP', 'Discover', 1]])] },
      { p: [P('R', 'L', 'DHCP Offer / ACK')], set: { L: '68.85.2.101 · gw · dns' }, say: ['(Offer and Request omitted.) The DHCP ACK carries the IP address, first-hop router and DNS server.', '(Offer ו-Request הושמטו.) ה-DHCP ACK נושא את כתובת ה-IP, הנתב הראשון ושרת ה-DNS.'] },
      { p: [P('L', 'R', 'ARP who-has gw?'), P('R', 'L', 'ARP is-at')], set: { L: 'IP · gw MAC known' }, say: ['To send anything off the subnet the laptop needs the router\'s MAC: <b>ARP</b> broadcast, unicast reply.', 'כדי לשלוח משהו מחוץ ל-subnet המחשב צריך את ה-MAC של הנתב: ‏<b>ARP</b> ב-broadcast, תשובה ב-unicast.'] },
      { p: [P('L', 'R', 'DNS query'), P('R', 'D', 'DNS query')], say: ['A <b>DNS</b> query for www.google.com (UDP 53), routed through the ISP using tables built by OSPF and BGP.', 'שאילתת <b>DNS</b> ל-www.google.com ‏(UDP 53), מנותבת דרך ה-ISP לפי טבלאות ש-OSPF ו-BGP בנו.'] },
      { p: [P('D', 'R', 'A 64.233.169.105'), P('R', 'L', 'A record')], set: { L: 'google = 64.233.169.105' }, say: ['The DNS reply gives the server\'s IP address.', 'תשובת ה-DNS נותנת את כתובת ה-IP של השרת.'] },
      { p: [P('L', 'G', 'SYN'), P('G', 'L', 'SYN-ACK'), P('L', 'G', 'ACK')], say: ['A <b>TCP</b> 3-way handshake with the web server on port 80 (or 443, followed by a TLS handshake).', 'לחיצת יד משולשת של <b>TCP</b> עם שרת ה-web בפורט 80 (או 443, ואחריה לחיצת יד של TLS).'] },
      { p: [P('L', 'G', 'HTTP GET /'), P('G', 'L', 'HTTP 200 OK')], set: { L: 'page displayed ✓' }, say: ['The <b>HTTP</b> request and reply travel inside the TCP connection. Every layer of the course was used: DHCP, UDP, IP, Ethernet, ARP, DNS, routing, TCP, HTTP.', 'בקשת ה-<b>HTTP</b> והתשובה עוברות בתוך חיבור ה-TCP. כל שכבה בקורס הייתה בשימוש: ‏DHCP, ‏UDP, ‏IP, ‏Ethernet, ‏ARP, ‏DNS, ניתוב, ‏TCP, ‏HTTP.'] },
    ] });
})();
