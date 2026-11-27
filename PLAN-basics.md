# navi - Basics (MVP)

Chủ app chốt 2026-11-27. **MVP code xong 2026-11-27** (xem ghi chú cuối mục 9). Đọc `PLAN-navi.md` (nguyên tắc bất biến mục 1, tiếng Anh đơn giản mục 4) và `AGENTS.md`
trước khi code.

**Vấn đề:** chủ app làm DevOps nhưng nền tảng software/OS/network còn yếu. Muốn mỗi ngày (trưa, lúc rảnh) học và
ôn kiến thức nền **sâu và quan trọng**, từng mẩu nhỏ, nối với những gì đã học theo thời gian.

**Ý chính:** **học trước, luyện sau.** Mỗi concept: đọc bài ngắn → kiểm tra ngay 1 câu dễ → ôn cách quãng với câu
khó dần, mỗi lần một góc khác. Không hỏi thứ chưa dạy.

---

## 0. Quyết định đã chốt

| # | Quyết định |
|---|---|
| 1 | Tên: **basics**. Trang con của `practice` (`drill · interview · review · basics`), một dòng trên Today |
| 2 | Vòng lặp: lesson (đọc ~3 phút) → check (1 câu dễ, ngay sau bài) → review (Leitner 1/3/7/14/30 ngày, câu khó dần) |
| 3 | Một phiên trưa: **1 bài mới + tối đa 2 câu ôn** (~5-7 phút). Hôm bận chỉ ôn |
| 4 | Lịch ôn Leitner gắn với **concept**, không gắn với câu hỏi. Mỗi lần ôn là một câu mới, góc khác |
| 5 | Concept có thứ tự và `prereqs` (concept gốc). Bài mới chỉ mở khi concept gốc đã học |
| 6 | Bài học viết **một lần** cho mỗi concept (model mạnh), lưu lại như sách riêng. Có nút `looks wrong` để viết lại |
| 7 | Câu ôn **tạo sẵn** lúc 04:00 mỗi ngày: mở app là học ngay, offline vẫn được (cache Firestore) |
| 8 | Không hiểu đề: bấm chữ khó xem nghĩa (tạo sẵn), nút `I don't get it` (không tính sai), tự lùi về concept gốc |
| 9 | Basics **không** làm tăng level skill (nguyên tắc 3). Không điểm, không streak (nguyên tắc 4) |
| 10 | MVP chỉ 2 deck: `linux`, `network`. 4 deck còn lại ở Phase 2 |

Ngoài phạm vi MVP: xem mục 10.

---

## 1. Deck và concept

Danh mục cố định trong code: `functions/src/basics/catalog.ts` (pure, test import được), client có bản sao nhẹ
(id, deck, name, prereqs) trong `src/lib/basics-catalog.ts`. Một test giữ hai bên giống nhau (giống drill catalog).

```ts
export type Deck = 'linux' | 'network' | 'data' | 'runtime' | 'distributed' | 'delivery';
export type Concept = {
  id: string;          // 'tcp-time-wait'
  deck: Deck;
  name: string;        // 'TCP TIME_WAIT'
  prereqs: string[];   // concept ids to learn first
  focus: string;       // one line for the model: what the lesson must make clear
};
```

Thứ tự deck (gần việc DevOps nhất trước): `linux → network → data → runtime → distributed → delivery`.

### MVP: linux (12)

| id | name | prereqs |
|---|---|---|
| `process` | Processes and PIDs | - |
| `syscall` | System calls (user space vs kernel) | process |
| `thread` | Threads vs processes | process |
| `virtual-memory` | Virtual memory and pages | process |
| `stack-heap` | Stack and heap | virtual-memory |
| `file-descriptor` | File descriptors and "everything is a file" | syscall |
| `permissions` | Users, groups and file permissions | process |
| `signals` | Signals (SIGTERM, SIGKILL) and graceful shutdown | process |
| `inode-filesystem` | Inodes, disks and "no space left" | file-descriptor |
| `page-cache` | Page cache, free vs available memory | virtual-memory |
| `oom-killer` | The OOM killer | page-cache, stack-heap |
| `cgroups-namespaces` | cgroups and namespaces (what a container is) | oom-killer, permissions |

### MVP: network (12)

| id | name | prereqs |
|---|---|---|
| `ip-subnet` | IP addresses and subnets (CIDR) | - |
| `ports-sockets` | Ports and sockets | ip-subnet, file-descriptor |
| `tcp-handshake` | TCP handshake and reliable delivery | ports-sockets |
| `tcp-close` | Closing TCP: FIN, RST, TIME_WAIT | tcp-handshake |
| `udp` | UDP and when to use it | ports-sockets |
| `dns-resolution` | How DNS resolution works | udp |
| `dns-ttl` | DNS caching and TTL | dns-resolution |
| `http-basics` | HTTP requests, status codes, keep-alive | tcp-handshake |
| `tls-handshake` | TLS handshake and certificates | tcp-handshake |
| `nat` | NAT and private networks | ip-subnet |
| `load-balancing` | L4 vs L7 load balancing | http-basics |
| `reverse-proxy` | Reverse proxies and timeouts (502, 504) | load-balancing |

Phase 2: `data` (index, transaction/isolation, connection pool, replication, cache), `runtime` (GC, event loop vs
threads, deadlock/race), `distributed` (timeout/retry/backoff, idempotency, queues, quorum/CAP; SRE: percentiles và tail latency, SLI/SLO và error budget,
burn rate, Little's law và hàng đợi, capacity headroom), `delivery` (image
layers, build artifacts, IaC state, metrics/logs/traces). Mỗi deck khoảng 10 concept.

---

## 2. Bài học (lesson)

Một bài cho mỗi concept, cấu trúc cố định, tiếng Anh đơn giản (mục 4 của plan chính). Đọc ~3 phút.

| Phần | Nội dung |
|---|---|
| `problem` | Nó sinh ra để giải quyết chuyện gì. 2-3 câu |
| `how` | 4-6 bước ngắn, như sơ đồ bằng chữ |
| `picture` | Một so sánh đời thường. 1-2 câu |
| `seeIt` | 1-2 lệnh chạy trên Linux/macOS + output mẫu ngắn (code block) |
| `mistake` | Hiểu lầm hay gặp. 1-2 câu |
| `atWork` | Chỗ gặp nó khi làm DevOps (sự cố, config, review). 1-2 câu |
| `readMore` | Một nguồn uy tín: chương sách hoặc trang (OSTEP, High Performance Browser Networking, Julia Evans, man page, RFC). Tên + chương, link chỉ khi chắc chắn đúng |
| `glossary` | Mọi từ khó trong bài: `{ term, meaning }`, nghĩa 1 câu |
| `check` | 1 câu `predict` hoặc `spot-the-myth` **dễ**, chỉ dùng điều vừa học (xem mục 3) |

- Model: `GEMINI_MODEL_START` (Hydrogen), JSON schema, mọi key required. Bài viết một lần, lưu lại.
- `looks wrong` (một dòng ghi chú tùy chọn) → callable `basicsRewrite` viết lại bài, ghi `version + 1`, tối đa
  3 lần mỗi concept.

---

## 3. Câu hỏi (check và review)

Hai kiểu trong MVP, đều chỉ cần chạm:

| Kiểu | Đề | Trả lời |
|---|---|---|
| `predict` | Một tình huống 2-3 câu. "What happens first?" | 4 lựa chọn, 1 đúng |
| `myth` | 3 câu phát biểu về concept, 1 câu sai tinh vi. "Which one is wrong?" | Chọn câu sai |

Một câu gồm: `prompt`, `options`, `answer` (index), `why` (3 dòng chuỗi nhân quả), `rule` (1 dòng rule of thumb),
`seeIt` (1 lệnh), `glossary` (từ khó trong đề), `setup` (2-3 câu nền cho người không hiểu đề).

**Độ khó theo hộp Leitner** (prompt nhận `level`):
- check sau bài và hộp 1: dễ, chỉ dùng điều trong bài.
- hộp 2-3: tình huống thật, một bước suy luận.
- hộp 4-5: tình huống có nhiễu, nối với concept gốc.
- Kiểu xoay vòng: lần ôn sau dùng kiểu khác lần trước (`lastKind`).

**Luật viết đề** (trong prompt, có test kiểm prompt):
- Đề tối đa ~35 từ, tiếng Anh IELTS 6.0-6.5.
- Chỉ dùng từ chuyên môn của concept đang hỏi và các concept đã học; từ khác phải có trong `glossary`.
- Tránh tên flag, tên sản phẩm cụ thể trừ khi concept nói về chính nó.
- Lựa chọn sai phải là điều một junior hay nghĩ thật, không vô lý.

Đáp án nằm trong doc câu hỏi (client chấm). Một người dùng, tự học: không cần ẩn như `drillKeys`.

---

## 4. Một phiên và luật chọn (pure, có test)

`functions/src/basics/pick.ts` (pure):

```ts
/** Today's session: up to 2 due reviews (oldest first) and 1 new concept. */
export function pickSession(state: ConceptState[], catalog: Concept[], now: number): { reviews: string[]; next: string | null };
/** The next concept to learn: first in catalog order whose prereqs are all learned, deck order linux → network. */
export function nextConcept(state, catalog): string | null;
```

- **reviews:** concept có `nextReviewAt <= now`, cũ nhất trước, tối đa 2. Concept đang bị "stuck" (mục 5) được kéo
  concept gốc của nó lên trước.
- **next:** concept đầu tiên chưa học mà mọi `prereqs` đã `learned`. Một ngày tối đa 1 bài mới (có nút
  `one more` sau khi xong phiên, cũng tối đa 1 lần).
- Concept "learned" = đã đọc bài và trả lời đúng câu check (hoặc `I know this` rồi đúng câu check).

---

## 5. Trả lời và các nút

Trên mỗi câu, trước khi chọn: hai chữ `sure` / `guess` (mặc định `guess`).

| Hành động | Kết quả |
|---|---|
| Đúng | Leitner `review(box, true)` (dùng `src/lib/leitner.ts`) |
| Sai, `guess` | Leitner về hộp 1 |
| Sai, `sure` | Leitner về hộp 1 + `blindSpots + 1` (hiểu lầm, đáng chú ý hơn chưa biết) |
| `I don't get it` | Hiện `setup`, rồi chọn trả lời tiếp hoặc bỏ qua. **Không tính sai**, không đổi hộp. `stuck + 1`, ôn lại ngày mai |
| Bấm chữ gạch chân chấm | Hiện nghĩa từ `glossary` ngay dưới đề (không gọi AI) |
| `save term` (cạnh nghĩa một từ) | Thêm vào Terms (`addTerm`, rồi `termCard` như hiện tại) |
| `I know this` (ở bài mới) | Bỏ qua bài đọc, vào thẳng câu check. Sai thì bài đọc mở lại |

**Tự lùi về gốc:** bấm `I don't get it` 2 lần trong cùng một deck trong 7 ngày → 3 câu tiếp theo của deck đó dùng
`level` dễ hơn một bậc, và concept gốc (prereqs) của câu bị stuck được đặt `nextReviewAt = now` (ôn ngay phiên sau).

Mỗi câu trả lời (kể cả `I don't get it`) gọi `bumpDayReviews` → ô heatmap hôm đó sáng (nhạt).

---

## 6. Data model

```ts
// users/{uid}/basics/{conceptId} - client writes (rules check)
export type BasicState = {
  deck: Deck;
  status: 'reading' | 'learning' | 'learned'; // learning = in Leitner, learned = passed box 5
  readAt: number | null;
  box: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number | null;
  lastKind: 'predict' | 'myth' | null;
  blindSpots: number;  // wrong while "sure"
  stuck: number;       // "I don't get it"
  stuckAt: number[];   // last 5, for the 7-day rule
  updatedAt: number;
};

// users/{uid}/basicLessons/{conceptId} - written by Functions only, client reads
export type BasicLesson = {
  problem: string; how: string[]; picture: string; seeIt: string; mistake: string; atWork: string;
  readMore: string; glossary: { term: string; meaning: string }[]; check: BasicQuestion;
  version: number; createdAt: number;
};

// users/{uid}/basicCards/{id} - review questions, written by Functions; client may set only the answer fields
export type BasicQuestion = {
  kind: 'predict' | 'myth'; prompt: string; options: string[]; answer: number;
  why: string[]; rule: string; seeIt: string; glossary: { term: string; meaning: string }[]; setup: string;
};
export type BasicCard = BasicQuestion & {
  conceptId: string; level: 1 | 2 | 3; forDay: string; // 'YYYY-MM-DD'
  picked: number | null; sure: boolean | null; result: 'right' | 'wrong' | 'stuck' | null; answeredAt: number | null;
  createdAt: number;
};
```

**Rules** (`firestore.rules.template`): `basics` client read/write với `validBasic`; `basicLessons` read only;
`basicCards` read, update chỉ được đổi `picked`, `sure`, `result`, `answeredAt` (giống cách drill chỉ cho đổi `status`).
Thêm case vào `scripts/rules-check.mjs`.

---

## 7. Functions

| Function | Khi nào | Làm gì |
|---|---|---|
| `basicsDaily` | Scheduled 04:00 (VN) | `pickSession` → viết bài cho concept `next` nếu chưa có; viết câu ôn cho mỗi concept trong `reviews` (`forDay` = hôm nay). Đã có thì bỏ qua |
| `basicsNow` | Callable, nút `make now` khi chưa có gì cho hôm nay | Cùng code, tối đa 1 lần/giờ |
| `basicsRewrite` | Callable, nút `looks wrong` | Viết lại một bài, tối đa 3 lần mỗi concept |

- Model: Hydrogen cho bài học và câu hỏi (cần đúng, chạy nền nên chậm không sao). Prompt luôn bắt đầu bằng
  `PLAIN_ENGLISH` (test có sẵn kiểm điều này).
- Không có câu nào chờ AI lúc đang học, trừ `make now` và `looks wrong`.
- Chi phí ước tính: 1 bài + 2 câu mỗi ngày.
- Emulator: fake answer khi không có key (giống drill).

---

## 8. Giao diện

**Today:** một stop `basics` trên route: `1 new · 2 review` + `start`. Chấm đậm khi phiên xong.

**Practice → basics** (`/basics/`, thêm vào `PLACES` của `practice`, `public/sw.js` thêm trang):

1. **Hôm nay** (trên cùng): bài mới → câu check → câu ôn, từng bước một, như các vòng drill. Thanh nhỏ `1/3`.
   - Bài học: các phần mục 2 với tiêu đề mono nhỏ (`problem`, `how`, `see it`...). Từ khó gạch chân chấm.
   - Câu hỏi: đề, `sure / guess`, lựa chọn, `I don't get it`. Sau khi chọn: `why`, `rule`, `see it`.
   - Xong: một dòng yên lặng, ví dụ `3 done · next review in 3 days`. Nút `one more` (tối đa 1).
2. **Library** (gập theo deck, giống Skills): mỗi concept một dòng: tên + mono `new` / `box 3` / `learned`.
   Bấm để đọc lại bài. Concept chưa mở hiện faint, ghi concept gốc cần học trước.

Chữ UI tối thiểu (AGENTS.md). Không điểm, không streak. Chỉ một nút đậm mỗi màn hình (`start` hoặc `check`).

---

## 9. Việc phải làm (theo thứ tự)

1. `functions/src/basics/catalog.ts` (24 concept MVP) + bản client + test giữ giống nhau, test `prereqs` hợp lệ
   (không vòng, id tồn tại).
2. Types + rules + rules check (mục 6).
3. `pick.ts`: `pickSession`, `nextConcept`, luật stuck. Unit test.
4. Prompts + parsers + fakes (`functions/src/basics/prompts.ts`): lesson, question theo `level` và `kind`. Test parse
   và test luật viết đề có trong prompt.
5. `basicsDaily`, `basicsNow`, `basicsRewrite`.
6. Client: `src/lib/basics.ts` (pure: áp kết quả trả lời lên state, dùng `leitner.ts`) + `repo-basics.ts` + hook.
7. UI: trang `/basics/`, stop trên Today, `PLACES`, `sw.js`.
8. Guide page + dòng trỏ tới file này trong "Để sau" của `PLAN-navi.md`.

**Done khi:**
- `npm test`, `typecheck`, `fn:typecheck`, `test:rules`, lint qua.
- Emulator: `make now` ra bài + câu; đọc bài, trả lời check, `I don't get it` hiện setup; bấm chữ khó hiện nghĩa;
  hôm sau (đổi giờ giả) câu ôn hiện đúng; ô heatmap sáng.
- Thử thật với key: đọc 3 bài linux đầu, tự kiểm nội dung đúng (chủ app hoặc so với OSTEP / man page).
- Trang đọc được ở 375px. File dưới ~500 dòng. Không em dash.

Ghi chú khi làm (2026-11-27):
- Bài mới được viết sẵn cùng một bài dự phòng (`spare`), để `one more` không phải chờ. Ngày lưu ở `basicDays/{day}`.
- Luật "khó hơn sau stuck" đơn giản hơn plan: khi deck có từ 2 lần `I don't get it` trong 7 ngày, câu ôn của deck đó
  thấp hơn một level (thay vì đếm đúng 3 câu).
- Sau `I don't get it`, câu trả lời không chấm (result `stuck`) dù đúng hay sai; chỉ hiện đáp án và giải thích.
- `I know this` mà sai: bài đọc mở ra, chỉ lưu kết quả khi bấm `continue`.

---

## 10. Để sau (Phase 2)

- 4 deck còn lại (`data`, `runtime`, `distributed`, `delivery`).
- Kiểu câu `order` (xếp bước) và `which command` (lệnh nào cho thấy điều này).
- **Explain it back hằng tuần:** chọn 1 concept đã học, viết 2-3 câu bằng lời mình, AI chấm (dùng lại `explainBack`).
- **Lab cuối tuần** (~15 phút, Docker trên laptop): ví dụ tự gây OOM rồi đọc `dmesg`, xem TIME_WAIT bằng `ss`.
  Làm xong có thể là bằng chứng level 2 cho skill liên quan (làm thật, đúng nguyên tắc 3).
- Câu thứ hai nối với việc đang làm: term mới lưu, module đang học, lỗi sai drill, skill của Track.
- Sai khi `sure` đổ vào sổ lỗi sai chung (`mistakes`, cần `drillId` tùy chọn).
- `go deeper`: tạo drill `why-chain` / `spot-the-lie` về concept đó.
- Một dòng trên Map: `basics: 23/70 learned`.
- Gợi ý thêm OSTEP làm một khóa trong `learn` cho buổi tối / cuối tuần.
