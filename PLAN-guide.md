# PLAN-guide (navi)

Mục tiêu: app tự chỉ flow cho người dùng, không tour, không popup.
Mockup: `ws/app/guide-mockup.html` (navi rail A). Giữ nguyên theme gray-only.
Branch `feat/guide` (worktree `ws/app/navi-guide`). Hỏi owner trước khi merge.

## G1 - Rail A

- Rail rộng ~14rem, nền surface + hairline phải.
- Mỗi place là một nhóm: tên nhóm nhỏ màu faint, các trang con là các dòng
  trên route line có chấm (giữ dấu riêng của navi: mono 13px, chấm đậm = đang ở).
- Dòng đang ở: chữ ink + nền surface 2 nhạt.
- Số nhỏ bên phải: `review` = số mục đến hạn (terms + mistakes, tối đa 5 như Today).
- Settings ghim ở đáy.
- Phone: giữ hàng chữ ngang như cũ.
- PageHead: desktop chỉ hiện tên trang đang mở (rail đã có hàng trang con);
  phone vẫn hiện hàng trang con.
- `lib/nav.ts`: thêm label cho place có một trang, giữ URL cũ.

## G2 - Dòng lộ trình (loop line)

- `lib/loop.ts` (pure, có test): từ trạng thái hôm nay ra các bước
  `drill · basics · review`, mỗi bước done / on / todo.
- Hiện trên trang drill, basics, review: chấm trên một đường ngang, mono 12px.
  Bước đã xong chấm xám, bước đang ở chấm đậm.
- Dùng cùng dữ liệu với Today (useTodayDrill, useBasicsLine, useTerms).

## G3 - Hint nhạt dần

- `lib/hint.ts` (pure, có test): số lần xem -> `full` (1-3), `short` (4-6), `gone` (7+).
- Đếm theo từng hint, lưu localStorage (`navi.hints`), mỗi lần mở trang tính 1.
- `Hint` component: xl trở lên nằm ở lề phải (ghi chú lề), nhỏ hơn thì 1 dòng
  dưới tiêu đề, có vạch hairline bên trái.
- Settings: dòng `Hints: on · off · reset`.
- Hint đầu tiên: Debrief, Review, Terms, Map.

## G4 - Where this went (Debrief)

- Cuối Debrief: các dòng số thật
  - `N terms` -> terms
  - `N mistakes` -> review, ngày đến hạn
- Mỗi dòng bấm được để mở trang đó.

## Kiểm tra

- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Mở app (dev:e2e hoặc emulator), xem rail desktop + phone, light + dark.
- Cập nhật `/guide` và DESIGN.md (bảng nav).
