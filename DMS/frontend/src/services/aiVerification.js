/**
 * AI Verification Service
 * Routes to local AI agent (port 3002) → Gemini direct → rule-based fallback
 * 100% FREE — no paid API keys required.
 */

const AI_AGENT = 'http://localhost:3002';

// Cache agent availability for 20 seconds
let _agentOk = null;
let _agentChecked = 0;

async function isAgentUp() {
  const now = Date.now();
  if (_agentOk !== null && now - _agentChecked < 20000) return _agentOk;
  try {
    const r = await fetch(`${AI_AGENT}/health`, { signal: AbortSignal.timeout(2000) });
    _agentOk = r.ok;
  } catch {
    _agentOk = false;
  }
  _agentChecked = now;
  return _agentOk;
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseJSON(raw) {
  try { const m = raw.match(/\{[\s\S]*\}/); return JSON.parse(m ? m[0] : raw); } catch { return null; }
}

// ── Multilingual messages (mirrors server.js MSG) ─────────────────────────────
const MSGS = {
  en: {
    title_required: 'Title is required.',
    title_short:    (n) => `Title too short (${n} chars, need 8+).`,
    desc_required:  'Description is required.',
    desc_short:     (n) => `Description too short (${n} chars, need 20+).`,
    fake_title:     'Title appears to be a test or fake submission.',
    narrative:      'Description contains everyday narrative text — not an emergency.',
    no_emergency:   'No emergency-related content detected. Describe an actual emergency.',
    passed_reason:  (type) => `Report describes a plausible ${type} emergency.`,
    failed_reason:  'Report does not meet emergency verification standards.',
  },
  ar: {
    title_required: 'العنوان مطلوب.',
    title_short:    (n) => `العنوان قصير جداً (${n} حرفاً، يلزم 8+).`,
    desc_required:  'الوصف مطلوب.',
    desc_short:     (n) => `الوصف قصير جداً (${n} حرفاً، يلزم 20+).`,
    fake_title:     'يبدو أن العنوان اختباري أو مزيف.',
    narrative:      'يحتوي الوصف على نص يومي اعتيادي — وليس حالة طوارئ.',
    no_emergency:   'لم يُكتشف أي محتوى للطوارئ. يرجى وصف حادثة طوارئ حقيقية.',
    passed_reason:  (type) => `التقرير يصف حالة طوارئ من نوع ${type}.`,
    failed_reason:  'لا يستوفي التقرير معايير التحقق من حالات الطوارئ.',
  },
  fr: {
    title_required: 'Le titre est obligatoire.',
    title_short:    (n) => `Titre trop court (${n} caractères, il en faut 8+).`,
    desc_required:  'La description est obligatoire.',
    desc_short:     (n) => `Description trop courte (${n} caractères, il en faut 20+).`,
    fake_title:     'Le titre semble être un test ou une soumission fictive.',
    narrative:      "La description contient un texte quotidien ordinaire — pas une urgence.",
    no_emergency:   "Aucun contenu d'urgence détecté. Décrivez une vraie situation d'urgence.",
    passed_reason:  (type) => `Le rapport décrit une urgence de type ${type}.`,
    failed_reason:  "Le rapport ne répond pas aux normes de vérification des urgences.",
  },
  es: {
    title_required: 'El título es obligatorio.',
    title_short:    (n) => `Título demasiado corto (${n} caracteres, se necesitan 8+).`,
    desc_required:  'La descripción es obligatoria.',
    desc_short:     (n) => `Descripción demasiado corta (${n} caracteres, se necesitan 20+).`,
    fake_title:     'El título parece ser una prueba o envío falso.',
    narrative:      'La descripción contiene texto cotidiano — no es una emergencia.',
    no_emergency:   'No se detectó contenido de emergencia. Describa una emergencia real.',
    passed_reason:  (type) => `El informe describe una emergencia de tipo ${type}.`,
    failed_reason:  'El informe no cumple con los estándares de verificación de emergencias.',
  },
  tr: {
    title_required: 'Başlık zorunludur.',
    title_short:    (n) => `Başlık çok kısa (${n} karakter, en az 8 gerekli).`,
    desc_required:  'Açıklama zorunludur.',
    desc_short:     (n) => `Açıklama çok kısa (${n} karakter, en az 20 gerekli).`,
    fake_title:     'Başlık bir test veya sahte gönderim gibi görünüyor.',
    narrative:      'Açıklama günlük yaşam metni içeriyor — acil durum değil.',
    no_emergency:   'Acil durum içeriği algılanmadı. Gerçek bir acil durumu açıklayın.',
    passed_reason:  (type) => `Rapor, ${type} türünde bir acil durumu tanımlıyor.`,
    failed_reason:  'Rapor, acil durum doğrulama standartlarını karşılamıyor.',
  },
};

// ── Local rule engine (runs in browser, zero network calls) ───────────────────
function localRuleCheck({ title, description, type, severity, lang = 'en' }) {
  const m = MSGS[lang] || MSGS.en;
  const t = (title || '').trim();
  const d = (description || '').trim();
  const combined = (t + ' ' + d).toLowerCase();
  const issues = [];

  if (!t)                issues.push(m.title_required);
  else if (t.length < 8) issues.push(m.title_short(t.length));
  if (!d)                issues.push(m.desc_required);
  else if (d.length < 20) issues.push(m.desc_short(d.length));

  const fakeRe = /^(test|testing|abc|hello|hi|sample|dummy|asdf|xxx|fake)\b/i;
  if (fakeRe.test(t)) issues.push(m.fake_title);

  const narrative = /اكل.*التفاحة|ذهب.*للمدرسة|يحب الاكل|ما بحب|وين راح|يلعب بالحديقة|\b(ate the apple|went to school|doing homework|playing in the park|i don't like|where did he go)\b/i;
  const isNarrative = narrative.test(d);
  if (isNarrative) issues.push(m.narrative);

  const emergency = /fire|flame|smoke|flood|crash|injur|bleed|trapped|earthquake|storm|hazmat|chemical|gas leak|medical|heart|unconscious|help|sos|حريق|حادث|فيضان|زلزال|مصاب|عالق|طبي|طوارئ|مساعدة|نار|دخان|incendie|inondation|urgence|fuego|emergencia|yangın|acil/i;
  const hasEmergency = emergency.test(combined);
  if (!hasEmergency && d.length >= 20) issues.push(m.no_emergency);

  const score = issues.length === 0 ? 82 : Math.max(0, 80 - issues.length * 30);
  return {
    passed: score >= 70 && !isNarrative && hasEmergency,
    score,
    issues,
    reasoning: issues.length ? issues[0] : m.passed_reason(type),
    type_matches_description: true,
    has_actionable_details: hasEmergency && !isNarrative,
    severity_appropriate: true,
    is_fake_or_test: isNarrative || fakeRe.test(t),
    _source: 'browser-rules',
  };
}

// ── Fast pre-check translations ───────────────────────────────────────────────
const PRE = {
  en: {
    title_req:  'Title is required.',
    title_sh:   (n) => `Title too short (${n} chars).`,
    desc_req:   'Description is required.',
    desc_sh:    (n) => `Description too short (${n} chars).`,
    gps:        (s) => `${s} severity requires a GPS location pin.`,
    fake:       'Title looks like a test. False reports are a criminal offence.',
  },
  ar: {
    title_req:  'العنوان مطلوب.',
    title_sh:   (n) => `العنوان قصير (${n} أحرف).`,
    desc_req:   'الوصف مطلوب.',
    desc_sh:    (n) => `الوصف قصير (${n} أحرف).`,
    gps:        (s) => `خطورة ${s} تتطلب تحديد موقع GPS.`,
    fake:       'يبدو العنوان اختبارياً. التبليغ الكاذب جريمة يعاقب عليها القانون.',
  },
  fr: {
    title_req:  'Le titre est obligatoire.',
    title_sh:   (n) => `Titre trop court (${n} caractères).`,
    desc_req:   'La description est obligatoire.',
    desc_sh:    (n) => `Description trop courte (${n} caractères).`,
    gps:        (s) => `La gravité ${s} nécessite un point GPS.`,
    fake:       'Le titre ressemble à un test. Les faux rapports sont une infraction pénale.',
  },
  es: {
    title_req:  'El título es obligatorio.',
    title_sh:   (n) => `Título demasiado corto (${n} caracteres).`,
    desc_req:   'La descripción es obligatoria.',
    desc_sh:    (n) => `Descripción demasiado corta (${n} caracteres).`,
    gps:        (s) => `La gravedad ${s} requiere una ubicación GPS.`,
    fake:       'El título parece una prueba. Los informes falsos son un delito penal.',
  },
  tr: {
    title_req:  'Başlık zorunludur.',
    title_sh:   (n) => `Başlık çok kısa (${n} karakter).`,
    desc_req:   'Açıklama zorunludur.',
    desc_sh:    (n) => `Açıklama çok kısa (${n} karakter).`,
    gps:        (s) => `${s} önemi için GPS konumu gereklidir.`,
    fake:       'Başlık test gibi görünüyor. Sahte raporlar suçtur.',
  },
};

// ── Main export ───────────────────────────────────────────────────────────────
export async function verifyIncidentWithAI({ title, description, type, severity, imageFile, lang = 'en' }) {
  if (await isAgentUp()) {
    try {
      const body = { title, description, type, severity, lang };
      if (imageFile?.type?.startsWith('image/')) {
        body.imageBase64 = await fileToBase64(imageFile);
        body.mimeType    = imageFile.type;
        // pass context so image analysis knows what to look for
        body.title       = title;
        body.description = description;
        body.severity    = severity;
      }
      const endpoint = imageFile ? '/verify-full' : '/verify-incident';
      const r = await fetch(`${AI_AGENT}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        _agentOk = true;
        return await r.json();
      }
    } catch (e) {
      console.warn('[AI] Agent failed:', e.message);
      _agentOk = false;
    }
  }

  return localRuleCheck({ title, description, type, severity, lang });
}

// ── Fast pre-check (sync, no network) ────────────────────────────────────────
export function fastPreCheck({ title, description, severity, latitude, longitude, lang = 'en' }) {
  const p = PRE[lang] || PRE.en;
  const reasons = [];
  const t = (title || '').trim();
  const d = (description || '').trim();

  if (!t)                reasons.push({ icon: 'type',                   text: p.title_req });
  else if (t.length < 8) reasons.push({ icon: 'type',                   text: p.title_sh(t.length) });
  if (!d)                reasons.push({ icon: 'chat-left-text',          text: p.desc_req });
  else if (d.length < 20) reasons.push({ icon: 'chat-left-text',        text: p.desc_sh(d.length) });
  if (!latitude || !longitude) {
    if (severity === 'HIGH' || severity === 'CRITICAL')
      reasons.push({ icon: 'geo-alt-fill', text: p.gps(severity) });
  }
  const fake = /^(test|testing|abc|hello|hi|sample|dummy|asdf|xxx|fake)\b/i;
  if (fake.test(t)) reasons.push({ icon: 'exclamation-triangle-fill', text: p.fake });

  return { blocked: reasons.length > 0, reasons };
}
