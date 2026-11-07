// ============================================================================
// 1. CẤU HÌNH PDF.JS WORKER & DỮ LIỆU MẶC ĐỊNH CỦA 5 NHÂN VIÊN AI
// ============================================================================
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Tăng giá trị này mỗi khi đổi model mặc định để ép trình duyệt cập nhật lại
// (nếu không, localStorage sẽ giữ model cũ và ghi đè lên DEFAULT_EMPLOYEES)
const MODEL_VERSION = '2026-11';

const BASE_SYSTEM_PROMPT_TEMPLATE = `BỐI CẢNH CHUNG:
Bạn là nhân viên trong "Văn phòng AI" của Sếp (người dùng). Bạn làm việc cùng các đồng nghiệp: {DANH_SÁCH_BIỆT_DANH_ĐỒNG_NGHIỆP}.
Chỉ thị chung của Sếp từ Sổ tay Công ty: "{NỘI_DUNG_SỔ_TAY_CÔNG_TY}"

QUY TẮC ỨNG XỬ BẮT BUỘC:
1. Xưng "em", gọi người dùng là "Sếp". Giữ thái độ chuyên nghiệp nhưng thể hiện rõ cá tính riêng.
2. Quyền Từ chối & Đá việc: Nếu Sếp giao việc vượt quá khả năng kỹ thuật hoặc trái chuyên môn của bạn, bạn ĐƯỢC PHÉP TỪ CHỐI thẳng thắn và chỉ định đúng đồng nghiệp giỏi việc đó hơn kèm cú pháp chính xác ở cuối câu: [CHUYỂN_TIẾP: @biệt_danh_đồng_nghiệp].
3. Làm thay (Backup): Nếu trong yêu cầu có cờ [LÀM_THAY_CHO: @biệt_danh], nghĩa là đồng nghiệp đó đang nghỉ phép hoặc quá tải, bạn phải vui vẻ nhận làm thay và hoàn thành tốt nhất có thể.`;

const DEFAULT_EMPLOYEES = [
  {
    id: 'groq',
    name: 'Groq',
    nickname: '@tốc_độ',
    role: 'Lễ tân & Điều phối viên + Nghe ghi âm',
    color: 'bg-orange-500',
    avatarText: '⚡',
    // llama-3.3-70b-versatile đã bị Groq ngừng từ 16/08/2026
    model: 'openai/gpt-oss-120b',
    audioModel: 'whisper-large-v3-turbo',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    audioEndpoint: 'https://api.groq.com/openai/v1/audio/transcriptions',
    apiKey: '',
    accountId: '',
    quotaUsed: 0,
    quotaLimit: 200,
    cooldownUntil: 0,
    defaultPrompt: `VAI TRÒ: Bạn là @tốc_độ (nền tảng Groq). Chức vụ: Trưởng bộ phận Phản ứng nhanh & Điều phối viên.
TÍNH CÁCH: Nhanh gọn, thực dụng, ghét sự rườm rà, đi thẳng vào vấn đề.
NHIỆM VỤ: Trả lời tức thì câu hỏi ngắn, tra cứu nhanh, giải thích khái niệm cơ bản, viết code ngắn hoặc phân loại việc của Sếp.
QUY TẮC TỪ CHỐI:
- Nếu Sếp gửi hình ảnh: Từ chối ngay ("Sếp ơi em không xem được ảnh đâu, để em gọi @giáo_sư nhìn giúp Sếp nhé! [CHUYỂN_TIẾP: @giáo_sư]").
- Nếu Sếp bắt viết bài văn/tiểu luận dài hoặc phân tích sâu tài liệu dài: Chỉ gạch đầu dòng cốt lõi rồi đá sang cho @thư_ký hoặc @giáo_sư kèm tag [CHUYỂN_TIẾP: @thư_ký].`
  },
  {
    id: 'gemini',
    name: 'Gemini',
    nickname: '@giáo_sư',
    role: 'Chuyên gia Nghiên cứu, Giải toán/Code & Vision',
    color: 'bg-blue-600',
    avatarText: '🎓',
    // Dùng free tier nên chọn 3.8 Flash (gemini-4-argon không có trên free tier)
    model: 'gemini-3.5-flash-lite',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
    apiKey: '',
    accountId: '',
    quotaUsed: 0,
    quotaLimit: 200,
    cooldownUntil: 0,
    defaultPrompt: `VAI TRÒ: Bạn là @giáo_sư (nền tảng Gemini). Chức vụ: Giám đốc Nghiên cứu, Phân tích sâu & Thị giác máy tính.
TÍNH CÁCH: Uyên bác, điềm đạm, cẩn trọng, phân tích sâu sắc, luôn nhìn ra lỗi sai logic.
NHIỆM VỤ: Giải quyết bài toán khó, debug code phức tạp, phân tích tài liệu dài và độc quyền xử lý hình ảnh (đề thi, biểu đồ, ảnh chụp).
QUY TẮC TỪ CHỐI: Nếu Sếp hỏi câu quá vặt vãnh ("1+1 bằng mấy", "xin chào"), hãy nhắc nhẹ Sếp ("Việc vặt này Sếp cứ sai @tốc_độ làm cho lẹ, gọi em hơi phí chất xám, nhưng thôi để em trả lời luôn...").`
  },
  {
    id: 'mistral',
    name: 'Mistral',
    nickname: '@thư_ký',
    role: 'Soạn thảo, Biên tập, Dịch thuật & Trình bày',
    color: 'bg-purple-600',
    avatarText: '✒️',
    model: 'mistral-small-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    apiKey: '',
    accountId: '',
    quotaUsed: 0,
    quotaLimit: 200,
    cooldownUntil: 0,
    defaultPrompt: `VAI TRÒ: Bạn là @thư_ký (nền tảng Mistral). Chức vụ: Thư ký Văn phòng, Chuyên gia Ngôn ngữ & Biên tập viên.
TÍNH CÁCH: Chỉn chu, lịch thiệp, câu chữ mượt mà, rất giỏi trình bày bố cục (Markdown, bảng biểu).
NHIỆM VỤ: Viết tiểu luận, báo cáo, soạn email, làm dàn ý slide thuyết trình, dịch thuật chuyên ngành, chuốt lại văn phong.
QUY TẮC TỪ CHỐI: Nếu Sếp bắt nhìn ảnh hoặc giải thuật toán phức tạp, hãy từ chối khéo và thêm tag [CHUYỂN_TIẾP: @giáo_sư].`
  },
  {
    id: 'cohere',
    name: 'Cohere',
    nickname: '@thủ_thư',
    role: 'Thủ thư Tra cứu & Lọc tài liệu (Rerank)',
    color: 'bg-teal-600',
    avatarText: '📚',
    model: 'command-a-03-2025',
    rerankModel: 'rerank-v3.5',
    endpoint: 'https://api.cohere.com/v2/chat',
    rerankEndpoint: 'https://api.cohere.com/v2/rerank',
    apiKey: '',
    accountId: '',
    quotaUsed: 0,
    quotaLimit: 100,
    cooldownUntil: 0,
    defaultPrompt: `VAI TRÒ: Bạn là @thủ_thư (nền tảng Cohere). Chức vụ: Quản lý Kho Tài liệu & Tra cứu ngữ nghĩa.
TÍNH CÁCH: Tỉ mỉ, chính xác, luôn nói có sách mách có chứng.
NHIỆM VỤ: Chấm điểm và lọc ra các đoạn văn bản liên quan nhất từ tài liệu Sếp tải lên (Rerank), hoặc trả lời câu hỏi dựa sát vào tài liệu đính kèm và trích dẫn rõ nguồn.`
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    nickname: '@đa_nhiệm',
    role: 'Hậu cần, Dự bị (Backup) & Đa phương tiện',
    color: 'bg-emerald-600',
    avatarText: '🛠️',
    model: '@cf/qwen/qwen3.8-27b',
    audioModel: '@cf/openai/whisper',
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/qwen/qwen3.8-27b',
    audioEndpoint: 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/openai/whisper',
    apiKey: '',
    accountId: '',
    quotaUsed: 0,
    quotaLimit: 300,
    cooldownUntil: 0,
    defaultPrompt: `VAI TRÒ: Bạn là @đa_nhiệm (nền tảng Cloudflare Workers AI). Chức vụ: Chuyên viên Kỹ thuật Đa phương tiện & Nhân sự Dự bị (Backup).
TÍNH CÁCH: Nhiệt tình, chịu khó, ai nghỉ phép hay quá tải là có mặt thế chỗ ngay.
NHIỆM VỤ: Xử lý âm thanh, hỗ trợ đa tác vụ và sẵn sàng đóng thế bất kỳ đồng nghiệp nào khi có cờ [LÀM_THAY_CHO: @tên].`
  }
];

// ============================================================================
// 2. QUẢN LÝ TRẠNG THÁI (LOCALSTORAGE + INDEXEDDB)
// ============================================================================
const state = {
  employees: [],
  handbook: '',
  currentRoom: 'direct', // 'direct' | 'pipeline' | 'debate'
  messagesByRoom: {
    direct: [],
    pipeline: [],
    debate: []
  },
  attachments: [], // { type: 'doc'|'image', name, text, wordCount, base64, mimeType }
  editingEmployeeId: null,
  pendingLeaveContext: null,
  debateSession: {
    active: false,
    turn: 0,
    originalQuery: '',
    turn1Answer: '',
    turn2Critique: '',
    resolver: null
  },
  mediaRecorder: null,
  audioChunks: [],
  isRecording: false
};

// --- IndexedDB lưu trữ Lịch sử Chat dung lượng lớn ---
const DB_NAME = 'AIOfficeDB';
const DB_VERSION = 1;

function openChatDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('rooms')) {
        db.createObjectStore('rooms', { keyPath: 'roomId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRoomMessagesToDB(roomId) {
  try {
    const db = await openChatDB();
    const tx = db.transaction('rooms', 'readwrite');
    tx.objectStore('rooms').put({
      roomId,
      messages: state.messagesByRoom[roomId] || []
    });
  } catch (e) {
    console.warn('IndexedDB fallback to localStorage:', e);
    localStorage.setItem(`ai_office_msgs_${roomId}`, JSON.stringify(state.messagesByRoom[roomId]));
  }
}

async function loadAllRoomsFromDB() {
  for (const roomId of ['direct', 'pipeline', 'debate']) {
    try {
      const db = await openChatDB();
      const tx = db.transaction('rooms', 'readonly');
      const store = tx.objectStore('rooms');
      const data = await new Promise((res) => {
        const r = store.get(roomId);
        r.onsuccess = () => res(r.result);
        r.onerror = () => res(null);
      });
      if (data && Array.isArray(data.messages)) {
        state.messagesByRoom[roomId] = data.messages;
      }
    } catch (e) {
      const raw = localStorage.getItem(`ai_office_msgs_${roomId}`);
      if (raw) state.messagesByRoom[roomId] = JSON.parse(raw);
    }
  }
}

function loadConfigFromStorage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const savedDate = localStorage.getItem('ai_office_quota_date');
  const savedEmployees = localStorage.getItem('ai_office_employees');
  const savedVer = localStorage.getItem('ai_office_model_ver');

  if (savedEmployees) {
    const parsed = JSON.parse(savedEmployees);
    state.employees = DEFAULT_EMPLOYEES.map((def) => {
      const found = parsed.find((p) => p.id === def.id) || {};
      const merged = {
        ...def,
        ...found,
        systemPrompt: found.systemPrompt || def.defaultPrompt,
        quotaUsed: savedDate === todayStr ? (found.quotaUsed || 0) : 0,
        cooldownUntil: 0
      };

      // Phiên bản model đã đổi -> ép dùng model/endpoint mặc định mới
      // (giữ nguyên API Key, quota, system prompt, biệt danh của Sếp)
      if (savedVer !== MODEL_VERSION) {
        merged.model = def.model;
        merged.audioModel = def.audioModel;
        merged.endpoint = def.endpoint;
        merged.audioEndpoint = def.audioEndpoint;
        merged.rerankModel = def.rerankModel;
        merged.rerankEndpoint = def.rerankEndpoint;
      }
      return merged;
    });
    // Lưu lại ngay để lần sau không migrate nữa
    if (savedVer !== MODEL_VERSION) {
      saveEmployeesToStorage();
    }
  } else {
    state.employees = DEFAULT_EMPLOYEES.map((def) => ({
      ...def,
      systemPrompt: def.defaultPrompt
    }));
  }

  localStorage.setItem('ai_office_model_ver', MODEL_VERSION);
  localStorage.setItem('ai_office_quota_date', todayStr);
  state.handbook = localStorage.getItem('ai_office_handbook') || '';
  document.getElementById('companyHandbook').value = state.handbook;
}

function saveEmployeesToStorage() {
  localStorage.setItem('ai_office_employees', JSON.stringify(state.employees));
}

// ============================================================================
// 3. QUẢN LÝ TRẠNG THÁI NHÂN VIÊN & ĐẾM NGƯỢC 60S QUÁ TẢI
// ============================================================================
function getEmployeeStatus(emp) {
  const hasKey = Boolean(emp.apiKey && emp.apiKey.trim());
  if (!hasKey) return 'leave'; // ⚪ Nghỉ phép
  if (emp.id === 'cloudflare' && (!emp.accountId || !emp.accountId.trim())) {
    return 'leave';
  }
  if (emp.cooldownUntil && Date.now() < emp.cooldownUntil) {
    return 'overload'; // 🟠 Quá tải (Đi uống trà đá)
  }
  return 'active'; // 🟢 Đang hoạt động
}

function setEmployeeOverload(empId, seconds = 60) {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return;
  emp.cooldownUntil = Date.now() + seconds * 1000;
  renderSidebarEmployees();
}

// Bộ đếm ngược mỗi giây cho nhân viên đang "Đi uống trà đá (429)"
setInterval(() => {
  let needRerender = false;
  state.employees.forEach((emp) => {
    if (emp.cooldownUntil > 0) {
      if (Date.now() >= emp.cooldownUntil) {
        emp.cooldownUntil = 0;
      }
      needRerender = true;
    }
  });
  if (needRerender) renderSidebarEmployees();
}, 1000);

function incrementQuota(empId) {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return;
  emp.quotaUsed = (emp.quotaUsed || 0) + 1;
  saveEmployeesToStorage();
  renderSidebarEmployees();
}

// Ghép Base Prompt + Sổ tay công ty + System Prompt riêng
function buildFullSystemPrompt(emp) {
  const colleagues = state.employees
    .filter((e) => e.id !== emp.id)
    .map((e) => `${e.nickname} (${e.role})`)
    .join(', ');

  const handbookText = state.handbook.trim() || 'Chưa có chỉ thị đặc biệt, hãy phục vụ Sếp chu đáo.';
  const basePrompt = BASE_SYSTEM_PROMPT_TEMPLATE
    .replace('{DANH_SÁCH_BIỆT_DANH_ĐỒNG_NGHIỆP}', colleagues)
    .replace('{NỘI_DUNG_SỔ_TAY_CÔNG_TY}', handbookText);

  return `${basePrompt}\n\n---\n${emp.systemPrompt || emp.defaultPrompt}`;
}

// ============================================================================
// 4. TÍCH HỢP GỌI API THẬT CHO CẢ 5 DỊCH VỤ (CÓ PROXY CHO CLOUDFLARE & COHERE)
// ============================================================================
// Nếu app chạy trên GitHub Pages (github.io) thì dán link Cloudflare Worker vào đây,
// ví dụ: 'https://ai-office-proxy.ten-cua-sep.workers.dev/'
// Để trống '' nếu app chạy bằng server Node (dùng /api/proxy trong server.js).
const WORKER_PROXY_URL = 'https://tny.qp198178.workers.dev';

async function fetchWithOptionalProxy(targetUrl, options, forceProxy = false) {
  // Groq, Gemini, Mistral gọi thẳng trực tiếp (forceProxy = false)
  if (!forceProxy) {
    return fetch(targetUrl, options);
  }

  // Cohere và Cloudflare không cho trình duyệt gọi trực tiếp (CORS) nên phải qua proxy.
  if (WORKER_PROXY_URL) {
    return fetch(`${WORKER_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`, options);
  }

  if (location.hostname.endsWith('github.io')) {
    throw new Error(
      'Đang chạy trên github.io nên chưa có proxy. Sếp dán link Cloudflare Worker vào WORKER_PROXY_URL trong app.js.'
    );
  }

  const headers = new Headers(options.headers || {});
  headers.set('X-Target-URL', targetUrl);
  return fetch('/api/proxy', { ...options, method: 'POST', headers });
}

async function callEmployeeAPI(emp, userPrompt, options = {}) {
  const status = getEmployeeStatus(emp);
  if (status === 'leave') {
    const err = new Error(`Nhân viên ${emp.nickname} đang nghỉ phép (Chưa có API Key).`);
    err.code = 'NO_KEY';
    throw err;
  }
  if (status === 'overload') {
    const remain = Math.ceil((emp.cooldownUntil - Date.now()) / 1000);
    const err = new Error(`Nhân viên ${emp.nickname} đang uống trà đá vì quá tải (${remain}s).`);
    err.status = 429;
    throw err;
  }

  const systemPrompt = options.customSystemPrompt || buildFullSystemPrompt(emp);
  const imageAttachment = state.attachments.find((a) => a.type === 'image');
  const docAttachments = state.attachments.filter((a) => a.type === 'doc');

  // Nếu có tài liệu đính kèm (và không phải truyền context riêng từ Pipeline), nối nội dung vào prompt
  let finalUserText = userPrompt;
  if (!options.skipAutoDocContext && docAttachments.length > 0) {
    const docsCombined = docAttachments
      .map((d) => `[TÀI LIỆU ĐÍNH KÈM: ${d.name}]\n${d.text}`)
      .join('\n\n---\n\n');
    finalUserText = `${docsCombined}\n\n---\nCÂU HỎI / YÊU CẦU CỦA SẾP:\n${userPrompt}`;
  }

  // Nếu có ảnh mà gọi nhân viên khác ngoài @giáo_sư (Gemini), bổ sung nhắc nhở để kích hoạt quy tắc từ chối
  if (imageAttachment && emp.id !== 'gemini') {
    finalUserText = `[Hệ thống ghi nhận Sếp có đính kèm 1 hình ảnh: "${imageAttachment.name}", nhưng nền tảng của bạn không hỗ trợ thị giác máy tính]\n${finalUserText}`;
  }

  incrementQuota(emp.id);

  let response;

  // --- 1. GROQ & 3. MISTRAL (OpenAI-compatible Chat Completions) ---
  if (emp.id === 'groq' || emp.id === 'mistral') {
    response = await fetch(emp.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: emp.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalUserText }
        ],
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Lỗi ${response.status} từ ${emp.name}: ${errText}`);
      err.status = response.status;
      throw err;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Em chưa có câu trả lời phù hợp ạ.';
  }

  // --- 2. GEMINI (Google Generative AI REST API + Vision) ---
  if (emp.id === 'gemini') {
    const modelName = (emp.model || 'gemini-3.8-flash').trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(emp.apiKey.trim())}`;

    const parts = [{ text: finalUserText }];
    if (imageAttachment) {
      parts.push({
        inline_data: {
          mime_type: imageAttachment.mimeType,
          data: imageAttachment.base64
        }
      });
    }

    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Lỗi ${response.status} từ Gemini: ${errText}`);
      err.status = response.status;
      throw err;
    }
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') ||
      'Em không tìm thấy nội dung trả về từ hệ thống Gemini.'
    );
  }

  // --- 4. COHERE V2 CHAT ---
  if (emp.id === 'cohere') {
    response = await fetchWithOptionalProxy(
      emp.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${emp.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: emp.model || 'command-a-03-2025',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: finalUserText }
          ]
        })
      },
      true
    );

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Lỗi ${response.status} từ Cohere: ${errText}`);
      err.status = response.status;
      throw err;
    }
    const data = await response.json();
    return (
      data.message?.content?.[0]?.text ||
      data.text ||
      'Em đã tra cứu xong nhưng chưa có dữ liệu khớp.'
    );
  }

  // --- 5. CLOUDFLARE WORKERS AI ---
  if (emp.id === 'cloudflare') {
    const accountId = emp.accountId.trim();
    const modelPath = emp.model || '@cf/qwen/qwen3.8-27b';
    const targetUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelPath}`;

    response = await fetchWithOptionalProxy(
      targetUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${emp.apiKey.trim()}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: finalUserText }
          ]
        })
      },
      true
    );

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Lỗi ${response.status} từ Cloudflare: ${errText}`);
      err.status = response.status;
      throw err;
    }
    const data = await response.json();
    return (
      data.result?.response ||
      data.result?.choices?.[0]?.message?.content ||
      'Em @đa_nhiệm đã xử lý xong yêu cầu của Sếp!'
    );
  }
}

// --- Hàm gọi Cohere Rerank API (@thủ_thư) dùng trong Phòng Phối Hợp ---
async function callCohereRerank(query, chunks) {
  const cohereEmp = state.employees.find((e) => e.id === 'cohere');
  if (!cohereEmp || getEmployeeStatus(cohereEmp) !== 'active') {
    // Fallback chấm điểm từ khóa tại trình duyệt nếu @thủ_thư đang nghỉ phép
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = chunks.map((chunk, index) => {
      const lower = chunk.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (lower.includes(t) ? 1 : 0), 0);
      return { index, text: chunk, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return {
      usedCohereAPI: false,
      topChunks: scored.slice(0, 3).map((s) => s.text)
    };
  }

  incrementQuota('cohere');
  const res = await fetchWithOptionalProxy(
    cohereEmp.rerankEndpoint || 'https://api.cohere.com/v2/rerank',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cohereEmp.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: cohereEmp.rerankModel || 'rerank-v3.5',
        query,
        documents: chunks,
        top_n: 3
      })
    },
    true
  );

  if (!res.ok) {
    if (res.status === 429) setEmployeeOverload('cohere', 60);
    throw new Error(`Cohere Rerank lỗi ${res.status}`);
  }

  const data = await res.json();
  const topChunks = (data.results || []).map((r) => chunks[r.index]);
  return {
    usedCohereAPI: true,
    topChunks
  };
}

// ============================================================================
// 5. CƠ CHẾ TỰ ĐỘNG LÀM THAY (AUTO-FALLBACK KHI LỖI 429 / MẠNG / SAI MODEL)
// ============================================================================
async function executeWithAutoFallback(targetEmp, userPrompt, options = {}) {
  try {
    showTypingIndicator(targetEmp);
    const reply = await callEmployeeAPI(targetEmp, userPrompt, options);
    hideTypingIndicator();
    return { employee: targetEmp, reply, isFallback: false };
  } catch (error) {
    hideTypingIndicator();

    // 404 / 400 thường do tên model sai hoặc đã bị ngừng -> KHÔNG phải quá tải,
    // không nên phạt "uống trà đá 60s" mà báo rõ để Sếp sửa tên model.
    const isModelError = error.status === 404 || error.status === 400;
    const isRateLimit = error.status === 429;

    if (!isModelError) {
      // Đặt trạng thái Quá tải (Đi uống trà đá 60s)
      setEmployeeOverload(targetEmp.id, 60);
    }

    let reasonText = error.message;
    if (isRateLimit) {
      reasonText = 'Lỗi 429 Quá tải - Đi uống trà đá 60s';
    } else if (isModelError) {
      reasonText = `Lỗi ${error.status}: model "${targetEmp.model}" có thể sai tên hoặc đã bị ngừng. Sếp mở hồ sơ ${targetEmp.nickname} để kiểm tra ô Model`;
    }

    appendSystemMessage(
      `⚠️ **${targetEmp.nickname}** gặp sự cố (${reasonText}). Đang tìm nhân viên dự bị làm thay...`
    );

    // Ưu tiên @đa_nhiệm (Cloudflare), nếu nghỉ phép thì tìm đồng nghiệp khác đang active
    const cloudflareEmp = state.employees.find((e) => e.id === 'cloudflare');
    let backupEmp = null;

    if (
      cloudflareEmp &&
      cloudflareEmp.id !== targetEmp.id &&
      getEmployeeStatus(cloudflareEmp) === 'active'
    ) {
      backupEmp = cloudflareEmp;
    } else {
      backupEmp = state.employees.find(
        (e) => e.id !== targetEmp.id && getEmployeeStatus(e) === 'active'
      );
    }

    if (!backupEmp) {
      throw new Error(
        `Không có nhân viên dự bị nào đang hoạt động để làm thay cho ${targetEmp.nickname}. Sếp vui lòng kiểm tra lại API Key!`
      );
    }

    const fallbackPrompt = `[LÀM_THAY_CHO: ${targetEmp.nickname}]\n${userPrompt}`;
    showTypingIndicator(backupEmp, `đang làm thay cho ${targetEmp.nickname}...`);
    const backupReply = await callEmployeeAPI(backupEmp, fallbackPrompt, options);
    hideTypingIndicator();

    return {
      employee: backupEmp,
      reply: backupReply,
      isFallback: true,
      replacedNickname: targetEmp.nickname
    };
  }
}

// ============================================================================
// 6. XỬ LÝ FILE TRÊN TRÌNH DUYỆT (BÓC PDF/DOCX 0 API & XUẤT WORD/PDF)
// ============================================================================
function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(' ') + '\n\n';
  }
  return fullText.trim();
}

async function extractTextFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return (result.value || '').trim();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'pdf') {
      const text = await extractTextFromPDF(file);
      const wordCount = countWords(text);
      state.attachments.push({
        type: 'doc',
        name: file.name,
        text,
        wordCount
      });
    } else if (ext === 'docx') {
      const text = await extractTextFromDocx(file);
      const wordCount = countWords(text);
      state.attachments.push({
        type: 'doc',
        name: file.name,
        text,
        wordCount
      });
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      const base64 = await fileToBase64(file);
      state.attachments.push({
        type: 'image',
        name: file.name,
        base64,
        mimeType: file.type || 'image/png',
        previewUrl: `data:${file.type || 'image/png'};base64,${base64}`
      });
    }
    renderAttachmentBadges();
  } catch (err) {
    alert(`Không thể đọc file ${file.name}: ${err.message}`);
  }
}

function renderAttachmentBadges() {
  const bar = document.getElementById('attachmentPreviewBar');
  if (state.attachments.length === 0) {
    bar.classList.add('hidden');
    bar.innerHTML = '';
    return;
  }

  bar.classList.remove('hidden');
  bar.classList.add('flex');
  bar.innerHTML = state.attachments
    .map((att, idx) => {
      if (att.type === 'doc') {
        return `
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span>📄 <b>${escapeHtml(att.name)}</b> (Đã bóc ${att.wordCount.toLocaleString('vi-VN')} từ - Tốn 0 API)</span>
            <button onclick="removeAttachment(${idx})" class="hover:text-rose-500 font-bold ml-1">✕</button>
          </div>
        `;
      }
      return `
        <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-medium">
          <img src="${att.previewUrl}" class="w-7 h-7 rounded object-cover border border-blue-400/40" />
          <span>🖼️ <b>${escapeHtml(att.name)}</b> (Gửi @giáo_sư Vision)</span>
          <button onclick="removeAttachment(${idx})" class="hover:text-rose-500 font-bold ml-1">✕</button>
        </div>
      `;
    })
    .join('');
}

window.removeAttachment = function (idx) {
  state.attachments.splice(idx, 1);
  renderAttachmentBadges();
};

// --- Xuất câu trả lời của AI ra file Word (.docx) và PDF ---
window.exportMessageToDocx = async function (msgId) {
  const msg = findMessageById(msgId);
  if (!msg) return;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
  const lines = msg.content.split('\n');

  const children = [
    new Paragraph({
      text: `BÁO CÁO TỪ NHÂN VIÊN ${msg.employeeNickname.toUpperCase()}`,
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
          italics: true,
          size: 20
        })
      ]
    }),
    new Paragraph({ text: '' })
  ];

  lines.forEach((line) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })]
      })
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_Office_${msg.employeeNickname.replace('@', '')}_${Date.now()}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};

window.exportMessageToPDF = function (msgId) {
  const msg = findMessageById(msgId);
  if (!msg) return;

  const wrapper = document.createElement('div');
  wrapper.style.padding = '24px';
  wrapper.style.fontFamily = 'Arial, sans-serif';
  wrapper.style.color = '#111827';
  wrapper.innerHTML = `
    <h2 style="color:#4f46e5;margin-bottom:4px;">AI OFFICE - BÁO CÁO NHÂN SỰ</h2>
    <p style="font-size:12px;color:#6b7280;margin-top:0;">Nhân viên thực hiện: <b>${escapeHtml(msg.employeeNickname)}</b> | Ngày: ${new Date().toLocaleString('vi-VN')}</p>
    <hr style="margin:12px 0;border-color:#e5e7eb;" />
    <div style="font-size:13px;line-height:1.6;">${window.marked ? window.marked.parse(msg.content) : escapeHtml(msg.content)}</div>
  `;

  window.html2pdf()
    .set({
      margin: 12,
      filename: `AI_Office_${msg.employeeNickname.replace('@', '')}_${Date.now()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    })
    .from(wrapper)
    .save();
};

// ============================================================================
// 7. GHI ÂM GIỌNG NÓI (GROQ WHISPER -> FALLBACK CLOUDFLARE WHISPER)
// ============================================================================
async function toggleVoiceRecording() {
  const btnMic = document.getElementById('btnMic');

  if (state.isRecording && state.mediaRecorder) {
    state.mediaRecorder.stop();
    state.isRecording = false;
    btnMic.classList.remove('recording-pulse');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.audioChunks = [];
    state.mediaRecorder = new MediaRecorder(stream);

    state.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) state.audioChunks.push(e.data);
    };

    state.mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
      await transcribeAudioBlob(audioBlob);
    };

    state.mediaRecorder.start();
    state.isRecording = true;
    btnMic.classList.add('recording-pulse');
  } catch (err) {
    alert('Không thể truy cập Microphone: ' + err.message);
  }
}

async function transcribeAudioBlob(audioBlob) {
  const chatInput = document.getElementById('chatInput');
  const oldPlaceholder = chatInput.placeholder;
  chatInput.placeholder = '🎙️ Đang nhận diện giọng nói tiếng Việt qua Whisper...';

  const groqEmp = state.employees.find((e) => e.id === 'groq');
  const cfEmp = state.employees.find((e) => e.id === 'cloudflare');

  // 1. Thử gọi Groq Whisper (model lấy từ cấu hình audioModel)
  if (groqEmp && getEmployeeStatus(groqEmp) === 'active') {
    try {
      incrementQuota('groq');
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.webm');
      formData.append('model', groqEmp.audioModel || 'whisper-large-v3-turbo');
      formData.append('language', 'vi');

      const res = await fetch(groqEmp.audioEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqEmp.apiKey.trim()}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          chatInput.value = (chatInput.value ? chatInput.value + ' ' : '') + data.text.trim();
          chatInput.placeholder = oldPlaceholder;
          chatInput.focus();
          return;
        }
      } else {
        console.warn(`Groq Whisper trả lỗi ${res.status}, chuyển sang Cloudflare Whisper`);
      }
    } catch (e) {
      console.warn('Groq Whisper lỗi, chuyển sang Cloudflare Whisper:', e);
    }
  }

  // 2. Fallback sang Cloudflare Whisper (@cf/openai/whisper)
  if (cfEmp && getEmployeeStatus(cfEmp) === 'active') {
    try {
      incrementQuota('cloudflare');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const targetUrl = `https://api.cloudflare.com/client/v4/accounts/${cfEmp.accountId.trim()}/ai/run/${cfEmp.audioModel || '@cf/openai/whisper'}`;

      const res = await fetchWithOptionalProxy(
        targetUrl,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfEmp.apiKey.trim()}`,
            'Content-Type': 'application/octet-stream'
          },
          body: arrayBuffer
        },
        true
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.result?.text || '';
        if (text) {
          chatInput.value = (chatInput.value ? chatInput.value + ' ' : '') + text.trim();
          chatInput.placeholder = oldPlaceholder;
          chatInput.focus();
          return;
        }
      }
    } catch (e) {
      console.warn('Cloudflare Whisper lỗi:', e);
    }
  }

  chatInput.placeholder = oldPlaceholder;
  alert(
    'Không thể nhận diện giọng nói! Sếp hãy cấp API Key cho @tốc_độ (Groq) hoặc @đa_nhiệm (Cloudflare) để dùng tính năng nghe băng ghi âm nhé.'
  );
}

// ============================================================================
// 8. LOGIC 3 PHÒNG LÀM VIỆC (DIRECT CALL, PIPELINE, 3-TURN DEBATE)
// ============================================================================

// --- PHÒNG 1: PHÒNG GỌI RIÊNG (DIRECT CALL) ---
async function handleDirectRoomSubmit(userText) {
  // Tìm xem Sếp có tag @biệt_danh nào không
  let mentionedEmp = null;
  for (const emp of state.employees) {
    if (userText.toLowerCase().includes(emp.nickname.toLowerCase())) {
      mentionedEmp = emp;
      break;
    }
  }

  // Nếu không tag ai -> Mặc định @tốc_độ lên tiếng
  if (!mentionedEmp) {
    const groqEmp = state.employees.find((e) => e.id === 'groq');
    if (getEmployeeStatus(groqEmp) === 'active') {
      const receptionPrompt = `Sếp vừa nhắn vào Phòng Gọi Riêng mà quên chưa tag @biệt_danh nhân viên cụ thể: "${userText}".
Với vai trò Lễ tân kiêm Điều phối viên (@tốc_độ), nếu việc này nhỏ gọn trong tầm tay em thì trả lời nhanh giúp Sếp, đồng thời hỏi Sếp có muốn gọi chuyên gia nào (như @giáo_sư, @thư_ký, @thủ_thư) hỗ trợ sâu hơn không.`;
      const result = await executeWithAutoFallback(groqEmp, receptionPrompt);
      appendAIMessage(result.employee, result.reply, userText, {
        isFallback: result.isFallback,
        replacedNickname: result.replacedNickname
      });
    } else {
      appendSystemMessage(
        `👋 Sếp chưa tag tên nhân viên nào (ví dụ: **@giáo_sư**, **@thư_ký**). Hiện tại lễ tân **${groqEmp.nickname}** cũng đang nghỉ phép (chưa có API Key). Sếp hãy click vào nhân viên bên cột trái để cấp API Key hoặc gõ **@** để chọn người nhé!`
      );
    }
    return;
  }

  // Nếu tag trúng nhân viên đang Nghỉ phép (Chưa có API Key) -> Hiện Modal Cảnh báo
  if (getEmployeeStatus(mentionedEmp) === 'leave') {
    openLeaveAlertModal(mentionedEmp, userText);
    return;
  }

  const result = await executeWithAutoFallback(mentionedEmp, userText);
  appendAIMessage(result.employee, result.reply, userText, {
    isFallback: result.isFallback,
    replacedNickname: result.replacedNickname
  });
}

// --- PHÒNG 2: PHÒNG PHỐI HỢP (WORKFLOW / PIPELINE ROOM) ---
function setPipelineStepStatus(stepNum, status) {
  const el = document.getElementById(`pipeStep${stepNum}`);
  if (!el) return;
  el.classList.remove('active-step', 'done-step');
  if (status === 'active') el.classList.add('active-step');
  if (status === 'done') el.classList.add('done-step');
}

function splitTextIntoChunks(text, maxWords = 180) {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const p of paragraphs) {
    if (countWords(current + ' ' + p) > maxWords && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? '\n' : '') + p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

async function handlePipelineRoomSubmit(userText) {
  setPipelineStepStatus(1, 'active');
  setPipelineStepStatus(2, 'idle');
  setPipelineStepStatus(3, 'idle');

  const docAttachments = state.attachments.filter((a) => a.type === 'doc');
  let topChunksContext = '';

  // BƯỚC 1: Lọc tài liệu qua @thủ_thư (Cohere Rerank) nếu có file đính kèm
  setPipelineStepStatus(1, 'active');
  if (docAttachments.length > 0) {
    const librarian = state.employees.find((e) => e.id === 'cohere');
    showTypingIndicator(librarian, 'đang bóc tách chunks & chấm điểm Rerank...');

    const allText = docAttachments.map((d) => d.text).join('\n\n');
    const chunks = splitTextIntoChunks(allText, 160);

    try {
      const rerankResult = await callCohereRerank(userText, chunks);
      hideTypingIndicator();
      topChunksContext = rerankResult.topChunks
        .map((c, i) => `[Đoạn trích #${i + 1}]: ${c}`)
        .join('\n\n');

      appendAIMessage(
        librarian,
        `📚 **Báo cáo Bước 1 (Lọc tài liệu):** Em đã chia tài liệu thành **${chunks.length} đoạn** và lọc ra **Top ${rerankResult.topChunks.length} đoạn** sát nhất với câu hỏi của Sếp (${rerankResult.usedCohereAPI ? 'Dùng Cohere Rerank API' : 'Chế độ lọc cục bộ do chưa nhập Key Cohere'}):\n\n${topChunksContext}`,
        userText
      );
    } catch (e) {
      hideTypingIndicator();
      topChunksContext = chunks.slice(0, 3).join('\n\n');
      appendSystemMessage(`⚠️ Lỗi Rerank từ @thủ_thư (${e.message}), tự động lấy 3 đoạn đầu tiên.`);
    }
  } else {
    appendSystemMessage('ℹ️ **Bước 1:** Không có tài liệu đính kèm, bỏ qua bước lọc Rerank của @thủ_thư.');
  }
  setPipelineStepStatus(1, 'done');

  // BƯỚC 2: @tốc_độ (Groq) phân tích JSON giao việc cho @giáo_sư hay @thư_ký
  setPipelineStepStatus(2, 'active');
  const groqEmp = state.employees.find((e) => e.id === 'groq');
  const profEmp = state.employees.find((e) => e.id === 'gemini');
  const secEmp = state.employees.find((e) => e.id === 'mistral');

  let chosenSpecialist = profEmp;
  let routingReason = 'Yêu cầu cần phân tích chuyên sâu.';

  const routingPrompt = `Sếp giao nhiệm vụ sau trong Phòng Phối Hợp: "${userText}".
Hãy phân tích xem nhiệm vụ này nên giao cho "${profEmp.nickname}" (Chuyên gia Nghiên cứu sâu, Toán, Code khó, Logic, Hình ảnh) hay "${secEmp.nickname}" (Chuyên viên Soạn thảo văn bản, Tiểu luận, Báo cáo, Dịch thuật, Email).
CHỈ TRẢ VỀ ĐÚNG 1 CHUỖI JSON HỢP LỆ THEO MẪU SAU, KHÔNG GIẢI THÍCH THÊM:
{"assignee": "${profEmp.nickname}", "reason": "Lý do ngắn gọn 1 câu"}`;

  if (getEmployeeStatus(groqEmp) === 'active' || state.employees.some((e) => getEmployeeStatus(e) === 'active')) {
    try {
      const routeRes = await executeWithAutoFallback(groqEmp, routingPrompt, {
        skipAutoDocContext: true,
        customSystemPrompt: 'Bạn là bộ phân tích điều phối công việc JSON. Chỉ xuất JSON thuần túy.'
      });
      const jsonMatch = routeRes.reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.assignee && parsed.assignee.includes(secEmp.nickname)) {
          chosenSpecialist = secEmp;
        } else {
          chosenSpecialist = profEmp;
        }
        routingReason = parsed.reason || routingReason;
      }
      appendAIMessage(
        routeRes.employee,
        `⚡ **Báo cáo Bước 2 (Điều phối JSON):**\n\`\`\`json\n${JSON.stringify({ assignee: chosenSpecialist.nickname, reason: routingReason }, null, 2)}\n\`\`\`\n👉 Em xin chuyển hồ sơ cho **${chosenSpecialist.nickname}** thực thi Bước 3!`,
        userText
      );
    } catch (e) {
      appendSystemMessage(`⚠️ Không thể gọi bước điều phối (${e.message}), mặc định giao cho **${chosenSpecialist.nickname}**.`);
    }
  }
  setPipelineStepStatus(2, 'done');

  // BƯỚC 3: Nhân viên được chọn thực thi hoàn chỉnh
  setPipelineStepStatus(3, 'active');
  const finalExecutionPrompt = topChunksContext
    ? `Dưới đây là Top 3 đoạn tài liệu quan trọng nhất do @thủ_thư lọc ra:\n${topChunksContext}\n\n---\nYÊU CẦU CỦA SẾP: ${userText}\nHãy hoàn thành xuất sắc nhiệm vụ này cho Sếp.`
    : userText;

  if (getEmployeeStatus(chosenSpecialist) === 'leave') {
    // Nếu chuyên gia chính nghỉ phép, nhờ người khác đang active làm thay
    const fallbackTarget = state.employees.find((e) => getEmployeeStatus(e) === 'active');
    if (!fallbackTarget) {
      openLeaveAlertModal(chosenSpecialist, finalExecutionPrompt);
      return;
    }
    const execRes = await executeWithAutoFallback(
      fallbackTarget,
      `[LÀM_THAY_CHO: ${chosenSpecialist.nickname}]\n${finalExecutionPrompt}`,
      { skipAutoDocContext: true }
    );
    appendAIMessage(execRes.employee, execRes.reply, userText, {
      isFallback: true,
      replacedNickname: chosenSpecialist.nickname
    });
  } else {
    const execRes = await executeWithAutoFallback(chosenSpecialist, finalExecutionPrompt, {
      skipAutoDocContext: true
    });
    appendAIMessage(execRes.employee, execRes.reply, userText, {
      isFallback: execRes.isFallback,
      replacedNickname: execRes.replacedNickname
    });
  }
  setPipelineStepStatus(3, 'done');
}

// --- PHÒNG 3: PHÒNG PHẢN BIỆN (3-TURN DEBATE ROOM) ---
function waitForBossDecisionBetweenTurns(turnCompleted) {
  const statusText = document.getElementById('debateStatusText');
  const controls = document.getElementById('bossOverrideControls');
  const badge = document.getElementById('debateTurnBadge');
  const interjectInput = document.getElementById('bossInterjectInput');

  badge.textContent = `XONG HIỆP ${turnCompleted}/3`;
  statusText.textContent = `Hiệp ${turnCompleted} đã xong. Sếp muốn tiếp tục sang Hiệp ${turnCompleted + 1} hay Gõ Búa chốt luôn?`;
  controls.classList.remove('hidden');
  interjectInput.value = '';

  return new Promise((resolve) => {
    state.debateSession.resolver = resolve;
  });
}

async function handleDebateRoomSubmit(userText) {
  const groqEmp = state.employees.find((e) => e.id === 'groq');
  const secEmp = state.employees.find((e) => e.id === 'mistral');
  const profEmp = state.employees.find((e) => e.id === 'gemini');

  // Chọn người mở màn Hiệp 1 (@thư_ký hoặc @tốc_độ)
  const proposer = getEmployeeStatus(secEmp) === 'active' ? secEmp : groqEmp;

  if (!state.employees.some((e) => getEmployeeStatus(e) === 'active')) {
    appendSystemMessage('⚠️ Chưa có nhân viên nào được cấp API Key để mở phiên tranh luận!');
    return;
  }

  const badge = document.getElementById('debateTurnBadge');
  const statusText = document.getElementById('debateStatusText');
  const controls = document.getElementById('bossOverrideControls');

  // --- HIỆP 1: ĐỀ XUẤT ---
  badge.textContent = 'HIỆP 1/3 - ĐỀ XUẤT';
  statusText.textContent = `${proposer.nickname} đang trình bày phương án giải quyết đầu tiên...`;
  controls.classList.add('hidden');

  const turn1Res = await executeWithAutoFallback(
    proposer,
    `[HIỆP 1 - ĐỀ XUẤT PHƯƠNG ÁN]\nYêu cầu của Sếp: "${userText}"\nHãy đưa ra phương án giải quyết chi tiết, rõ ràng nhất theo chuyên môn của bạn.`
  );
  appendAIMessage(turn1Res.employee, `### 🥊 HIỆP 1 (Đề xuất phương án)\n\n${turn1Res.reply}`, userText, {
    isFallback: turn1Res.isFallback,
    replacedNickname: turn1Res.replacedNickname
  });

  // Tạm dừng chờ Sếp Gõ Búa hoặc Tiếp tục sang Hiệp 2
  const decision1 = await waitForBossDecisionBetweenTurns(1);
  controls.classList.add('hidden');

  if (decision1.action === 'stop') {
    badge.textContent = 'ĐÃ CHỐT HẠ (HIỆP 1)';
    statusText.textContent = '🔨 Sếp đã Gõ Búa chốt phương án ngay sau Hiệp 1! Tiết kiệm 2 lượt API.';
    appendSystemMessage('🔨 **Sếp đã Gõ Búa!** Dừng tranh luận và chốt phương án tại Hiệp 1.');
    return;
  }

  // --- HIỆP 2: PHẢN BIỆN - VẠCH LÁ TÌM SÂU (@giáo_sư) ---
  badge.textContent = 'HIỆP 2/3 - PHẢN BIỆN';
  statusText.textContent = `${profEmp.nickname} đang vạch lá tìm sâu phương án Hiệp 1...`;

  const bossNote1 = decision1.interject
    ? `\n(Chỉ đạo bổ sung của Sếp: "${decision1.interject}")`
    : '';

  const critiquePrompt = `Yêu cầu gốc của Sếp: "${userText}"
Phương án Hiệp 1 của đồng nghiệp (${turn1Res.employee.nickname}):
"""
${turn1Res.reply}
"""${bossNote1}

Hãy đóng vai người phản biện khó tính, chỉ ra 3 lỗ hổng logic, điểm yếu hoặc thiếu sót trong câu trả lời trên của đồng nghiệp.`;

  const turn2Res = await executeWithAutoFallback(profEmp, critiquePrompt, {
    skipAutoDocContext: true
  });
  appendAIMessage(turn2Res.employee, `### 🔍 HIỆP 2 (Phản biện - Vạch lá tìm sâu)\n\n${turn2Res.reply}`, userText, {
    isFallback: turn2Res.isFallback,
    replacedNickname: turn2Res.replacedNickname
  });

  // Tạm dừng chờ Sếp Gõ Búa hoặc Tiếp tục sang Hiệp 3
  const decision2 = await waitForBossDecisionBetweenTurns(2);
  controls.classList.add('hidden');

  if (decision2.action === 'stop') {
    badge.textContent = 'ĐÃ CHỐT HẠ (HIỆP 2)';
    statusText.textContent = '🔨 Sếp đã Gõ Búa dừng tranh luận sau Hiệp 2!';
    appendSystemMessage('🔨 **Sếp đã Gõ Búa!** Dừng tranh luận sau Hiệp 2.');
    return;
  }

  // --- HIỆP 3: CHỐT HẠ ---
  badge.textContent = 'HIỆP 3/3 - CHỐT HẠ';
  statusText.textContent = 'Đang tổng hợp Hiệp 1 & Hiệp 2 để viết bản hoàn chỉnh cuối cùng...';

  const bossNote2 = decision2.interject
    ? `\nChỉ đạo chốt hạ của Sếp: "${decision2.interject}"`
    : '';

  const finalSynthesizer = getEmployeeStatus(secEmp) === 'active' ? secEmp : profEmp;
  const synthesisPrompt = `Yêu cầu gốc của Sếp: "${userText}"

---
[PHƯƠNG ÁN HIỆP 1]:
${turn1Res.reply}

---
[PHẢN BIỆN HIỆP 2 CỦA @giáo_sư]:
${turn2Res.reply}
${bossNote2}

---
NHIỆM VỤ HIỆP 3 (CHỐT HẠ): Hãy tổng hợp toàn bộ ưu điểm của Hiệp 1, khắc phục triệt để 3 lỗ hổng đã nêu ở Hiệp 2 để viết lại bản hoàn chỉnh cuối cùng không còn lỗi sai trình lên Sếp.`;

  const turn3Res = await executeWithAutoFallback(finalSynthesizer, synthesisPrompt, {
    skipAutoDocContext: true
  });
  appendAIMessage(
    turn3Res.employee,
    `### 🏆 HIỆP 3 (Bản Chốt Hạ Hoàn Chỉnh Trình Sếp)\n\n${turn3Res.reply}`,
    userText,
    {
      isFallback: turn3Res.isFallback,
      replacedNickname: turn3Res.replacedNickname
    }
  );

  badge.textContent = 'HOÀN TẤT 3/3 HIỆP';
  statusText.textContent = 'Phiên phản biện 3 hiệp đã hoàn tất mỹ mãn!';
}

// ============================================================================
// 9. HIỂN THỊ TIN NHẮN, BẮT TAG [CHUYỂN_TIẾP: @tên] & THANH CÔNG CỤ
// ============================================================================
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findMessageById(msgId) {
  const list = state.messagesByRoom[state.currentRoom] || [];
  return list.find((m) => m.id === msgId);
}

function appendBossMessage(text, attachmentsSnapshot = []) {
  const msg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    sender: 'boss',
    content: text,
    attachments: attachmentsSnapshot,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  state.messagesByRoom[state.currentRoom].push(msg);
  saveRoomMessagesToDB(state.currentRoom);
  renderChatMessages();
}

function appendSystemMessage(markdownText) {
  const msg = {
    id: 'sys_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    sender: 'system',
    content: markdownText,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };
  state.messagesByRoom[state.currentRoom].push(msg);
  saveRoomMessagesToDB(state.currentRoom);
  renderChatMessages();
}

function appendAIMessage(employee, replyText, originalBossQuery, meta = {}) {
  // Quét Regex bắt tag [CHUYỂN_TIẾP: @tên]
  const forwardRegex = /\[CHUYỂN_TIẾP:\s*(@[^\]]+)\]/i;
  const match = replyText.match(forwardRegex);
  const forwardTarget = match ? match[1].trim() : null;

  const msg = {
    id: 'ai_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    sender: 'ai',
    employeeId: employee.id,
    employeeNickname: employee.nickname,
    employeeRole: employee.role,
    employeeColor: employee.color,
    employeeAvatar: employee.avatarText,
    content: replyText,
    originalQuery: originalBossQuery,
    forwardTarget,
    isFallback: Boolean(meta.isFallback),
    replacedNickname: meta.replacedNickname || null,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  };

  state.messagesByRoom[state.currentRoom].push(msg);
  saveRoomMessagesToDB(state.currentRoom);
  renderChatMessages();
}

function renderChatMessages() {
  const container = document.getElementById('chatContainer');
  const messages = state.messagesByRoom[state.currentRoom] || [];

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 opacity-75">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mb-3">
          <i data-lucide="sparkles" class="w-7 h-7"></i>
        </div>
        <h3 class="font-bold text-sm mb-1">Chào mừng Sếp đến với AI Office!</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hãy click vào các nhân viên ở cột bên trái để cấp <b>API Key</b>. Gõ <b>@</b> trong ô chat để gọi đích danh nhân viên hoặc đính kèm file <b>.pdf / .docx</b> (bóc chữ tốn 0 API).
        </p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = messages
    .map((m) => {
      if (m.sender === 'system') {
        return `
          <div class="flex justify-center">
            <div class="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs max-w-2xl text-center">
              ${window.marked ? window.marked.parseInline(m.content) : escapeHtml(m.content)}
            </div>
          </div>
        `;
      }

      if (m.sender === 'boss') {
        const attHtml = (m.attachments || [])
          .map((a) =>
            a.type === 'doc'
              ? `<span class="inline-block text-[11px] bg-indigo-700/60 px-2 py-0.5 rounded mr-1">📄 ${escapeHtml(a.name)} (${a.wordCount} từ)</span>`
              : `<img src="${a.previewUrl}" class="w-24 h-24 object-cover rounded-lg border border-white/20 mt-1" />`
          )
          .join('');

        return `
          <div class="flex justify-end">
            <div class="max-w-2xl bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md space-y-1.5">
              <div class="flex items-center justify-between gap-4 text-[10px] text-indigo-200">
                <span class="font-bold uppercase tracking-wider">👔 SẾP CHỈ ĐẠO</span>
                <span>${m.timestamp}</span>
              </div>
              ${attHtml ? `<div class="pt-1">${attHtml}</div>` : ''}
              <div class="text-sm whitespace-pre-wrap leading-relaxed">${escapeHtml(m.content)}</div>
            </div>
          </div>
        `;
      }

      // Tin nhắn của Nhân viên AI
      const renderedMarkdown = window.marked
        ? window.marked.parse(m.content)
        : `<p>${escapeHtml(m.content)}</p>`;

      const fallbackBadge = m.isFallback
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">🔄 Làm thay cho ${escapeHtml(m.replacedNickname)}</span>`
        : '';

      // Nút tự động hiển thị khi phát hiện tag [CHUYỂN_TIẾP: @tên]
      const autoForwardBtn = m.forwardTarget
        ? `
          <div class="mt-3 pt-2.5 border-t border-slate-200 dark:border-[#2a2f3d]">
            <button
              onclick="forwardTaskToEmployee('${m.id}', '${escapeHtml(m.forwardTarget)}')"
              class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition"
            >
              <span>👉 Chuyển việc này cho <b>${escapeHtml(m.forwardTarget)}</b> xử lý ngay</span>
            </button>
          </div>
        `
        : '';

      // Menu Đá việc chủ động
      const otherEmployeesOptions = state.employees
        .filter((e) => e.id !== m.employeeId)
        .map(
          (e) =>
            `<option value="${escapeHtml(e.nickname)}">Đá việc sang ${escapeHtml(e.nickname)} (${escapeHtml(e.name)})</option>`
        )
        .join('');

      return `
        <div class="flex items-start gap-3 max-w-3xl">
          <div class="w-9 h-9 rounded-full ${m.employeeColor} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
            ${m.employeeAvatar}
          </div>
          <div class="flex-1 bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2f3d] rounded-2xl rounded-tl-sm p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-[#2a2f3d]">
              <div class="flex items-center gap-2">
                <span class="font-bold text-xs text-indigo-600 dark:text-indigo-400">${escapeHtml(m.employeeNickname)}</span>
                <span class="text-[11px] text-slate-400">${escapeHtml(m.employeeRole)}</span>
                ${fallbackBadge}
              </div>
              <span class="text-[10px] text-slate-400">${m.timestamp}</span>
            </div>

            <div class="ai-markdown text-sm text-slate-700 dark:text-slate-200">
              ${renderedMarkdown}
            </div>

            ${autoForwardBtn}

            <!-- Thanh công cụ dưới mỗi tin nhắn AI -->
            <div class="mt-3 pt-2 border-t border-slate-100 dark:border-[#2a2f3d] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-1.5">
                <button onclick="copyAIMessage('${m.id}')" class="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262b38] flex items-center gap-1 transition">
                  📋 Copy
                </button>
                <button onclick="exportMessageToDocx('${m.id}')" class="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262b38] flex items-center gap-1 transition text-blue-500">
                  📝 Xuất Word (.docx)
                </button>
                <button onclick="exportMessageToPDF('${m.id}')" class="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#262b38] flex items-center gap-1 transition text-rose-500">
                  📄 Xuất PDF
                </button>
              </div>

              <div class="flex items-center gap-1">
                <select
                  onchange="if(this.value){ forwardTaskToEmployee('${m.id}', this.value); this.value=''; }"
                  class="bg-slate-100 dark:bg-[#262b38] border border-slate-200 dark:border-[#343b4d] rounded-lg px-2 py-1 text-[11px] focus:outline-none cursor-pointer"
                >
                  <option value="">↪️ Đá việc (Chuyển tiếp)...</option>
                  ${otherEmployeesOptions}
                </select>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  container.scrollTop = container.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

window.copyAIMessage = function (msgId) {
  const msg = findMessageById(msgId);
  if (!msg) return;
  navigator.clipboard.writeText(msg.content);
};

// Khi bấm nút "👉 Chuyển việc này cho @tên xử lý ngay" hoặc chọn từ menu Đá việc
window.forwardTaskToEmployee = async function (msgId, targetNickname) {
  const msg = findMessageById(msgId);
  if (!msg) return;

  const targetEmp = state.employees.find(
    (e) => e.nickname.toLowerCase() === targetNickname.toLowerCase()
  );
  if (!targetEmp) {
    alert(`Không tìm thấy nhân viên có biệt danh ${targetNickname}`);
    return;
  }

  const forwardedPrompt = `Yêu cầu gốc của Sếp: "${msg.originalQuery || 'Xử lý nội dung trước đó'}"\n\nGhi chú từ đồng nghiệp ${msg.employeeNickname} vừa bàn giao sang:\n"""\n${msg.content}\n"""\n\nHãy tiếp nhận và xử lý hoàn chỉnh yêu cầu này cho Sếp!`;

  if (getEmployeeStatus(targetEmp) === 'leave') {
    openLeaveAlertModal(targetEmp, forwardedPrompt);
    return;
  }

  const result = await executeWithAutoFallback(targetEmp, forwardedPrompt);
  appendAIMessage(result.employee, result.reply, msg.originalQuery, {
    isFallback: result.isFallback,
    replacedNickname: result.replacedNickname
  });
};

// ============================================================================
// 10. HIỆU ỨNG "ĐANG NHẬP...", SIDEBAR NHÂN SỰ, MODAL & AUTOCOMPLETE @
// ============================================================================
function showTypingIndicator(emp, customStatusText = 'đang suy nghĩ...') {
  const box = document.getElementById('typingIndicator');
  const avatar = document.getElementById('typingAvatar');
  const text = document.getElementById('typingText');

  avatar.className = `w-8 h-8 rounded-full ${emp.color} flex items-center justify-center text-white text-sm font-bold shadow`;
  avatar.textContent = emp.avatarText;
  text.textContent = `${emp.nickname} ${customStatusText}`;
  box.classList.remove('hidden');
}

function hideTypingIndicator() {
  document.getElementById('typingIndicator').classList.add('hidden');
}

function renderSidebarEmployees() {
  const container = document.getElementById('employeeList');
  container.innerHTML = state.employees
    .map((emp) => {
      const status = getEmployeeStatus(emp);
      let badgeHtml = '';
      let cardOpacity = '';

      if (status === 'active') {
        badgeHtml = `<span class="text-[10px] text-emerald-500 font-medium flex items-center gap-1">🟢 Đang hoạt động</span>`;
      } else if (status === 'leave') {
        badgeHtml = `<span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">⚪ Nghỉ phép (Chưa có Key)</span>`;
        cardOpacity = 'opacity-60 hover:opacity-100';
      } else if (status === 'overload') {
        const remain = Math.max(1, Math.ceil((emp.cooldownUntil - Date.now()) / 1000));
        badgeHtml = `<span class="text-[10px] text-amber-500 font-semibold flex items-center gap-1">🟠 Uống trà đá (${remain}s)</span>`;
      }

      const percent = Math.min(100, Math.round(((emp.quotaUsed || 0) / (emp.quotaLimit || 200)) * 100));

      return `
        <div
          onclick="openEmployeeModal('${emp.id}')"
          class="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1e222d] hover:bg-indigo-50/60 dark:hover:bg-[#252a38] border border-slate-200/80 dark:border-[#2a2f3d] cursor-pointer transition ${cardOpacity}"
        >
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full ${emp.color} flex items-center justify-center text-white text-base font-bold shrink-0 shadow">
              ${emp.avatarText}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">${escapeHtml(emp.nickname)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-[#2a2f3d] text-slate-500 dark:text-slate-300">${escapeHtml(emp.name)}</span>
              </div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(emp.role)}</div>
              <div class="mt-0.5">${badgeHtml}</div>
            </div>
          </div>

          <!-- Thanh Thể lực (Quota Bar) -->
          <div class="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-[#2a2f3d]">
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Thể lực (Quota ngày)</span>
              <span class="font-semibold text-slate-600 dark:text-slate-300">${emp.quotaUsed || 0}/${emp.quotaLimit || 200} lượt</span>
            </div>
            <div class="w-full h-1.5 bg-slate-200 dark:bg-[#12151e] rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 transition-all duration-300" style="width: ${percent}%"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// --- Modal Hồ Sơ Nhân Viên ---
window.openEmployeeModal = function (empId) {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp) return;
  state.editingEmployeeId = empId;

  document.getElementById('modalAvatar').className = `w-11 h-11 rounded-full ${emp.color} flex items-center justify-center text-white font-bold text-lg`;
  document.getElementById('modalAvatar').textContent = emp.avatarText;
  document.getElementById('modalTitle').textContent = `${emp.name} (${emp.nickname})`;
  document.getElementById('modalRole').textContent = emp.role;

  document.getElementById('modalNickname').value = emp.nickname;
  document.getElementById('modalModel').value = emp.model;
  document.getElementById('modalApiKey').value = emp.apiKey || '';
  document.getElementById('modalAccountId').value = emp.accountId || '';
  document.getElementById('modalQuotaLimit').value = emp.quotaLimit || 200;
  document.getElementById('modalSystemPrompt').value = emp.systemPrompt || emp.defaultPrompt;

  const cfGroup = document.getElementById('cloudflareAccountGroup');
  if (emp.id === 'cloudflare') {
    cfGroup.classList.remove('hidden');
  } else {
    cfGroup.classList.add('hidden');
  }

  const modal = document.getElementById('employeeModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

function closeEmployeeModal() {
  const modal = document.getElementById('employeeModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  state.editingEmployeeId = null;
}

// --- Modal Cảnh báo gọi nhầm người đang Nghỉ phép ---
function openLeaveAlertModal(emp, pendingQuery) {
  state.pendingLeaveContext = { emp, pendingQuery };
  document.getElementById('leaveModalTitle').textContent = `${emp.nickname} đang nghỉ phép!`;
  document.getElementById('leaveModalDesc').innerHTML = `Nhân viên <b>${escapeHtml(emp.nickname)} (${escapeHtml(emp.name)})</b> hiện chưa được cấp API Key nên đang trong trạng thái ⚪ <b>Nghỉ phép</b>. Sếp muốn cấp Key ngay hay nhờ <b>@đa_nhiệm</b> (hoặc đồng nghiệp khác) làm thay?`;

  const modal = document.getElementById('leaveAlertModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeLeaveAlertModal() {
  const modal = document.getElementById('leaveAlertModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// --- Popup Autocomplete khi gõ @ ---
function handleChatInputAutocomplete() {
  const chatInput = document.getElementById('chatInput');
  const popup = document.getElementById('mentionPopup');
  const listEl = document.getElementById('mentionList');

  const val = chatInput.value;
  const cursorPos = chatInput.selectionStart;
  const textBeforeCursor = val.slice(0, cursorPos);
  const match = textBeforeCursor.match(/@([^\s@]*)$/);

  if (!match) {
    popup.classList.add('hidden');
    return;
  }

  const keyword = match[1].toLowerCase();
  const filtered = state.employees.filter(
    (e) =>
      e.nickname.toLowerCase().includes(keyword) ||
      e.name.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    popup.classList.add('hidden');
    return;
  }

  listEl.innerHTML = filtered
    .map((emp) => {
      const st = getEmployeeStatus(emp);
      const dot = st === 'active' ? '🟢' : st === 'overload' ? '🟠' : '⚪';
      return `
        <button
          type="button"
          onclick="selectMention('${emp.nickname}')"
          class="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-[#262b38] flex items-center justify-between text-xs transition"
        >
          <div class="flex items-center gap-2">
            <span>${emp.avatarText}</span>
            <span class="font-bold text-indigo-600 dark:text-indigo-400">${escapeHtml(emp.nickname)}</span>
            <span class="text-[11px] text-slate-400 truncate max-w-[110px]">${escapeHtml(emp.name)}</span>
          </div>
          <span>${dot}</span>
        </button>
      `;
    })
    .join('');

  popup.classList.remove('hidden');
}

window.selectMention = function (nickname) {
  const chatInput = document.getElementById('chatInput');
  const cursorPos = chatInput.selectionStart;
  const textBefore = chatInput.value.slice(0, cursorPos);
  const textAfter = chatInput.value.slice(cursorPos);

  const replacedBefore = textBefore.replace(/@([^\s@]*)$/, `${nickname} `);
  chatInput.value = replacedBefore + textAfter;
  document.getElementById('mentionPopup').classList.add('hidden');
  chatInput.focus();
};

// ============================================================================
// 11. KHỞI TẠO SỰ KIỆN & ĐIỀU HƯỚNG PHÒNG HỌP
// ============================================================================
async function handleSendAction() {
  const chatInput = document.getElementById('chatInput');
  const text = chatInput.value.trim();
  if (!text && state.attachments.length === 0) return;

  const queryText = text || 'Hãy phân tích tài liệu / hình ảnh đính kèm giúp Sếp.';
  const currentAttachments = [...state.attachments];

  chatInput.value = '';
  document.getElementById('mentionPopup').classList.add('hidden');
  appendBossMessage(queryText, currentAttachments);

  try {
    if (state.currentRoom === 'direct') {
      await handleDirectRoomSubmit(queryText);
    } else if (state.currentRoom === 'pipeline') {
      await handlePipelineRoomSubmit(queryText);
    } else if (state.currentRoom === 'debate') {
      await handleDebateRoomSubmit(queryText);
    }
  } catch (err) {
    hideTypingIndicator();
    appendSystemMessage(`❌ **Lỗi thực thi:** ${err.message}`);
  } finally {
    // Xóa file đính kèm sau khi đã gửi xong lượt
    state.attachments = [];
    renderAttachmentBadges();
  }
}

function switchRoom(roomId) {
  state.currentRoom = roomId;
  document.querySelectorAll('.room-tab').forEach((btn) => {
    btn.classList.toggle('active-tab', btn.dataset.room === roomId);
  });

  const pipelineStepper = document.getElementById('pipelineStepper');
  const debateBar = document.getElementById('debateControlBar');
  const subtitle = document.getElementById('roomSubtitle');

  pipelineStepper.classList.toggle('hidden', roomId !== 'pipeline');
  debateBar.classList.toggle('hidden', roomId !== 'debate');

  if (roomId === 'direct') {
    subtitle.innerHTML = `<i data-lucide="info" class="w-3.5 h-3.5 text-indigo-400"></i><span>Gõ <b>@</b> để giao việc trực tiếp. </span>`;
  } else if (roomId === 'pipeline') {
    subtitle.innerHTML = `<i data-lucide="git-merge" class="w-3.5 h-3.5 text-indigo-400"></i><span>Tự động chạy 3 bước:  lọc Rerank &rarr;  chia việc JSON &rarr; Chuyên gia thực thi.</span>`;
  } else {
    subtitle.innerHTML = `<i data-lucide="swords" class="w-3.5 h-3.5 text-indigo-400"></i><span>Tranh luận tối đa 3 hiệp: Đề xuất &rarr;  Vạch lá tìm sâu &rarr; Chốt hạ.</span>`;
  }

  renderChatMessages();
}

window.addEventListener('DOMContentLoaded', async () => {
  loadConfigFromStorage();
  await loadAllRoomsFromDB();
  renderSidebarEmployees();
  renderChatMessages();
  if (window.lucide) window.lucide.createIcons();

  // Chuyển đổi Sáng / Tối
  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
  });

  // Xóa lịch sử phòng hiện tại
  document.getElementById('btnClearHistory').addEventListener('click', () => {
    if (confirm('Sếp có chắc muốn xóa toàn bộ lịch sử trò chuyện của phòng này?')) {
      state.messagesByRoom[state.currentRoom] = [];
      saveRoomMessagesToDB(state.currentRoom);
      renderChatMessages();
    }
  });

  // Lưu Sổ tay Công ty tự động
  const handbookEl = document.getElementById('companyHandbook');
  const badgeEl = document.getElementById('handbookSavedBadge');
  handbookEl.addEventListener('input', () => {
    state.handbook = handbookEl.value;
    localStorage.setItem('ai_office_handbook', state.handbook);
    badgeEl.classList.remove('opacity-0');
    clearTimeout(window._hbTimer);
    window._hbTimer = setTimeout(() => badgeEl.classList.add('opacity-0'), 1500);
  });

  // Chuyển đổi 3 Phòng Làm Việc
  document.querySelectorAll('.room-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchRoom(btn.dataset.room));
  });

  // Quick Chips
  document.querySelectorAll('.quick-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const chatInput = document.getElementById('chatInput');
      chatInput.value = chip.dataset.prompt + ' ';
      chatInput.focus();
    });
  });

  // Đính kèm file
  document.getElementById('btnAttach').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);

  // Ghi âm giọng nói
  document.getElementById('btnMic').addEventListener('click', toggleVoiceRecording);

  // Ô nhập chat & Autocomplete @
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('input', handleChatInputAutocomplete);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAction();
    }
  });
  document.getElementById('btnSend').addEventListener('click', handleSendAction);

  // Sự kiện trong Modal Hồ Sơ Nhân Viên
  document.getElementById('btnCloseModal').addEventListener('click', closeEmployeeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeEmployeeModal);

  document.getElementById('btnClearKey').addEventListener('click', () => {
    document.getElementById('modalApiKey').value = '';
  });

  document.getElementById('btnResetQuota').addEventListener('click', () => {
    const emp = state.employees.find((e) => e.id === state.editingEmployeeId);
    if (emp) {
      emp.quotaUsed = 0;
      emp.cooldownUntil = 0;
      saveEmployeesToStorage();
      renderSidebarEmployees();
    }
  });

  document.getElementById('btnResetPrompt').addEventListener('click', () => {
    const emp = state.employees.find((e) => e.id === state.editingEmployeeId);
    if (emp) {
      document.getElementById('modalSystemPrompt').value = emp.defaultPrompt;
    }
  });

  document.getElementById('btnSaveEmployee').addEventListener('click', () => {
    const emp = state.employees.find((e) => e.id === state.editingEmployeeId);
    if (!emp) return;

    let rawNick = document.getElementById('modalNickname').value.trim() || emp.nickname;
    if (!rawNick.startsWith('@')) rawNick = '@' + rawNick;

    emp.nickname = rawNick;
    emp.model = document.getElementById('modalModel').value.trim() || emp.model;
    emp.apiKey = document.getElementById('modalApiKey').value.trim();
    emp.accountId = document.getElementById('modalAccountId').value.trim();
    emp.quotaLimit = parseInt(document.getElementById('modalQuotaLimit').value, 10) || 200;
    emp.systemPrompt = document.getElementById('modalSystemPrompt').value.trim() || emp.defaultPrompt;

    saveEmployeesToStorage();
    renderSidebarEmployees();
    closeEmployeeModal();
  });

  // Sự kiện trong Modal Gọi nhầm người nghỉ phép
  document.getElementById('btnCloseLeaveModal').addEventListener('click', closeLeaveAlertModal);
  document.getElementById('btnGrantKeyNow').addEventListener('click', () => {
    const ctx = state.pendingLeaveContext;
    closeLeaveAlertModal();
    if (ctx && ctx.emp) openEmployeeModal(ctx.emp.id);
  });

  document.getElementById('btnDelegateBackup').addEventListener('click', async () => {
    const ctx = state.pendingLeaveContext;
    closeLeaveAlertModal();
    if (!ctx) return;

    const cfEmp = state.employees.find((e) => e.id === 'cloudflare');
    const backup =
      cfEmp && getEmployeeStatus(cfEmp) === 'active'
        ? cfEmp
        : state.employees.find((e) => getEmployeeStatus(e) === 'active');

    if (!backup) {
      alert('Hiện tại @đa_nhiệm và tất cả nhân viên khác đều chưa có API Key! Sếp hãy cấp ít nhất 1 API Key nhé.');
      openEmployeeModal('cloudflare');
      return;
    }

    const delegatedPrompt = `[LÀM_THAY_CHO: ${ctx.emp.nickname}]\n${ctx.pendingQuery}`;
    const res = await executeWithAutoFallback(backup, delegatedPrompt);
    appendAIMessage(res.employee, res.reply, ctx.pendingQuery, {
      isFallback: true,
      replacedNickname: ctx.emp.nickname
    });
  });

  // Nút Gõ Búa & Tiếp tục trong Phòng Phản Biện (Phòng 3)
  document.getElementById('btnDebateContinue').addEventListener('click', () => {
    if (state.debateSession.resolver) {
      const interject = document.getElementById('bossInterjectInput').value.trim();
      state.debateSession.resolver({ action: 'continue', interject });
      state.debateSession.resolver = null;
    }
  });

  document.getElementById('btnBossGavel').addEventListener('click', () => {
    if (state.debateSession.resolver) {
      state.debateSession.resolver({ action: 'stop' });
      state.debateSession.resolver = null;
    }
  });
});
