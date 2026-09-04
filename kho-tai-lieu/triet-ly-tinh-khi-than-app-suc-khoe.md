# Triết lý "Tinh - Khí - Thần" & Đặc tả tích hợp App Sức Khỏe

Tài liệu thiết kế tích hợp hệ sinh thái "Hiểu Để Khỏe Mạnh" với triết lý Đông phương Tinh - Khí -
Thần, chị Quỳnh gửi 2026-08-31. Dùng làm khung tham chiếu (triết lý nền + logic sản phẩm) khi xây
hoặc mở rộng các app trong hệ sinh thái Hiểu — không chỉ riêng `suc-khoe/`, các sản phẩm khác về sau
nếu đụng tới chủ đề sức khỏe/năng lượng/tâm thức đều có thể tham chiếu lại tài liệu này.

> Xem [ghi chú áp dụng cho `suc-khoe/` hiện tại](#ghi-chú-áp-dụng-cho-app-suc-khoe-hiện-tại-2026-08-31)
> ở cuối file — phần đối chiếu cụ thể cái gì đã có, cái gì có thể thêm, cái gì nên bỏ qua.

---

## PHẦN A — TÀI LIỆU THIẾT KẾ TÍCH HỢP (bản tổng quan)

### 1. Tổng quan chiến lược hợp nhất hệ triết lý

Sức khỏe không phải là một trạng thái tĩnh, mà là kết quả của dòng chảy năng lượng liên tục bên
trong "Ngôi nhà số 1" (Thân - Khẩu - Ý). Việc hợp nhất công nghệ số với cổ học phương Đông nhằm mục
đích kiến tạo một hệ sinh thái rèn luyện nội lực chủ động, thay vì chỉ theo dõi các chỉ số sinh học
bị động. Trọng tâm chiến lược là đưa người dùng thoát khỏi trạng thái "Số 4" (uể oải, trì trệ, ngủ
nhiều nhưng không có lực) để dịch chuyển về trạng thái "Số 10" (vui vẻ, hiệu quả, tỉnh táo) thông qua
việc nhận diện và điều chỉnh các mô thức nghiệp (Karma) trong Tàng thức.

**Bảng đối chiếu Hệ sinh thái Hiểu & Tam Bảo (Tinh - Khí - Thần)**

| Tính năng hiện hữu | Thành tố Tam Bảo | Vai trò trong rèn luyện nội lực |
|---|---|---|
| Kiểm tra tuần (Check-in) | Tinh (Thân) | Nhận diện sự hao hụt "sáp nến" (vật chất) và các mô thức "Tự gồng". |
| Lịch trình thực chứng | Khí (Khẩu) | Khai thông uất nghẽn khí lực, phá vỡ "Nghiệp Né tránh". |
| Thư viện tra cứu | Thần (Ý) | Định vị sự hiện diện, giải mã "Nghiệp Nổi giận/Tự ti" từ gốc rễ tâm thức. |

Sự nhất quán "Trong - Ngoài" này giúp hệ thống không chỉ là một công cụ tracking, mà trở thành
"Chiếc gương tâm thức" giúp người dùng nhìn rõ các điểm rò rỉ nội lực để "chọn lại sớm hơn".

### 2. Module 1: Siêu Âm Sức Khỏe Hàng Tuần (Weekly Check-in)

Nhận diện (Recognition) là "chìa khóa" đầu tiên để dừng vòng lặp rò rỉ năng lượng. Module này đo
lường 3 chỉ số năng lượng cốt lõi để tìm ra "Lớp cắt sự thật" đằng sau các biểu hiện bệnh lý.

**A. Bộ chỉ số Tinh (Thân) — "Độ hao mòn sáp nến"**
- Câu hỏi trắc nghiệm: Tần suất mỏi lưng gối, rụng tóc, uể oải dù ngủ đủ? Bạn có đang cố duy trì
  hình ảnh hoàn hảo dù bên trong đã kiệt quệ?
- Lớp cắt sự thật: Kết nối biểu hiện suy nhược với Nghiệp Tự Gồng. Người dùng đang tiêu tốn năng
  lượng để diễn vai diễn không có thật, khiến "sáp nến" Tinh lực bị đốt cháy vô ích.

**B. Bộ chỉ số Khí (Khẩu) — "Độ uất nghẽn khí lực"**
- Câu hỏi trắc nghiệm: Tần suất thở nông, tức ngực, hay thở dài, vai gáy căng cứng? Bạn có đang trì
  hoãn việc nhìn vào con số tài chính hoặc nói thật trong quan hệ?
- Lớp cắt sự thật: Kết nối uất nghẽn vùng ngực với Nghiệp Né Tránh. Sự trốn tránh sự thật (tiền bạc,
  mối quan hệ) tạo ra áp lực âm thầm trong Tàng thức, gây nghẽn dòng chảy Khí lực.

**C. Bộ chỉ số Thần (Ý) — "Độ tán loạn tâm trí"**
- Câu hỏi trắc nghiệm: Tần suất độc thoại nội tâm, bồn chồn hoặc lướt điện thoại để "tê liệt cảm
  xúc"? Bạn có cảm thấy mâu thuẫn nội tại hoặc hay phán xét bản thân?
- Lớp cắt sự thật: Kết nối sự tán loạn với Nghiệp Nổi Giận hoặc Nghiệp Tự Ti. Tâm trí không hiện
  diện ở hiện tại do bị kẹt trong các mô thức phản ứng cũ.

**Logic chẩn đoán (phân loại nguyên nhân)**
- Nội nhân: Thất tình lục dục tàn phá tạng phủ (Giận hại Gan, Lo hại Tỳ, Sợ hại Thận).
- Ngoại nhân: Tác động của Lục tà (Phong, Hàn, Thử, Thấp, Táo, Hỏa) khi chính khí suy giảm.

Dữ liệu chẩn đoán từ "Siêu âm" sẽ tự động thiết lập "Lịch trình thực chứng" cá nhân hóa để xử lý
đúng điểm nghẽn.

### 3. Module 2: Lịch Trình Đồng Hành Thực Chứng (Companion Schedule)

Thực chứng (Thân nghiệp) là tiến trình dùng hành động mới để ghi đè mô thức cũ. Lịch trình bám rễ
vào Tam Bảo để dịch chuyển năng lượng từ dưới dòng (Số 4) lên trên dòng (Số 10).

**A. Module Bế Tinh (bảo tồn tài nguyên)**
- Quả dục: Giảm 20% các thói quen vượt ngưỡng (ăn quá no, làm quá sức).
- Giờ sinh học: Ngủ sớm trước 23h để hồi phục Tinh huyết.
- Dắt nhiệt xuống Đan điền: Ngâm chân nước ấm mỗi tối.
- Trigger tắt máy: Pop-up hiển thị lúc 22h: "Hôm nay đủ rồi" — mệnh lệnh dừng để bảo vệ "sáp nến".

**B. Module Dưỡng Khí (khai thông năng lượng)**
- Hơi thở bụng: Thực hành 3 phút (Sáng - Tối) để sạc khí lực.
- 5 Thức Suối Nguồn Tây Tạng: Rèn luyện sự dẻo dai và lưu thông kinh mạch.
- Đi bộ hiền: Đi chậm, chú tâm vào bước chân để tránh "Tiêu khí" (dissipation).
- Cảnh báo an toàn (UX Warning): "Tuyệt đối không tắm nước lạnh ngay sau khi tập".

**C. Module An Thần (làm sạch tâm trí)**
- Nghi thức "Tắt Tâm" (10 phút): Thả lỏng toàn bộ cơ Hàm - Vai - Bụng.
- Nước ấm buổi sáng: Nghi thức kết nối cơ thể vật lý và thiên nhiên ngay khi thức dậy.

Phân tích "So What?": Những hành động nhỏ nhưng liên tục này giúp tạo ra một "khoảng dừng nhỏ" giữa
kích hoạt và phản ứng, giúp người dùng không rơi vào phản ứng tự động (Nghiệp phản ứng) mà tiến tới
sự thong dong, nhẹ nhàng của trạng thái Số 10.

### 4. Quy trình chốt chặn vật lý với sản phẩm Unicity

Triết lý cốt lõi: **"Tỳ Vị là gốc của Khí hậu thiên"**. Nếu hệ tiêu hóa (Tỳ Vị) chứa đầy "rác" (độc
tố/ký sinh trùng), mọi nỗ lực dưỡng Khí hay An thần đều sẽ bị rò rỉ và kém hiệu quả.

Hệ thống thiết lập một logic bắt buộc: Khi Tỳ Vị tắc nghẽn, việc thực chứng tâm thức bị tạm dừng để
ưu tiên dọn dẹp vật lý.

| Chỉ số Check-in (Đỏ) | Điểm nghẽn vật lý | Giải pháp chốt chặn (Unicity) |
|---|---|---|
| Tinh < 4 (kiệt quệ, mệt mỏi) | Hệ tiêu hóa quá tải rác thải | Thải độc ruột (Nature's Tea/Fiber): dọn rác Tỳ Vị để thông van năng lượng |
| Khí < 4 (u uất, thở nông) | Ký sinh trùng gây rò rỉ nội lực | Thải độc ký sinh trùng (Paraway Plus): loại bỏ yếu tố tiêu hao sinh mệnh lực ngầm |

Chỉ thị: Nếu người dùng báo cáo biểu hiện "Tỳ Vị tắc nghẽn" (đầy bụng, táo bón, nặng nề), App hiển
thị: *"Dòng năng lượng đang bị chặn tại Tỳ Vị. Hãy hoàn thành pha Thải độc trước khi tiếp tục lộ
trình rèn luyện cao cấp."*

### 5. Cấu trúc dữ liệu & giao diện người dùng (đề xuất)

- **Energy-Meter**: hiển thị 3 chỉ số Tinh - Khí - Thần dạng số (1-10) + Heatmap Đỏ-Xanh theo chu
  kỳ 21 ngày.
- **Nhiệm vụ thực chứng**: checklist chia 3 nhóm (Bế Tinh, Dưỡng Khí, An Thần) kèm giờ nhắc (đồng hồ
  sinh học).
- **Thư viện "Lớp cắt sự thật"**: tra cứu nhanh biểu hiện bệnh lý kết nối với 5 Trụ cột (Thân tâm,
  Cội nguồn, Mối quan hệ, Tài chính, Thuận pháp).

**Logic "Nhịp dừng" (Stop-Point Trigger)**
- Trigger: 3 ngày liên tiếp check-in cảm xúc "Nổi giận" hoặc "Né tránh" cao.
- Output: màn hình đen 5 giây, dòng chữ *"DỪNG LẠI - THỞ 3 NHỊP - CHỌN LẠI"*.
- Mục tiêu: phá vỡ mô thức phản ứng tự động trong Tàng thức bằng công nghệ.

---

## PHẦN B — GIẢI PHẪU TINH · KHÍ · THẦN (chi tiết từng trụ)

### I. TINH (Jing) — "sáp nến" (nguyên liệu vật lý & nền tảng sinh học)

Tinh là phần tinh hoa cô đặc nhất của con người, là chất liệu tạo hình cụ thể để xây dựng nên cơ thể
vật lý bao gồm xương, tủy, răng, móng, máu và toàn bộ tế bào sinh học. Tinh được ví như sáp và bấc
của một ngọn nến. Sáp nến dồi dào thì nến cháy được lâu; sáp nến cạn kiệt thì ngọn đèn sinh mệnh sẽ
lập tức chao đảo trước gió.

**Cấu trúc lưỡng cực**
- *Tinh Âm* (hữu hình): tiềm năng vật chất chịu trách nhiệm sản sinh tế bào mới, tái tạo tủy xương,
  lọc máu, sản sinh dịch cơ thể. Ăn uống sạch, tập luyện, ngủ nghỉ điều độ giúp làm chậm quá trình
  "đốt cháy" Tinh Âm.
- *Tinh Dương* (vô hình): tia năng lượng sống, xung lực bùng phát ẩn bên trong Tinh Âm. Tinh Âm bồi
  đắp được bằng dinh dưỡng hậu thiên, còn Tinh Dương là năng lượng bẩm sinh cực khó thay thế từ
  bên ngoài.

**Nguồn gốc**
- Tinh Tiên Thiên (bẩm sinh): từ tinh cha huyết mẹ lúc thụ thai, mang mã di truyền dòng họ — nguồn
  vốn cố định, vơi dần theo năm tháng.
- Tinh Hậu Thiên (dinh dưỡng): Tỳ chuyển hóa từ tinh hoa thức ăn, Phế thu nạp từ dưỡng khí hít thở
  hàng ngày để sạc lại liên tục cho cơ thể.

**Bệnh lý và biểu hiện hao tổn**: "Nam tổn thọ ở Dục" — không chỉ quan hệ nam nữ vô độ khiến thận
tinh rò rỉ âm thầm, mà thời hiện đại "Dục" chính là ham muốn vượt ngưỡng của bản ngã: ham cày cuốc
làm việc quá sức để chứng tỏ bản thân, ham lướt mạng xã hội sát giờ ngủ, ham dùng caffeine dồn dập
để ép cơ thể chạy quá công suất.

Tín hiệu cảnh báo (tự siêu âm):
- Thức dậy dã rời, "ngủ đủ giờ nhưng không đủ lực".
- Đau mỏi thắt lưng, mỏi gối, chân chùng, gân xương co rút.
- Mắt khô, giảm thị lực nhanh, móng tay móng chân khô khốc.
- Trí nhớ rơi rụng, tóc rụng bạc sớm, răng có cảm giác đau lung lay.

**Giải pháp thực chứng — nhiệm vụ "Bế Tinh"**
- *Quả Dục* (giảm chỗ rò): chọn đúng 1 thói quen vượt ngưỡng (vd thức khuya lướt điện thoại thêm
  1 tiếng) và cắt giảm 20-30% áp lực đó để đóng van rò rỉ.
- Vá Tinh bằng 3 thói quen ấm áp:
  1. Ngủ đều nhịp sinh học — giờ lên giường cố định để cơ thể khôi phục niềm tin, tự sửa chữa tế bào
     sâu.
  2. Giữ ấm lưng và chân trước khi ngủ — ngâm chân nước ấm 10 phút, đi vớ mỏng để kéo nhiệt lượng
     xuống đan điền, xoa dịu hệ thần kinh.
  3. Nói câu "Hôm nay đủ rồi" trước khi ngủ — nghi thức đóng lại một ngày, buông bảng việc cần làm để
     sáp nến không bị đốt lén trong đêm.

### II. KHÍ (Qi) — "ngọn lửa" (năng lượng chuyển hóa & động lực sống)

Khí là năng lượng sống vô hình, là động lực thúc đẩy mọi hoạt động co bóp của tim, tuần hoàn máu, hô
hấp của phổi và chuyển hóa thức ăn thành dinh dưỡng. Khí giống như ngọn lửa thúc đẩy ngọn nến cháy
sáng.

**Cơ chế vận hành**: lực nội sinh từ gió (cung Tốn) phía trên lồng ngực đưa xuống thổi bùng ngọn lửa
ở Tâm hỏa (Tim) và huyệt Mệnh Môn (vùng thắt lưng), hóa Tinh ở bể Thận (vùng bàng quang và Đan Điền,
dưới rốn 3 phân) thành Khí bay lên, chạy dọc khắp kinh mạch tạo ra năng lượng cơ thể.

**Cơ chế uất khí**: "Nữ tổn thọ ở Uất" — uất là sự uất ức, kìm nén cảm xúc oán giận, tủi thân mà
không dám nói ra. Cảm xúc tiêu cực làm nhiễu loạn đường đi của khí tàn khốc: giận làm khí bốc lên,
buồn làm khí tiêu tán, lo nghĩ làm khí kết lại, sợ làm khí hạ xuống. Uất lâu ngày khiến Can khí bị
thắt lại không sơ tiết, sinh ra mệt mỏi kinh niên dù xét nghiệm chỉ số vật lý hoàn toàn đẹp.

Tín hiệu cảnh báo "Khí suy, uất kết":
- Người nặng nề, lờ đờ, thở nông (hơi thở ngắn chỉ lên tới ngực rồi dừng).
- Thường xuyên muốn thở dài bộc phát (tiếng kêu cứu của cơ thể đòi xả căng).
- Đau tức ngực, đau tức hai bên hạ sườn, vị trí đau không cố định.
- Đau vai gáy kinh niên, rối loạn tiêu hóa (ăn xong bụng ấm ách, đầy hơi).

**Giải pháp thực chứng — nhiệm vụ "Dưỡng Khí"**
- *Phép Đạo Dẫn* (kích hoạt Tiểu Chu Thiên): tư thế ngồi tĩnh tọa, lưng thẳng mềm như cây trúc, ngậm
  chặt hàm răng, đầu lưỡi ấn lên vòm miệng đóng "cửa trên", nhíu thắt hậu môn nhẹ để khí đi qua huyệt
  Trường Cường ("cửa dưới"), đả thông kinh mạch vòng Tiểu Chu Thiên giúp khí huyết tự lưu thông.
- *5 Thức Suối Nguồn Tây Tạng*: khai mở 7 luân xa, đả thông huyệt đạo, tăng dẻo dai sinh học. Tập
  đúng biên độ kết hợp hơi thở sâu-thâm-trường-quân-tĩnh, tăng dần từ 5 lên 21 lần/thức. **Lưu ý cốt
  tử**: tuyệt đối không tắm nước lạnh ngay sau khi tập (bít lỗ chân lông, khí huyết tắc nghẽn ngược
  vào trong) — nghỉ tự nhiên 30 phút rồi tắm nước ấm để xả độc tố.
- *Đi Bộ Hiền*: 20-30 phút/ngày, nhịp nhẹ, vừa đi vừa nói chuyện được. Tuyệt đối tránh đi nhanh đến
  mức thở dốc, tim đập thình thịch — đó là "tiêu khí" (đốt cháy sinh lực dự trữ) khiến cơ thể kiệt
  quệ hơn.
- *Chăm sóc "bếp lò" Tỳ Vị* (Tỳ Vị là gốc của khí hậu thiên): ăn no 7 phần, nhai kỹ, ăn chậm, tắt màn
  hình khi ăn; uống nước ấm buổi sáng; khi mệt/bốc hỏa khí (mọc mụn, nóng trong) ưu tiên thực vật
  tính âm, tránh nhiều thịt (tính dương cao) khiến tỳ vị quá tải sinh độc khí — **đây là điểm chốt tự
  nhiên để lồng ghép bộ giải pháp Unicity**.

### III. THẦN (Shen) — "ánh sáng tỏa ra" (trí tuệ, ý thức & sự định vị bản thể)

Thần ngự ở tạng Tâm (trái tim), là trạng thái cao nhất của năng lượng nội sinh — đại diện ý thức, trí
sáng suốt, trí nhớ, phong thái tinh anh, tuệ giác. "Còn Thần thì sống, mất Thần thì chết."

**Bản chất tổn hao**: Thần thích sự tĩnh lặng và một trái tim bình tĩnh. Kẻ tàn phá Thần khốc liệt
nhất là "Tâm lăng xăng" và những cuộc độc thoại miên man không dứt trong đầu. Khi tâm trí liên tục
vọng tưởng chuyện quá khứ hoặc lo lắng chuyện tương lai, Thần bị tán loạn, không thể an ngụ trong cơ
thể.

Tín hiệu cảnh báo "Thần tán":
- Ánh mắt bơ phờ, lờ đờ, mất thần sắc tinh anh.
- Mất ngủ kinh niên, ngủ chập chờn, hay mơ mộng bồn chồn.
- Tâm lý dễ hoang mang, bấp bênh, dễ cáu gắt hoặc buồn bã vô cớ.
- Mất kết nối với chính mình, luôn phải tìm điện thoại/game để "gây tê" cảm xúc.

**Giải pháp thực chứng — nhiệm vụ "An Thần - Tồn Thần"**
- *Tồn Thần Thanh Tâm*: tắt toàn bộ màn hình điện thoại trước khi ngủ 30 phút để thần không bị dắt
  đi.
- *Nghi thức "Tắt Tâm" 10 phút/ngày*: ngồi thẳng lưng nhẹ nhàng (không gồng), thở chậm 12 nhịp (thở
  ra dài hơn hít vào để gửi tín hiệu "an toàn" cho hệ thần kinh thực vật), tháo gỡ 3 nút thắt vật lý:
  1. Thả lỏng Hàm — hàm căng thì đầu căng.
  2. Thả lỏng Vai — đặt xuống gánh nặng gồng gánh trách nhiệm của Nghiệp tự gồng.
  3. Thả lỏng Bụng — thôi gồng lên để tỏ ra mạnh mẽ, để bụng dưới phồng xẹp tự nhiên theo hơi thở.

### IV. Bản đồ kết nối hệ thống Tinh - Khí - Thần

Vòng lặp liên hoàn (mỗi bước kéo theo bước sau):

```
[LO LẮNG, TÂM LĂNG XĂNG] → Thần bị tán loạn
        ↓
[NGỦ CHẬP CHỜN, THỨC KHUYA] → Tinh không thể hồi phục (Thận suy)
        ↓
[TỲ VỊ SUY YẾU, KHÔNG SINH ĐỦ LỰC] → Khí bị suy kiệt, ứ trệ (mệt mỏi, u uất)
        ↓
[CƠ THỂ KIỆT QUỆ] → lại càng lo âu, sợ hãi, bế tắc (Thần càng tán) — quay lại bước 1
```

**Điểm chạm tích hợp Unicity**: khi Tỳ Vị (hệ tiêu hóa) bị tắc nghẽn bởi độc tố và ký sinh trùng,
"bếp lò" cơ thể không thể nấu thức ăn thành Khí lực. Giải pháp Thải độc chuyển hóa của Unicity chính
là bước "lọc rác vật lý" trực tiếp tại tạng Tỳ và Vị, giúp quá trình hấp thụ tinh hoa hậu thiên hóa
thành Khí lực khỏe mạnh diễn ra nhanh gấp đôi, mở khóa van năng lượng cho toàn bộ hệ thống.

---

## PHẦN C — ĐẶC TẢ KỸ THUẬT (bản dành cho Dev Team, chi tiết hơn Phần A)

### 1. Định vị chiến lược & Sơ đồ phễu hệ sinh thái Hiểu (8 tầng)

Web App không đơn thuần là ứng dụng theo dõi sức khỏe, mà là nền tảng định lượng tâm thức. Web App
định vị tại **Tầng 1 (FREE)** — "bộ lọc năng lượng" và phễu thu hút dựa trên giá trị thực chứng
trước khi dẫn người dùng sâu hơn:

1. **Tầng 1 (FREE — Web App)**: công cụ chẩn đoán, siêu âm năng lượng hằng tuần, lập trình
   micro-habits.
2. **Tầng 2**: Vòng tròn giải nghiệp (cộng đồng 5-7 người).
3. **Tầng 3**: Đào tạo chuyên sâu Nhân sinh quan & 5 Trụ cột bản thể.
4. **Tầng 4 (Physical Barrier — Unicity)**: chốt chặn vật lý — thải độc tỳ vị, cân bằng chuyển hóa.
5. **Tầng 5 (Business Partner)**: khởi nghiệp tâm thức, đại sứ lan tỏa hệ giá trị.
6. **Tầng 6-8**: chuyên gia tư vấn (thiện tri thức), quản trị vận mệnh, tự do tuyệt đối.

**North Star Metric**: dịch chuyển người dùng từ **Trạng thái 4** (dưới dòng — uể oải, làm việc
không đầu đuôi, cơ chế "an toàn giả tạo" của Tàng thức để né tránh sự thật/áp lực) lên **Trạng thái
10** (trên cầu — sảng khoái, hiệu quả, nhẹ nhàng, thuận lợi, không cần cưỡng cầu).

### 2. Kiến trúc dữ liệu Module Siêu Âm Năng Lượng (đề xuất field, KHÔNG phải schema đã chốt)

| Bộ chỉ số | Field | Kiểu | Logic |
|---|---|---|---|
| Tinh | `physical_leakage_score` | Scale 1-10 | Mức độ vượt ngưỡng (thức đêm, lao lực) |
| Khí | `energy_stagnation_type` | Enum | `{can_uat, tho_nong, lo_nghi_ket_khi}` |
| Thần | `bio_cycle_index` | Float | Tỷ lệ hoàn tất nghi thức sinh học (ngủ đúng giờ, uống nước ấm) |
| Tổng | `karma_score` | Integer | Điểm tổng hợp trên 5 Trụ cột năng lượng |

**Thuật toán detect "Né tránh sự thật"**: nếu `karma_score < 4` liên tục 3 ngày kèm trạng thái
"buồn ngủ/uể oải" → flag `[Né tránh - Defense Mechanism]`. Diễn giải: Tàng thức đang yêu cầu cơ thể
"ngủ" hoặc "ốm" để hợp thức hóa việc không hoàn thành mục tiêu — tạo sự "chính đáng" để dừng lại mà
không bị phán xét.

### 3. Thư viện tra cứu — mapping Nội/Ngoại nhân

| Yếu tố kích hoạt | Tạng phủ bị tấn công | Hệ quả thực chứng (dưới dòng) |
|---|---|---|
| Giận (Nộ) | Can (Gan) | Khí thượng: nóng nảy, mất kiểm soát hành vi |
| Lo (Ưu/Tư) | Tỳ (tiêu hóa) | Khí kết: đầy trướng, rò rỉ năng lượng thịnh vượng |
| Sợ (Khủng) | Thận | Khí hạ: mất nội lực, tâm lý nạn nhân, hay né tránh |
| Lục dâm (ngoại) | Hệ miễn dịch | Phong, Hàn, Thử, Thấp, Táo, Hỏa xâm nhập khi nội lực yếu |

**Tính năng "Insight Overlay" — tìm năng lượng Xanh trong vùng Đỏ**: trong mọi biến cố "Đỏ" (khủng
hoảng) luôn tồn tại một năng lượng "Xanh" (sự dịch chuyển). Ví dụ: mâu thuẫn gia đình khiến con dâu
ra ở riêng (sự kiện Đỏ — mất kết nối) → gợi ý insight: "Đây là sự giải phóng năng lượng độc lập cho
ngôi nhà số 3, chấm dứt sự chi phối dòng tộc lâu đời" (năng lượng Xanh — nội lực mạnh lên). Mục tiêu:
giúp người dùng chuyển từ oán trách sang biết ơn bài học thực chứng.

### 4. Kịch bản nhiệm vụ thực chứng (micro-habits) & chốt chặn kỹ thuật

Chiến lược: dùng Thân nghiệp (hành động vật lý) để lập trình lại Tàng thức. Mỗi thói quen hoàn tất là
1 lần "khép vòng năng lượng", chữa lành mô thức "không hoàn tất".

- Bế Tinh: nhiệm vụ "Quả Dục" — giảm 20% các tiêu dùng vượt ngưỡng.
- Dưỡng Khí (5 Thức Suối Nguồn Tây Tạng) — **validation logic bắt buộc**: nếu check-in bài tập
  =SUCCESS và hành động tiếp theo của user = "tắm" → pop-up cảnh báo "Nguy hiểm: nhiệt độ cơ thể
  đang biến thiên. Cần nghỉ ngơi 30 phút" → chặn nút Hoàn thành nhiệm vụ.
- An Thần: nghi thức "Tắt Tâm" (digital detox) + uống nước ấm 30-40°C ngay khi thức dậy.

### 5. Chốt chặn vật lý & tích hợp Commerce (Unicity)

Khi chỉ số báo động "Đỏ", hệ thống can thiệp "sòng phẳng" bằng giải pháp vật lý. Tỳ Vị là "gốc của
Khí hậu thiên" — nơi rò rỉ năng lượng lớn nhất nếu không được làm sạch.

- **Trigger**: `Khí_Score == RED` HOẶC `Digestive_Issue == TRUE`.
- **Message**: "Hệ thống Tỳ Vị của bạn đang quá tải rác năng lượng. Cần sòng phẳng với cơ thể để
  khơi thông sinh khí."

**Danh mục giải pháp (Unicity strategic SKUs)**

| Sản phẩm | Vai trò chuyển hóa |
|---|---|
| Aloe Vera / Thải độc ruột | Dọn rác năng lượng tại Tỳ Vị, loại bỏ gánh nặng vật lý để Khí lưu thông |
| Slim / Unimate | Cân bằng chuyển hóa, chấm dứt trạng thái "dưới dòng" do rối loạn hormone |
| Thải độc ký sinh trùng | Loại bỏ tác nhân "ký sinh năng lượng" gây uể oải vô cớ |

### 6. Module "Nghi Thức Số 8" (quản trị hiệu suất)

Module trung tâm chuyển hóa từ "Cấp bách" sang "Quan trọng", bảo vệ nội lực ngôi nhà số 1.
- Tính năng: 4 Việc Quan Trọng/ngày (user bắt buộc nhập đầu ngày).
- Nguyên tắc: việc quan trọng tác động vào GỐC (vd tập thể dục); việc cấp bách ở NGỌN (vd check
  mail, xử lý hợp đồng gấp).
- Mục tiêu: giảm 70% việc "cấp bách" không tên để dành năng lượng cho việc "quan trọng".

### 7. Yêu cầu logic vận hành & UI/UX chung

- **Delegation Index**: gợi ý nút "Ủy quyền" (thuê hỗ trợ) khi user quá bận, để bảo vệ thời gian cho
  Ngôi nhà số 1 & 3.
- **Ngôn ngữ màu**: Đỏ = cảnh báo rò rỉ/né tránh/dưới dòng; Xanh = thuận pháp/trên cầu/hiệu quả.
- **Bảo mật**: dữ liệu "Tàng thức" (lịch sử nghiệp cũ) mã hóa tuyệt đối, chỉ chia sẻ khi có ủy quyền
  rõ ràng.

**Nguyên tắc tối thượng cho Dev Team**: "Mỗi dòng code phải phục vụ mục tiêu giúp người dùng 'Thấy
rõ mình - Chọn lại sớm - Hành động thực chứng'. Mọi tính năng không dẫn đến sự 'Nhẹ nhàng - Thuận
lợi' của người dùng đều là tính năng thừa."

---

## Ghi chú áp dụng cho app `suc-khoe/` hiện tại (2026-08-31)

Đối chiếu nhanh với app "Hiểu Để Khoẻ Mạnh" đang có — phần nào tương thích trực tiếp, phần nào cần
cân nhắc trước khi làm (framework này đổi hẳn TÔNG GIỌNG app từ "theo dõi sức khỏe thể chất" sang
"tâm linh/tâm thức", nên KHÔNG tự triển khai — chờ chị Quỳnh chốt phạm vi trước khi code):

- **Khớp gần như trực tiếp** — đã có cơ chế tương đương, chỉ cần đổi khung diễn giải:
  - `Kiểm Tra Sức Khỏe` + `Theo Dõi Sức Khỏe Theo Tuần` đã đo các nhóm dấu hiệu insulin/toxin/
    metabolic hàng tuần → có thể tái diễn giải theo 3 trục Tinh/Khí/Thần thay vì (hoặc song song với)
    khung y học hiện tại.
  - `Lịch Trình Của Bạn` đã có 3 tab Sản Phẩm/Ăn Uống/Tập Luyện theo tỉ trọng 70/20/10 → có thể ánh
    xạ gần đúng sang Bế Tinh (sản phẩm + ngủ), Dưỡng Khí (ăn uống + tập luyện), An Thần (chưa có,
    xem mục dưới).
  - Logic "chốt chặn vật lý bằng Unicity khi Tỳ Vị tắc nghẽn" **đã tồn tại đúng tinh thần** —
    `kiem-tra-suc-khoe.js` đã gợi ý sản phẩm thải độc khi phát hiện dấu hiệu toxin/tiêu hóa kém, và
    `Câu Chuyện Thành Công` vừa thêm cũng phục vụ đúng mục đích "chốt chặn thương mại".

- **Chưa có, có thể thêm nếu chị Quỳnh muốn** (việc mới, cần chốt phạm vi trước khi làm):
  - Energy-Meter 3 chỉ số Tinh/Khí/Thần (1-10) + heatmap 21 ngày — hiện `theo-doi-tuan.js` đang dùng
    model chỉ số y học (metrics theo checkpoint), chưa có lớp diễn giải tâm thức này.
  - Module "An Thần" riêng (nghi thức Tắt Tâm, digital detox, thả lỏng Hàm-Vai-Bụng) — chưa có mục
    tương đương trong Lịch Trình.
  - "Nhịp dừng" (Stop-Point Trigger — màn đen 5 giây "DỪNG LẠI - THỞ 3 NHỊP - CHỌN LẠI") — chưa có,
    có thể làm dạng modal/overlay đơn giản nếu cần, không cần hạ tầng phức tạp.
  - Insight Overlay "Xanh trong Đỏ" và Thư viện "Lớp cắt sự thật" (nối biểu hiện bệnh lý ↔ Nội nhân
    Giận/Lo/Sợ) — có thể mở rộng `Thư Viện Sức Khỏe` theo hướng này, nhưng là một tầng nội dung mới,
    cần viết lại giọng văn cho toàn bộ mục đó.
  - Module "Nghi Thức Số 8" (4 Việc Quan Trọng/ngày) — đây là tính năng năng suất/quản trị thời gian,
    không phải sức khỏe thể chất — nằm ngoài phạm vi app hiện tại, giống tính năng của 1 app khác
    hơn (Sổ Dòng Tiền Tâm Thức/Xây Nhân Hiệu có thể hợp hơn).

- **Cân nhắc kỹ trước khi làm** — đây là quyết định định vị sản phẩm, không phải kỹ thuật thuần:
  - Toàn bộ khung Tinh-Khí-Thần đổi TÔNG GIỌNG app khá nhiều (từ "app sức khỏe khách hàng Unicity"
    sang "app tâm thức/tâm linh có chốt chặn Unicity") — nên hỏi rõ chị Quỳnh: áp dụng khung này làm
    LỚP DIỄN GIẢI THÊM (song song, khách nào thích thì đọc) hay THAY THẾ HẲN khung hiện tại, trước
    khi code bất kỳ phần nào ở trên.
  - Sơ đồ phễu 8 tầng (Tầng 4 = Unicity) gợi ý app này chỉ là 1 tầng trong hệ sinh thái lớn hơn nhiều
    (cộng đồng, đào tạo, business partner...) — vượt xa phạm vi 1 app web hiện tại, cần chị Quỳnh xác
    nhận có đúng ý định mở rộng tới mức đó không.
