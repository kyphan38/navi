# navi - Track (MVP)

Chủ app chốt 2026-11-25. Đọc `PLAN-navi.md` (nguyên tắc bất biến mục 1) và `AGENTS.md` trước khi code.

Mục tiêu 1 năm: Middle -> Senior DevOps / Platform. Track là **một chặng ngắn tập trung vào một trụ cột**,
đóng khi đạt chuẩn (không reset theo thứ Hai), kèm heatmap lịch sử bấm được và tổng kết trước-sau.

MVP **không thêm lần gọi AI nào**. Mọi luật là code thuần, có unit test.

**Trạng thái:** MVP xong 2026-11-25 (bước 1-9 mục 8). Unit test, typecheck, lint, `test:rules` qua.
Thử trên emulator 2026-11-26: bắt đầu Track, route, ô kiểm, bấm ô heatmap, đóng Track (not met) ra tổng kết, Map ở 375px.
Chưa thử: một ngày có drill thật (ô đậm) và trang review có mục đến hạn (không có dữ liệu trong emulator).

Ghi chú khi làm:
- `watchDrills` tăng từ 60 lên 200 bài, để heatmap 26 tuần và luật 60 ngày đủ dữ liệu.
- Map đọc 26 tuần `days` (trước là 12) cho heatmap. Dòng giờ trung bình vẫn nằm trong `what if`.
- Track đã đóng không hiện trên route, chỉ hiện trong mục `track`. Track đang chạy là chấm đầu tiên của route.

---

## 0. Quyết định đã chốt

| # | Quyết định |
|---|---|
| 1 | Track = `Milestone` với `kind: 'track'`. Không tạo collection mới |
| 2 | Hạn mềm 4 tuần (`endBy`). Quá hạn thì báo thật, không tự dời |
| 3 | MVP: Track chỉ điều khiển drill. Không lọc module khóa học. `WeekPlanner` giữ nguyên (thời gian) |
| 4 | Luật đóng Track chỉ dựa trên thứ tự luyện được. Level 3/4 không chặn, chỉ hiện là "work-verified" |
| 5 | Area của skill đổi sang 5 trụ cột DevOps/Platform (mục 2) |
| 6 | Heatmap thay biểu đồ 12 tuần trên Map. 3 bậc xám, không streak. Có bộ đếm `reviews` trên `Day` ngay ở MVP |
| 7 | Không xóa skill AI infra. Chỉ loại area `AI infra` khỏi `focusSkills` (để sau 1 năm dùng lại) |

Ưu tiên chủ đề drill hôm nay: **Track > target role (`focusSkills`) > khóa học**.

Ngoài phạm vi MVP (xem mục 9): interview cuối Track, story cuối Track, Track lọc module, gợi ý Track tiếp theo, tổng kết bằng AI.

---

## 1. Nguyên tắc riêng của Track

- Chỉ **một** Track đang chạy (`doneAt === null`) tại một thời điểm.
- Bắt đầu và đóng Track đều do người dùng bấm. App không tự tạo, không tự đóng.
- Không điểm, không huy hiệu, không streak (nguyên tắc 4). Đạt chuẩn chỉ hiện một dòng yên lặng.
- Quá `endBy`: hiện `late · 5d` bằng mono. Không đổi `endBy`, không dồn bài (nguyên tắc 5).
- Bằng chứng tự khai (level 3 "used at work") không bao giờ là điều kiện đóng.

---

## 2. Trụ cột (area mới)

```ts
// src/lib/pillars.ts (pure)
export const PILLARS = [
  'Linux & networking',
  'Containers & Kubernetes',
  'IaC & CI/CD',
  'Observability & reliability',
  'Cloud & security',
] as const;
/** Không bao giờ vào focusSkills. Giữ dữ liệu để dùng lại sau. */
export const PARKED_AREAS = ['AI infra'] as const;
```

Map skill mặc định -> trụ cột (theo id; skill tự thêm không bị đụng tới):

| Trụ cột | Skill id |
|---|---|
| Linux & networking | `linux-perf`, `vpc`, `dns`, `tls`, `load-balancers` |
| Containers & Kubernetes | `containers`, `k8s-core`, `k8s-networking`, `multi-tenancy` |
| IaC & CI/CD | `iac`, `cicd`, `change-management`, `gitops`, `golden-paths`, `release-safety` |
| Observability & reliability | `monitoring`, `observability`, `incident-response`, `slo`, `scaling`, `backup-dr`, `failure-modes`, SRE (2026-11-27): `on-call`, `toil-automation`, `resilience-patterns`, `load-testing`, `chaos-engineering` |
| Cloud & security | `iam-policies`, `iam-roles`, `kms-encryption`, `s3-security`, `network-security`, `secrets`, `audit-logging`, `guardrails` |
| Giữ area cũ (không phải trụ cột) | `databases` (Data), `payment-flows`, `reconciliation` (Payments), `status-updates`, `postmortems` (Communication), `ai-tools` (AI), 5 skill `AI infra` |

**Migrate:**
- `SKILL_CATALOG` đổi area theo bảng trên (người dùng mới có ngay).
- Người dùng cũ: trên Map hiện một dòng `N skills use old areas` + nút `move`. Bấm thì `updateSkill` area cho các skill **id có trong catalog** mà area đang là tên cũ (`Security`, `Networking`, `Reliability`, `Delivery`).
- Không tự migrate, vì người dùng có thể đã tự đổi area bằng `edit`.
- Hàm thuần `pillarMigration(skills)` trả danh sách `{id, area}` cần đổi. Có test.

`focusSkills` (role.ts) bỏ skill có area trong `PARKED_AREAS`.

---

## 3. Data model

### 3.1 Milestone (mở rộng)

```ts
export type Milestone = {
  title: string;
  kind: 'learning' | 'career' | 'track';
  courseId: string | null;
  needs: { skillId: string; level: SkillLevel }[]; // track: 3-5 skill của trụ cột
  checklist: ...;                                   // track: []
  order: number;
  doneAt: number | null;                            // track: lúc bấm close
  // chỉ có khi kind === 'track'
  track?: {
    area: string;               // một trong PILLARS
    rung: 'mid' | 'senior';
    startedAt: number;
    endBy: number;              // startedAt + 28 ngày
    baseline: TrackSnapshot;    // chụp lúc bắt đầu
    summary: TrackSummary | null; // chốt lúc close, không đổi về sau
  };
};

type TrackSnapshot = {
  levels: Record<string, SkillLevel>; // skillId -> level lúc bắt đầu
  drillAvg: number | null;            // % trung bình drill của trụ cột, 60 ngày trước
  openMistakeIds: string[];           // lỗi của trụ cột còn trong Leitner (<= 50)
};
```

`TrackSummary`: xem mục 6.

**Rules** (`validMilestone`):
- `kind in ['learning','career','track']`.
- Key `track` tùy chọn. Khi có thì kiểm `area` str <= 100, `rung in ['mid','senior']`, `startedAt`/`endBy` int,
  `baseline` map, `summary` null hoặc map. Giới hạn kích thước: `openMistakeIds.size() <= 50`.
- Thêm test vào `test:rules` cho milestone track hợp lệ và không hợp lệ.

### 3.2 Day (thêm bộ đếm)

```ts
export type Day = { ...; reviews?: number }; // số lần ôn (term + lỗi sai) trong ngày
```
- `validDay`: thêm `'reviews'` vào `hasOnly`, `!('reviews' in d) || (d.reviews is int && d.reviews >= 0 && d.reviews <= 500)`.
- Mỗi lần bấm `knew it` / `not yet` (term hoặc lỗi sai) gọi `bumpDayReviews(uid, day)`: `setDoc(merge)` với
  `reviews: increment(1)`. Doc Day chưa có thì tạo với đủ key mặc định (giống `tickDay`).

### 3.3 Drill (gắn skill ngay khi tạo)

Hiện drill chỉ được gắn skill khi mở Map (`skillTag`). Track cần biết ngay drill thuộc trụ cột nào.
- `drillStart` nhận thêm `skillId?` (kiểm: có trong `users/{uid}/skills`). Lưu `skillIds: [skillId]`.
- `skillTag` vẫn chạy sau đó và **gộp** thêm skill, không ghi đè.

---

## 4. Luật đạt chuẩn (`src/lib/track.ts`, pure)

"Drill của trụ cột" = drill `done` có ít nhất một `skillIds` thuộc `needs` của Track, `doneAt` trong 60 ngày gần nhất.
"Lỗi của trụ cột" = mistake có `skillId` thuộc `needs`, hoặc có `drillId` là drill của trụ cột.

**Mid:**
1. Mọi skill trong `needs` có level >= 2.
2. >= 3 drill của trụ cột ở mức `medium` hoặc `hard`, mỗi bài >= 70%.
3. Không còn lỗi nào của trụ cột đang đến hạn ôn (`nextReviewAt <= now`).

**Senior** = đủ Mid, cộng:
4. >= 2 drill của trụ cột ở mức `hard`, mỗi bài >= 70%.
5. Ít nhất 1 trong số đó là `tradeoff`, `failure-mode`, `war-room` hoặc `incident`.

Level 3/4 **không** nằm trong luật. Tổng kết hiện chúng là `work-verified` (mục 6).

```ts
export function trackProgress(t, skills, drills, mistakes, now): {
  checks: { label: string; done: boolean; detail: string }[]; // ví dụ "medium drills at 70%+", "2/3"
  met: boolean;
};
```

Test: mỗi điều kiện riêng, ranh giới 70%, ngoài 60 ngày, drill không thuộc trụ cột, senior thiếu loại bài.

---

## 5. Chọn drill hôm nay khi có Track

Sửa `todayDrill` / `TodayView` (logic trong `track.ts`, pure):

| Ngày | Có Track | Không có Track |
|---|---|---|
| Ngày tech (khoảng 50%, theo `typeForDay`) | Loại: Mid giữ `typeForDay`. Senior xoay `tradeoff`, `failure-mode`, `war-room`, `incident`. Chủ đề + `skillId`: xoay skill trong `needs` còn thiếu (level < 2 trước, rồi tới skill ít drill nhất) | Như hiện tại |
| Chủ nhật | `war-room` tuần chẵn, `incident` tuần lẻ, chủ đề của trụ cột | `incident` |
| Ngày ai / comms / business / writing | Giữ nguyên (senior cần giao tiếp) | Giữ nguyên |

**Mức:**
- Mid: `medium` nếu đã mở, không thì `easy`.
- Senior: mức cao nhất đã mở của loại đó.
- Không bao giờ tự hạ mức người dùng đã chọn ở DrillHome.

**Redo:** giữ `redoPick`, nhưng khi có nhiều bài đến hạn thì ưu tiên bài của trụ cột.
**Ôn lỗi:** giữ nguyên trang review (tối đa 5 mỗi ngày), sắp lỗi của trụ cột lên trước.

Tỉ lệ thực tế, không cần bộ máy tính: khoảng 60% đi sâu trụ cột, 25% vá lỗi (redo + review), 15% bài thực tế
(postmortem replay, Ask "practice this").

---

## 6. Tổng kết trước-sau

`trackSummary(t, skills, drills, mistakes, now): TrackSummary` (pure), ghi vào `track.summary` lúc bấm `close`.

```ts
type TrackSummary = {
  met: boolean;                       // đạt luật mục 4 lúc đóng
  days: number;                       // startedAt -> close
  late: boolean;                      // close sau endBy
  levels: { skillId: string; name: string; before: SkillLevel; after: SkillLevel; workVerified: boolean }[];
  drillAvg: { before: number | null; after: number | null }; // after = drill của trụ cột trong lúc Track
  drills: { easy: number; medium: number; hard: number };   // làm trong lúc Track
  mistakesFixed: number;              // id trong baseline.openMistakeIds, giờ nextReviewAt === null
  mistakesNew: number;                // lỗi của trụ cột tạo trong lúc Track
  redo: { topic: string; before: number; after: number }[]; // cặp redoOf trong lúc Track
};
```

`workVerified` = skill có level >= 3 lúc đóng.

---

## 7. Giao diện

### 7.1 Map: mục `track` (component mới `src/components/map/Track.tsx`)

Đặt ngay dưới route, trên `what if`.

**Không có Track đang chạy:**
- Danh sách 5 trụ cột, mỗi dòng: tên + mono `mid done` / `mid 2/3` (dùng `trackProgress` với rung mid).
- Chọn trụ cột -> chọn `mid` / `senior` (mặc định `senior` nếu trụ cột đã đạt mid).
- `needs` chọn sẵn: tối đa 5 skill của trụ cột có level thấp nhất. Bỏ chọn được.
- Một nút đậm `start`. Ghi milestone + baseline.

**Đang chạy:**
- `Containers & Kubernetes · senior` + mono `day 9/28` hoặc `late · 5d`.
- Các dòng `checks` từ `trackProgress` (ô vuông nhỏ như milestone career).
- Đạt hết: một dòng `ready to close`. Nút `close` luôn có (đóng khi chưa đạt thì `met: false`).

**Đã đóng:** liệt kê các Track cũ (mới nhất trước), bấm mở tổng kết mục 6:
level trước -> sau, `work-verified`, điểm drill trước -> sau, lỗi đã vá, redo cũ -> mới.

`MapRoute` hiện Track đang chạy là một chấm, nhãn ngắn là tên trụ cột, ngày = `endBy`.
`forecast.ts`: `minutesLeft` của track = 0 (không dự báo giờ, chỉ có `endBy`).

### 7.2 Today

- Dòng drill hiện chủ đề như hiện tại. Có Track thì thêm mono faint tên trụ cột ngắn.
- Không thêm khối mới trên Today.

### 7.3 Heatmap (thay `WeekBars` trong `MapWhatIf`)

- `src/lib/heatmap.ts` (pure, có test): `heatCells(days, drills, interviews, today, weeks = 26)`.
- 26 cột (tuần) x 7 hàng (thứ Hai -> Chủ nhật). Ô khoảng 10px, khe 2px: vừa 360px.
- 3 bậc xám:
  - trống: không có gì;
  - nhạt: chỉ có học hoặc ôn (`minutes > 0`, `moduleIds`, `reviews > 0`);
  - đậm: có drill `done` hoặc interview `done` trong ngày.
- Bấm một ô: danh sách hiện **ngay dưới lưới** (không tooltip), ví dụ:
  `modules 2 · 45m`, `drill · war room · checkout errors · 78%`, `reviews 6`, `note: ...`. Bấm lại để đóng.
- Không số đếm chuỗi ngày, không chữ khen.
- Dòng tổng `hours a week` của `WeekBars` cũ giữ lại thành một dòng mono dưới heatmap (trung bình 4 tuần), vì `what if` cần.

---

## 8. Việc phải làm (theo thứ tự)

1. `pillars.ts` + đổi area trong `SKILL_CATALOG` + `pillarMigration` + nút `move` trên Map. `focusSkills` bỏ `PARKED_AREAS`.
2. Types + rules: `Milestone.kind 'track'` + `track`, `Day.reviews`. Test rules.
3. `bumpDayReviews` gọi từ trang review.
4. `drillStart` nhận `skillId`; `skillTag` gộp skill.
5. `track.ts`: `trackProgress`, `trackSummary`, `trackDrillPick`, baseline. Unit test đủ mục 4, 5, 6.
6. `heatmap.ts` + `map/Heatmap.tsx`, thay `WeekBars`.
7. `map/Track.tsx` + nối `MapRoute`, `forecast.ts`, `TodayView`, redo và review ưu tiên trụ cột.
8. Guide page (`src/app/(main)/guide/page.tsx`): mục track, heatmap, trụ cột.
9. `PLAN-navi.md`: thêm dòng ở "Để sau" trỏ tới file này, đánh dấu xong khi làm xong.

**Done khi:**
- `npm test`, `npm run typecheck`, `npm run fn:typecheck`, `npm run test:rules`, lint đều qua.
- Trên emulator (cần Java 21): bắt đầu 1 Track, làm 1 drill từ Today có `skillIds` ngay, ôn 1 lỗi thì ô hôm nay
  trên heatmap thành nhạt, close Track ra tổng kết đúng. Map đọc được ở 360px.
- Các file mới dưới khoảng 500 dòng. Không em dash. Chữ UI theo IELTS 6.0-6.5, tối thiểu.

---

## 9. Để sau (Phase 2)

- Interview cuối Track: `interview.ts` nhận `topic` (trụ cột) + mức senior. Điểm từng câu thành điều kiện senior tùy chọn.
- Story cuối Track: gợi ý `storyDraft` từ drill tốt nhất của Track.
- Track lọc module: `WeekPlanner` ưu tiên module đã gắn skill của trụ cột.
- Gợi ý Track tiếp theo từ gaps của target role.
- Đoạn tổng kết bằng AI (giống `monthlyReview`), nếu bản bằng code thấy chưa đủ.
