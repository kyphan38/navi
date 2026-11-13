# navi - Implementation plan

App định hướng nghề nghiệp cho một người: DevOps/SRE 2 năm kinh nghiệm, làm app thanh toán trên AWS ở ngân hàng.
Tên: "navi" = navigate, tìm hướng đi.

Ba việc chính:
1. **Luyện** mỗi ngày bằng bài tập tình huống (kỹ thuật, AI, giao tiếp, business, viết).
2. **Học** theo khóa học có sẵn (ví dụ Cantrill), biết hôm nay học gì, thế nào là xong.
3. **Nhìn thấy** mình đang ở đâu trên lộ trình, và nếu cố thêm thì tới đâu.

Next.js (static export) + Firebase (Auth + Firestore + Cloud Functions cho AI) + Vercel. Copy khung của legi/hodi.
Một người dùng. Mac là chính, iPhone (PWA) để làm bài tập ngắn.
**App 100% tiếng Anh, mức IELTS 6.0-6.5** (xem mục 4).

Plan này viết cho agent code. Làm đúng thứ tự phase. Hỏi chủ app trước khi bắt đầu mỗi phase.
Không tự thêm tính năng ngoài plan. Ý mới ghi vào mục "Để sau" ở cuối file.

---

## 0. Đọc trước khi code

1. `../AGENTS.md` (không em dash, không co-author, code/comment tiếng Anh, UI copy tối thiểu).
2. `../DESIGN.md` (chỉ xám, layout calm, Motion, phone widths).
3. `../legi/PLAN-legi.md` mục 0 và 2: danh sách file copy từ hodi, Stage 0, cách làm Functions.
   navi copy đúng danh sách đó, đổi `legi` -> `navi`.
4. Next.js 16.x: đọc `node_modules/next/dist/docs/` trước khi viết code liên quan Next.

### Thư viện

Giống legi: `next`, `react`, `react-dom`, `firebase`, `tailwindcss`, `sharp` (dev).
**Không thêm thư viện khác.** Biểu đồ ở P4 vẽ bằng SVG tay, không chart lib.

---

## 1. Nguyên tắc bất biến

Không được đổi nếu chưa hỏi chủ app.

1. **Mở app là biết hôm nay làm gì.** `/` là trang Today: việc học hôm nay + bài tập hôm nay.
2. **Luyện quan trọng hơn đọc.** Mọi thứ học được phải dẫn tới một bài tập hoặc một bằng chứng.
3. **Lên level từ từ, có bằng chứng.** Mức kỹ năng chỉ tăng khi có bằng chứng (mục 3.4). Không tự chấm.
4. **Không game hóa.** Không streak, không điểm, không huy hiệu, không thông báo đẩy.
   Lên mức kỹ năng chỉ hiện một dòng yên lặng, ví dụ `IAM · level 2`.
5. **Plan nói thật.** Plan tuần dựa trên số giờ thật đã học, không dựa trên số giờ mong muốn.
   Bị chậm thì lên lại plan và báo ngày xong mới. Không dồn việc cũ vào tuần sau.
6. **Không dữ liệu nội bộ của công ty.** Không có ô nào yêu cầu tên hệ thống, config, log thật.
   Ô "Ask a senior" có placeholder `No internal names or data`.
7. **Chỉ xám, yên lặng, không emoji.** Theo DESIGN.md.
8. **Không server, trừ AI.** Static export. Firestore rules kiểm uid + email. Functions kiểm cùng email.
9. **Tiêu đề tab luôn là `navi`.**
10. **Chữ đơn giản.** Mục 4 áp dụng cho UI và mọi prompt AI.

---

## 1b. Nét riêng của navi (cùng hệ, nhưng không giống hệt)

navi theo DESIGN.md (chỉ xám, không emoji, font hệ thống, Theme row, không shadow). Nhưng nhìn vào phải biết
ngay đây là navi, không phải hodi/legi/cogi. Ý tưởng chung: **"đường đi" và "nhật ký vận hành"**,
hợp với một kỹ sư DevOps.

| | App khác | navi |
|---|---|---|
| Nav | Hàng chữ trên cùng (hodi, legi), TopBar + gear (fina, logi) | **Rail trái** trên màn hình >= 768px: chữ dọc, font mono, chỗ đang đứng có một chấm `●` đậm nằm trên một đường dọc 1px. Màn hình hẹp: hàng chữ cuộn ngang |
| Cột nội dung | Một cột 36rem ở giữa | Cột 40rem lệch trái cạnh rail. `map` dùng toàn chiều rộng |
| Chữ đặc trưng | hodi: mono cho giờ | **Mono cho mọi nhãn trạng thái và số**: `L2`, `easy`, `3/5`, `~Jun 2027`. Tiêu đề mục dùng chữ thường nhỏ, cách chữ rộng (`tracking-wide`) |
| Hình đặc trưng | Không có | **Đường đi (route line):** một đường 1px với các chấm. Dùng lại ở 3 chỗ: rail nav, danh sách việc trên Today (mỗi việc là một chấm, xong thì chấm đậm), và lộ trình trên `map` |
| Bài tập | cogi: các bước dạng card | **Dạng nhật ký sự cố:** mỗi vòng là một dòng có giờ giả ở lề trái (`02:04`, `02:11`...), font mono, như timeline của một incident. Thông tin AI đưa thêm thụt vào, faint. Câu trả lời của người dùng là ink |
| Kết quả | cogi: đoạn văn phản hồi | 5 tiêu chí là 5 hàng, mỗi hàng 3 ô vuông nhỏ (đầy = điểm). Bên dưới là "your path" và "senior path" đặt **hai cột cạnh nhau** (một cột ở màn hình hẹp) |
| Motion | mora: sheet, row | Chỉ một điểm riêng: **đường đi tự vẽ** (`stroke-dashoffset`, 260ms) khi một việc xong hoặc khi milestone tiến lên. Còn lại dùng pattern chung (sheet, row in/out, check). Không animate lúc tải trang |
| Icon | Tile `#f4f4f1` + mark `#141414` | Giữ tile chung. Mark = 3 chấm nối bằng một đường gấp khúc đi lên |

Giới hạn để vẫn cùng hệ: không màu, không card trong card, bo góc 6-10px, chỉ một nút đậm mỗi màn hình,
hover-reveal theo DESIGN.md. Sau P0, thêm một hàng `navi` vào bảng "Which apps" và "Per app" của `../DESIGN.md`.

---

## 2. Hạ tầng

| | |
|---|---|
| Firebase project | `kyphan38-navi-app` |
| Firestore | `(default)`, `asia-southeast1` |
| Auth | Google, chỉ 1 email (`ALLOWED_USER_EMAIL`) |
| Domain | `navi.kyphan38.com` (Vercel) |
| Functions | `asia-southeast1`, Node 24, secret `GEMINI_API_KEY` (key chung, xem `../SECRETS.md`) |
| Model | `gemini-3.8-flash`, thinking low mặc định. Chỉ chuyển sang `gemini-4-argon` sau khi A/B test (mục 5.3) |
| Emulator | project `demo-navi`, email dev `dev@navi.test` |

**Stage 0** (chủ app tự làm, agent chỉ viết hướng dẫn vào README): giống legi Stage 0, đổi tên thành navi.
Thêm `navi` vào `../sync-gemini-key.sh` và `../SECRETS.md`. Chủ app tự chạy script, agent không đọc key.

### Nav

`today · drill · learn · terms · map · settings`. Đặt ở **rail bên trái** trên màn hình rộng, hàng chữ trên cùng
ở màn hình hẹp (xem mục 1b). Không copy `TopBar` của hodi/fina/logi.

| Trang | Nội dung | Phase |
|---|---|---|
| `today` | Việc học hôm nay + bài tập hôm nay + ôn lại (term, lỗi sai) | P1, hoàn thiện P3 |
| `drill` | Danh sách loại bài tập, lịch sử, sổ lỗi sai | P1, P5 |
| `learn` | Khóa học, plan tuần, weekly review | P3 |
| `terms` | Danh sách term | P2 |
| `map` | Lộ trình, mức kỹ năng, dự báo | P4 |
| `settings` | Profile, Theme, giờ học mỗi tuần | P0 |

---

## 3. Mô hình dữ liệu

Tất cả nằm dưới `users/{uid}/`. Thời gian là epoch ms.

```ts
// src/types/navi.ts

// --- Profile (users/{uid}/meta/profile) ---
export type Profile = {
  role: string;          // "DevOps engineer"
  years: number;         // 2
  context: string;       // "payment app on AWS at a bank". Đưa vào mọi prompt
  focus: string;         // mũi nhọn: "cloud security and reliability for payments"
  hoursPerWeek: number;  // số giờ dự định, chỉ dùng tới khi có đủ 2 tuần số liệu thật
};

// --- Skills (users/{uid}/skills/{skillId}) ---
export type SkillLevel = 0 | 1 | 2 | 3 | 4;
export type Evidence = {
  level: SkillLevel;     // mức mà bằng chứng này mở
  kind: 'module' | 'demo' | 'drill' | 'work' | 'explain';
  ref: string | null;    // id module / drill / term
  note: string;          // <= 500
  at: number;
};
export type Skill = {
  name: string;          // "IAM policy evaluation"
  area: string;          // "Security", "Networking", "Reliability", "Payments", "AI", "Communication"...
  level: SkillLevel;     // tính từ evidence, không sửa tay
  evidence: Evidence[];  // <= 50
  createdAt: number; updatedAt: number;
};

// --- Drills (users/{uid}/drills/{drillId}) ---
export type DrillGroup = 'tech' | 'ai' | 'comms' | 'business' | 'writing';
export type DrillType =
  | 'incident' | 'security-review' | 'why-chain' | 'tradeoff' | 'logs' | 'cost'        // tech
  | 'review-ai-output' | 'brief-an-agent' | 'use-ai-or-not'                            // ai
  | 'three-audiences' | 'say-no' | 'clarify' | 'feedback' | 'status-update'           // comms
  | 'payment-case' | 'business-impact'                                                 // business
  | 'postmortem' | 'cr-risk' | 'prioritize';                                           // writing
export type DrillLevel = 'easy' | 'medium' | 'hard';
export type AnswerKind = 'choice' | 'text' | 'order' | 'command' | 'message';

export type Round = {
  prompt: string;              // câu hỏi + thông tin mới
  kind: AnswerKind;
  options: string[];           // cho 'choice' và 'order', còn lại []. 'choice' luôn có thêm "other" (tự viết)
  hint: string;                // chỉ mức easy, còn lại ''
  answer?: string;             // câu trả lời của người dùng
  reveal?: string;             // AI đưa thêm thông tin sau câu trả lời
};
export type Score = Record<'triage' | 'hypothesis' | 'safety' | 'comms' | 'prevention', number | null>; // 0-3, null = không dùng

export type Drill = {
  group: DrillGroup; type: DrillType; level: DrillLevel;
  topic: string;               // "IAM", "DB connection pool"...
  skillIds: string[];
  clock: string;               // giờ giả lúc bắt đầu, "02:04" (giao diện nhật ký sự cố)
  brief: string;               // đề bài
  rounds: Round[];             // 3-6
  status: 'active' | 'done' | 'dropped';
  score: Score | null;         // tiêu chí không áp dụng thì ẩn (ví dụ 'say-no' không có 'hypothesis')
  debrief: string | null;      // nhận xét
  seniorPath: string | null;   // con đường của senior (cột phải của debrief)
  whatIf: { question: string; answer: string }[]; // 1-2 câu "What if...?" kèm câu trả lời ngắn
  newTerms: string[];          // term xuất hiện trong bài, đưa vào tab Terms
  startedAt: number; doneAt: number | null;
};

// users/{uid}/drillKeys/{drillId}  - đáp án ẩn. Rules: client KHÔNG đọc được, chỉ Functions.
export type DrillKey = {
  truth: string;               // nguyên nhân thật + diễn biến định sẵn
  seniorPath: string;          // các bước một senior sẽ làm
  rubric: string;              // điểm cần có cho từng tiêu chí
  outline: string[];           // mỗi vòng một dòng: hỏi gì, kiểu trả lời nào
};

// --- Mistakes (users/{uid}/mistakes/{id}) ---
export type Mistake = {
  drillId: string; skillId: string | null;
  text: string;                // lỗi sai, 1-2 câu
  lesson: string;              // nên làm gì thay vào đó
  box: 1 | 2 | 3 | 4 | 5;      // Leitner
  nextReviewAt: number;
  createdAt: number;
};

// --- Terms (users/{uid}/terms/{termId}) ---
export type Term = {
  name: string;                // "Permission boundary"
  area: string;
  oneLine: string;             // định nghĩa 1 dòng, tiếng Anh đơn giản
  checklist: { what: boolean; how: boolean; when: boolean; mistakes: boolean; related: boolean };
  status: 'new' | 'learning' | 'known';
  source: 'drill' | 'module' | 'manual';
  sourceId: string | null;
  box: 1 | 2 | 3 | 4 | 5;
  nextReviewAt: number | null; // chỉ khi status = 'learning'
  createdAt: number; updatedAt: number;
};

// --- Courses (users/{uid}/courses/{courseId}) ---
export type ModuleKind = 'lesson' | 'demo' | 'quiz' | 'exam';
export type CourseModule = {
  id: string;
  section: string;             // tên chương
  title: string;
  minutes: number;             // ước lượng, sửa tay được
  kind: ModuleKind;            // 'demo' = bài thực hành (Cantrill có nhãn DEMO)
  skillIds: string[];          // AI gắn tự động
  doneWhen: string;            // "Write 5 lines: when Deny wins over Allow"
  doneAt: number | null;
};
export type Course = {
  title: string;               // "AWS Certified Security - Specialty (Cantrill)"
  goal: string;                // "Pass the exam"
  deadline: number | null;
  modules: CourseModule[];     // <= 600, lưu trong doc (giống sections của legi)
  status: 'active' | 'paused' | 'done';
  createdAt: number; updatedAt: number;
};

// --- Weeks (users/{uid}/weeks/{YYYY-Www}) ---
export type Week = {
  plan: { moduleIds: string[]; drillTopics: string[]; workTask: string | null; explore: string | null };
  minutesPlanned: number;
  minutesDone: number;          // cộng từ days
  review: { done: string; missed: string; why: string } | null;
  createdAt: number; updatedAt: number;
};

// --- Days (users/{uid}/days/{YYYY-MM-DD}, ngày bắt đầu 04:00 như hodi) ---
export type Day = {
  moduleIds: string[];
  drillId: string | null;
  minutes: number;
  note: string;                // 1 dòng
  confidence: 1 | 2 | 3 | 4 | 5 | null;
  updatedAt: number;
};

// --- Milestones (users/{uid}/milestones/{id}) - dùng cho map (P4) ---
export type Milestone = {
  title: string;               // "Pass AWS Security Specialty", "Ready for mid-level"
  kind: 'learning' | 'career';
  needs: { skillId: string; level: SkillLevel }[];   // learning: tính được giờ còn lại
  checklist: { text: string; done: boolean; at: number | null }[]; // career: việc ở công ty
  order: number;
  doneAt: number | null;
};
```

**Rules:** copy khung legi (`allowed()`, `isOwner()`, chặn `/{document=**}`). Viết `validX()` cho từng collection
như legi. `drillKeys`: `allow read, write: if false` (chỉ Admin SDK trong Functions chạm vào).

### 3.4 Luật lên mức kỹ năng

| Mức | Bằng chứng mở mức |
|---|---|
| 1 Know | Xong ít nhất 1 module gắn skill đó (`kind: module`) |
| 2 Do | Xong 1 bài `demo`, HOẶC 1 drill mức medium trở lên có tổng điểm >= 70% |
| 3 Use | Một ghi chú `work` do người dùng nhập ("Used it at work: ...") |
| 4 Teach | Qua bài "Explain it back" (P4): AI đóng vai junior hỏi, chấm đạt |

Mức = mức cao nhất mà mọi mức thấp hơn đều có bằng chứng. Viết trong `src/lib/skill-level.ts`, có unit test.

---

## 4. Tiếng Anh đơn giản (UI + AI)

Lý do: chủ app học tiếng Anh ở mức IELTS 6.0-6.5. Chữ kỹ thuật quá khó dễ làm nản.

- Một hằng số `PLAIN_ENGLISH` trong `functions/src/prompts/style.ts`, ghép vào đầu MỌI prompt:
  ```
  Write in simple English (IELTS 6.0 level).
  Use short sentences, about 20 words or less.
  Use common words. Avoid rare or academic words.
  Keep technical terms (IAM, idempotency, SLO...), but the first time a term appears,
  explain it in plain words in brackets.
  One idea per sentence. No idioms.
  ```
- UI copy: nút 1-2 chữ thường (`start`, `next`, `done`, `copy prompt`). Không câu giải thích dài.
- Test: một unit test kiểm `PLAIN_ENGLISH` có trong mọi prompt builder.

---

## 5. AI (Cloud Functions)

### 5.1 Khung

Copy `access.ts`, `gemini.ts`, `guard()` từ legi/hodi. Mọi callable kiểm email. Output dùng JSON schema,
**mọi key đều required** (nullable nếu cần), vì Flash hay bỏ key optional.
Ghép `Profile.context` vào prompt để bài tập gần với công việc thật, nhưng không bao giờ hỏi dữ liệu nội bộ.

### 5.2 Danh sách callable

| Callable | Phase | Làm gì |
|---|---|---|
| `drillStart` | P1 | Tạo đề + `DrillKey` (đáp án ẩn) + vòng 1. Ghi `drills/{id}` và `drillKeys/{id}` |
| `drillAnswer` | P1 | Nhận câu trả lời vòng n. Đọc `DrillKey`, trả `reveal` + vòng n+1, luôn khớp với `truth` |
| `drillFinish` | P1 | Chấm theo rubric, viết debrief + con đường senior + What if, tách lỗi sai và term mới |
| `termCard` | P2 | Tạo `oneLine` + area cho term mới |
| `termQuiz` | P2 | 3 câu hỏi nhanh, chấm câu trả lời |
| `courseSplit` | P3 | Nhận text mục lục dán vào, trả danh sách module (section, title, minutes, kind, doneWhen, skill) |
| `weekPlan` | P3 | Đề xuất plan tuần (xem 7.3). Phần chia module làm bằng code, AI chỉ chọn chủ đề drill và viết `doneWhen` còn thiếu |
| `explainBack` | P4 | AI đóng vai junior, hỏi 3-4 câu, chấm "đạt / chưa đạt" kèm lỗ hổng |
| `askSenior` | P6 | Vấn đề thật (đã ẩn thông tin) -> trả lời theo khung senior |
| `weeklyDigest` | P6 | Scheduled, sáng Chủ nhật. Dùng Google Search grounding. Kiểm từng link (fetch, status 200) trước khi lưu |
| `postmortemPick` | P6 | Chọn 1 postmortem công khai thật mỗi tuần (grounded), tóm tắt + 2 câu hỏi |

### 5.3 Model

Bắt đầu tất cả bằng Flash low. Trước khi xong P1, chạy A/B nhỏ cho `drillFinish` (chấm điểm + debrief) giữa
Flash low, Flash medium và Argon trên 5 bài mẫu. Chỉ dùng Argon nếu khác biệt rõ. Ghi kết quả vào README.
Argon không có streaming. Timeout mỗi callable 60s.

---

## 6. Bài tập (drill)

### 6.1 Một bài gồm gì

1. **Đáp án ẩn** (`DrillKey`): tạo trước, người dùng không thấy. Câu chuyện không được đổi theo câu trả lời.
2. **Đề bài**: bối cảnh, alert, vài số liệu.
3. **3-6 vòng**: mỗi vòng một kiểu trả lời (`AnswerKind`). Sau mỗi câu trả lời, AI đưa thêm thông tin.
4. **Chấm và so sánh**: 5 tiêu chí (0-3 mỗi tiêu chí, tiêu chí không áp dụng thì ẩn), debrief, con đường senior,
   1-2 câu "What if...?". Lỗi sai vào `mistakes`, term mới vào `terms`.

### 6.2 Mức độ

| Mức | Cách trả lời | Khác |
|---|---|---|
| easy | Chủ yếu `choice`, có nút `hint` | 3-4 vòng |
| medium | Vòng quan trọng là `text`/`command`/`message`, còn lại `choice` | 4-5 vòng |
| hard | Tự viết hết | Thiếu thông tin, có thông tin gây nhiễu, đồng hồ đếm (chỉ hiện số, không nháy) |

**Mở mức:** mỗi loại bài bắt đầu ở easy. Lên medium khi 3 bài easy gần nhất của loại đó đều >= 70%.
Lên hard tương tự từ medium. Người dùng luôn có thể chọn mức thấp hơn. Không bao giờ tự hạ mức.

### 6.3 Các loại bài (19 loại, chia theo nhóm)

| Nhóm | Loại | Ví dụ ngắn |
|---|---|---|
| tech | `incident` | Tỉ lệ giao dịch giảm lúc 2 giờ sáng, có deploy lúc 23:00 |
| | `security-review` | Đoạn Terraform / IAM policy, tìm lỗi |
| | `why-chain` | "S3 bucket is public" -> hỏi dần tầng 1 đến 4 |
| | `tradeoff` | Multi-account hay single account? |
| | `logs` | Đoạn log / bảng số liệu, tìm điểm bất thường |
| | `cost` | Bill AWS tăng 40%, tìm nguyên nhân |
| ai | `review-ai-output` | Code/PR do AI viết có lỗi khó thấy |
| | `brief-an-agent` | Viết spec cho agent soạn Change Request |
| | `use-ai-or-not` | Việc này giao AI, tự làm hay làm cùng? Rủi ro? |
| comms | `three-audiences` | Một sự cố, giải thích cho dev / sếp / người không làm kỹ thuật |
| | `say-no` | Sếp muốn bỏ qua Change Request để release gấp |
| | `clarify` | Ticket mơ hồ, viết câu hỏi cần hỏi lại |
| | `feedback` | Viết lại comment code review cho rõ và lịch sự |
| | `status-update` | Viết cập nhật 3 dòng gửi channel sự cố |
| business | `payment-case` | Khách bị trừ tiền nhưng giao dịch báo fail |
| | `business-impact` | Sự cố 20 phút ảnh hưởng bao nhiêu khách, tiền, tuân thủ? |
| writing | `postmortem` | Viết postmortem ngắn từ một sự cố |
| | `cr-risk` | Viết phần rủi ro + rollback cho một Change Request |
| | `prioritize` | 6 việc, chỉ đủ thời gian làm 3 |

P1 chỉ làm `incident` + `security-review`. P5 làm các loại còn lại.

### 6.4 Bài tập hôm nay

Code chọn (không cần AI): khoảng một nửa số ngày là nhóm `tech`, còn lại xoay vòng 4 nhóm kia.
Chủ đề lấy từ module đang học tuần này (P3). Trước P3 thì lấy từ skill có mức thấp nhất.
Chủ nhật gợi ý một bài `incident` mức cao nhất đã mở.

---

## 7. Học theo khóa học

### 7.1 Làm một lần (khoảng 10 phút)

1. `learn` -> `add course`. Dán mục lục khóa học (copy từ trang khóa học). Nhập goal, deadline.
2. `courseSplit` trả danh sách module. Người dùng xem, sửa phút / bỏ module nếu cần, rồi `save`.
3. Module có chữ "DEMO" (hoặc tương tự) -> `kind: 'demo'`.

### 7.2 Mỗi ngày (khoảng 1 phút)

Today hiện: các module hôm nay (theo thứ tự khóa học, vừa với số phút của ngày), `doneWhen` của từng module,
bài tập hôm nay, và các mục cần ôn (term + lỗi sai đến hạn).
Xong thì tick, ghi 1 dòng, chọn độ tự tin 1-5. Số phút tự cộng từ `minutes` của module, sửa tay được.

### 7.3 Mỗi tuần (Chủ nhật, 5-10 phút)

1. Nhìn lại: xong gì, sót gì, 1 dòng lý do.
2. `src/lib/plan.ts` (code thuần, có unit test) chia module tuần tới:
   - Ngân sách = trung bình phút thật 4 tuần gần nhất (ít hơn 2 tuần số liệu thì dùng `Profile.hoursPerWeek`).
   - Lấy module chưa xong theo thứ tự, tới khi đầy khoảng 70% ngân sách.
   - 20% cho một việc gắn với công ty (người dùng gõ, có thể để trống), 10% cho `explore`.
3. Tính ngày xong khóa học = phút còn lại / ngân sách mỗi tuần. Nếu trễ hơn deadline, hiện:
   `At 5h/week you finish on 15 May, after your deadline (31 Mar).` + 2 nút `more hours` / `move deadline`.
4. Người dùng chỉnh rồi `confirm`.

---

## 8. Terms

- Term vào từ: `newTerms` của drill, module (AI tách khi `courseSplit`), hoặc thêm tay.
- Danh sách nhóm theo `area`, lọc theo `status`. Mỗi dòng: tên + định nghĩa 1 dòng.
- Mở một term: checklist 5 ý, nút `copy prompt`, nút `quiz`, đổi `status`.
- Term `learning` vào hàng ôn (Leitner, mục 10).

**`copy prompt`** tạo text sau (điền `name` và `Profile`), copy vào clipboard:

```
Teach me the term "{name}".

About me: I am a {role} with {years} years of experience. I work on a {context}.

Use simple English (IELTS 6.0 level). Short sentences.
If you use a hard word, explain it in plain words.

Please cover:
1. What it is, in 2-3 sentences.
2. How it works, step by step.
3. When to use it, and when not to use it.
4. A real example from {context}.
5. Common mistakes people make.
6. 3 related terms I should learn next.
7. 3 questions to test me. Wait for my answers before you show the correct ones.
```

---

## 9. Map (trực quan lộ trình)

Mục tiêu: nhìn một lần là biết **mình đang ở đâu**, **còn bao xa**, và **cố thêm thì tới sớm hơn bao nhiêu**.
Vẽ bằng SVG tay, chỉ xám (DESIGN.md: nhiều series thì dùng các bậc xám, có tên bên cạnh).

### 9.1 Ba phần, từ trên xuống

**a) Lộ trình (một đường ngang)**
```
Associate ────●──────────○──────────○────────── Mid ─────────○──────── Senior
           you are here  Security    Own Direct Link
                         Specialty   reliability
                         ~Jun 2027   (checklist 2/6)
```
- Milestone `learning`: có ngày dự báo (9.2).
- Milestone `career`: không có ngày (không đoán được), chỉ hiện checklist `2/6`.
  Danh sách mặc định lấy từ bảng Associate / Mid / Senior (ví dụ: tham gia on-call, viết postmortem,
  sở hữu SLO của một service, viết design doc, mentor người mới, dẫn một dự án). Sửa được.
- Phần đã đi: nét đậm. Phần dự báo: nét đứt.

**b) Bản đồ kỹ năng**
Lưới nhóm theo `area`. Mỗi skill là một hàng 4 ô, ô đã đạt tô đậm theo bậc xám. Hover/nhấn: bằng chứng của từng mức.
Mức vừa tăng trong 7 ngày có chữ nhỏ `new`.

**c) "What if" (cố thêm thì sao)**
Thanh trượt giờ mỗi tuần (2-12h). Kéo thì ngày dự báo của mọi milestone `learning` đổi ngay (code thuần, không AI):
```
At 5h/week (your real average):  Security Specialty  Jun 2027
At 8h/week:                      Security Specialty  Mar 2027   (3 months earlier)
```
Bên dưới: biểu đồ cột nhỏ phút học thật 12 tuần gần nhất, đường ngang = mức đang chọn.

### 9.2 Cách dự báo (`src/lib/forecast.ts`, có unit test)

- Giờ còn lại của một milestone = phút còn lại của module gắn với các skill cần
  + 6 giờ cho mỗi bậc kỹ năng còn thiếu mà không có module nào phủ (hằng số, chỉnh sau khi có số liệu).
- Ngày dự báo = hôm nay + giờ còn lại / giờ mỗi tuần.
- Nếu chưa đủ 2 tuần số liệu: hiện `rough` cạnh ngày.
- Không bao giờ hiện ngày cho milestone `career`.

---

## 10. Ôn lại (term + lỗi sai)

Leitner đơn giản: box 1..5 = 1, 3, 7, 14, 30 ngày. Đúng thì lên box, sai thì về box 1.
Lỗi sai: hỏi lại dưới dạng một câu `choice` ngắn do AI tạo từ `text` + `lesson` (gọi `termQuiz` với mode mistake).
Today hiện tối đa 5 mục ôn mỗi ngày. `src/lib/leitner.ts` có unit test.

---

## 11. Các phase

Mỗi phase: code + unit test + kiểm trên emulator + Playwright ở 360/390/430px (không tràn, không đè).
Xong phase thì commit, hỏi chủ app trước khi làm phase tiếp.

### P0 - Khung (xong 2026-11-13)
Copy khung legi/hodi (danh sách mục 0). Login, AuthGate, TopBar với nav ở mục 2, Settings (Profile + Theme + giờ/tuần),
service worker, icon (tile `#f4f4f1` + mark `#141414`). Các trang khác là trang trống có tiêu đề.
Rules cho mọi collection ở mục 3. README có Stage 0.
**Done:** đăng nhập được trên emulator, đổi theme được, rules test chặn email lạ và chặn đọc `drillKeys`.

### P1 - Bài tập lõi (xong 2026-11-13, chưa A/B model)
`drillStart` / `drillAnswer` / `drillFinish`. Loại `incident` + `security-review`, mức easy + medium.
Trang `drill`: chọn loại -> chọn mức -> làm bài -> debrief. Lịch sử bài đã làm. Today hiện "bài tập hôm nay".
Lưu `mistakes` và `newTerms` (term chỉ lưu tên, P2 mới có UI). A/B model theo 5.3.
**Done:** làm trọn 1 bài mỗi loại mỗi mức trên emulator. Đáp án ẩn không đọc được từ client.
Câu chuyện khớp nhau qua các vòng (kiểm tay 5 bài, ghi kết quả vào README).

### P2 - Terms
Tab `terms`, `termCard`, `termQuiz`, `copy prompt`, Leitner cho term, mục ôn trên Today.
**Done:** term từ drill P1 hiện đúng, copy prompt ra đúng text mục 8, quiz chấm được.

### P3 - Học theo khóa học
`learn`: add course (dán mục lục) -> `courseSplit` -> sửa -> save. Today theo module. Weekly review + `plan.ts`.
Báo trễ deadline. Bài tập hôm nay lấy chủ đề từ module tuần này.
**Done:** dán mục lục mẫu (khoảng 150 bài) -> chia đúng tuần. Unit test `plan.ts`: tuần thiếu giờ, tuần không học,
khóa xong sớm, deadline đã qua.

### P4 - Kỹ năng + Map
`skill-level.ts`, gắn bằng chứng tự động (module, demo, drill), nút `used at work` để thêm bằng chứng mức 3,
`explainBack` cho mức 4. Milestones (mặc định 1 milestone learning theo khóa học + 1 milestone career "Ready for mid-level").
Trang `map` đủ 3 phần mục 9. `forecast.ts`.
**Done:** unit test `skill-level.ts` và `forecast.ts`. Kéo thanh trượt đổi ngày ngay. Map đọc được ở 360px
(lộ trình chuyển thành dọc nếu không vừa).

### P5 - Thêm bài tập
17 loại còn lại (mục 6.3), mức hard, luật mở mức 6.2, chọn bài hôm nay theo 6.4, sổ lỗi sai + ôn lỗi sai.
**Done:** mỗi loại làm thử 1 bài easy. Unit test luật mở mức và chọn bài.

### P6 - Thông tin bên ngoài
`askSenior`, `postmortemPick`, `weeklyDigest` (tối đa 5 mục, chia `inside banking` / `outside`, mỗi mục 1 dòng
"What it means for you", link đã kiểm). Trang 1:1 prep: gom bằng chứng mới, skill vừa lên mức, bài tập đã làm
trong khoảng ngày chọn, thành bản tóm tắt copy được.
**Done:** digest chạy trên emulator với lịch giả, không có link chết. Ask senior từ chối trả lời nếu input có vẻ chứa
dữ liệu nội bộ (tên host, IP, ARN có account id) và nhắc bỏ đi.

---

## Để sau

- Phỏng vấn thử (troubleshooting, system design hạ tầng, behavioral dùng câu chuyện từ bằng chứng).
- Review hàng tháng: AI đọc dữ liệu cả tháng, nói đang tiến bộ ở đâu, đang né việc gì.
- Nhiều khóa học cùng lúc.
- Link vào mora/logi để tính giờ học tự động.
