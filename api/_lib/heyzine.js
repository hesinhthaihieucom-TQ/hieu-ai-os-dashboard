// Gọi Heyzine (heyzine.com/developers) để biến 1 file PDF (đã có sẵn link tải công khai/tạm thời)
// thành sách lật. Cần 2 thông tin xác thực RIÊNG BIỆT — API key (header Bearer) VÀ client_id
// (tham số body) — thiếu 1 trong 2 sẽ lỗi. Endpoint /api1/rest là bản ĐỒNG BỘ (chờ xử lý xong mới
// trả về), phù hợp gọi trực tiếp trong 1 request thay vì phải poll trạng thái riêng.
async function createFlipbook({ apiKey, clientId, pdfUrl, title }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  let resp;
  try {
    resp = await fetch('https://heyzine.com/api1/rest', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        pdf: pdfUrl,
        title: title || undefined,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Heyzine xử lý quá lâu (quá 150 giây) — thử lại giúp mình.');
    throw new Error('Không kết nối được tới Heyzine — kiểm tra lại mạng và thử lại.');
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error(`Heyzine trả lỗi (${resp.status}): ${await resp.text()}`);
  const data = await resp.json();
  if (!data || !data.url) throw new Error('Heyzine không trả về link sách lật hợp lệ.');
  return { url: data.url, thumbnail: data.thumbnail || null, pdf: data.pdf || null };
}

module.exports = { createFlipbook };
