/**
 * DMS AI Agent — 100% FREE, no API key needed
 * Uses Google Gemini FREE tier (1500 req/day, no billing required)
 * Falls back to smart rule-based engine if Gemini is unavailable
 *
 * Port: 3002 (avoids conflict with Vite dev server on 3000/3001)
 */

import express from 'express';
import cors from 'cors';
import { requireUser } from './auth.js';

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(express.json({ limit: '20mb' }));
const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',').map(x => x.trim());
app.use(cors({ origin: origins }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use(requireUser({ backendUrl: process.env.BACKEND_URL || 'http://localhost:9090' }));

// ── Gemini config ─────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = { requests: 0, geminiCalls: 0, ruleCalls: 0, blocked: 0, passed: 0, errors: 0, start: Date.now() };

// ── Gemini API call ───────────────────────────────────────────────────────────
async function callGemini(parts) {
  if (!GEMINI_KEY) throw new Error('No Gemini API key — using rule engine');
  const { default: fetch } = await import('node-fetch');
  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const jsonStr = JSON.stringify(body);
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(jsonStr, 'utf8').toString(),
    },
    body: Buffer.from(jsonStr, 'utf8'),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Gemini response');
  return JSON.parse(match[0]);
}

// ── Multilingual messages for rule engine ─────────────────────────────────────
const MSG = {
  en: {
    title_required:    'Title is required.',
    title_short:       (n) => `Title too short (${n} chars, need 8+).`,
    desc_required:     'Description is required.',
    desc_short:        (n) => `Description too short (${n} chars, need 20+).`,
    fake_title:        'Title appears to be a test or fake submission.',
    narrative:         'Description contains everyday narrative text — not an emergency.',
    no_emergency:      'No emergency-related content detected. Describe an actual emergency.',
    type_mismatch:     (type) => `Description does not match incident type "${type}".`,
    critical_short:    (n) => `CRITICAL severity needs more detail (${n} chars, need 50+).`,
    passed_reason:     (type) => `Report describes a plausible ${type} emergency with sufficient detail.`,
    failed_reason:     'Report does not meet emergency verification standards.',
  },
  ar: {
    title_required:    'العنوان مطلوب.',
    title_short:       (n) => `العنوان قصير جداً (${n} حرفاً، يلزم 8+).`,
    desc_required:     'الوصف مطلوب.',
    desc_short:        (n) => `الوصف قصير جداً (${n} حرفاً، يلزم 20+).`,
    fake_title:        'يبدو أن العنوان اختباري أو مزيف.',
    narrative:         'يحتوي الوصف على نص يومي اعتيادي — وليس حالة طوارئ.',
    no_emergency:      'لم يُكتشف أي محتوى للطوارئ. يرجى وصف حادثة طوارئ حقيقية.',
    type_mismatch:     (type) => `الوصف لا يتطابق مع نوع الحادثة "${type}".`,
    critical_short:    (n) => `الخطورة الحرجة تتطلب مزيداً من التفاصيل (${n} حرفاً، يلزم 50+).`,
    passed_reason:     (type) => `التقرير يصف حالة طوارئ من نوع ${type} مع تفاصيل كافية.`,
    failed_reason:     'لا يستوفي التقرير معايير التحقق من حالات الطوارئ.',
  },
  fr: {
    title_required:    'Le titre est obligatoire.',
    title_short:       (n) => `Titre trop court (${n} caractères, il en faut 8+).`,
    desc_required:     'La description est obligatoire.',
    desc_short:        (n) => `Description trop courte (${n} caractères, il en faut 20+).`,
    fake_title:        'Le titre semble être un test ou une soumission fictive.',
    narrative:         'La description contient un texte quotidien ordinaire — pas une urgence.',
    no_emergency:      'Aucun contenu d\'urgence détecté. Décrivez une vraie situation d\'urgence.',
    type_mismatch:     (type) => `La description ne correspond pas au type d'incident "${type}".`,
    critical_short:    (n) => `La gravité CRITIQUE nécessite plus de détails (${n} caractères, il en faut 50+).`,
    passed_reason:     (type) => `Le rapport décrit une urgence de type ${type} avec suffisamment de détails.`,
    failed_reason:     'Le rapport ne répond pas aux normes de vérification des urgences.',
  },
  es: {
    title_required:    'El título es obligatorio.',
    title_short:       (n) => `Título demasiado corto (${n} caracteres, se necesitan 8+).`,
    desc_required:     'La descripción es obligatoria.',
    desc_short:        (n) => `Descripción demasiado corta (${n} caracteres, se necesitan 20+).`,
    fake_title:        'El título parece ser una prueba o envío falso.',
    narrative:         'La descripción contiene texto cotidiano — no es una emergencia.',
    no_emergency:      'No se detectó contenido de emergencia. Describa una emergencia real.',
    type_mismatch:     (type) => `La descripción no coincide con el tipo de incidente "${type}".`,
    critical_short:    (n) => `La gravedad CRÍTICA requiere más detalles (${n} caracteres, se necesitan 50+).`,
    passed_reason:     (type) => `El informe describe una emergencia de tipo ${type} con detalles suficientes.`,
    failed_reason:     'El informe no cumple con los estándares de verificación de emergencias.',
  },
  tr: {
    title_required:    'Başlık zorunludur.',
    title_short:       (n) => `Başlık çok kısa (${n} karakter, en az 8 gerekli).`,
    desc_required:     'Açıklama zorunludur.',
    desc_short:        (n) => `Açıklama çok kısa (${n} karakter, en az 20 gerekli).`,
    fake_title:        'Başlık bir test veya sahte gönderim gibi görünüyor.',
    narrative:         'Açıklama günlük yaşam metni içeriyor — acil durum değil.',
    no_emergency:      'Acil durum içeriği algılanmadı. Gerçek bir acil durumu açıklayın.',
    type_mismatch:     (type) => `Açıklama "${type}" olay türüyle eşleşmiyor.`,
    critical_short:    (n) => `KRİTİK önem daha fazla ayrıntı gerektiriyor (${n} karakter, en az 50 gerekli).`,
    passed_reason:     (type) => `Rapor, yeterli ayrıntıyla birlikte ${type} türünde bir acil durumu tanımlıyor.`,
    failed_reason:     'Rapor, acil durum doğrulama standartlarını karşılamıyor.',
  },
};

// ── Rule-based AI fallback (no API, no key, works offline) ───────────────────
function ruleBasedVerify({ title, description, type, severity, lang = 'en' }) {
  const m = MSG[lang] || MSG.en;
  const t = (title || '').trim().toLowerCase();
  const d = (description || '').trim().toLowerCase();
  const combined = t + ' ' + d;
  const issues = [];

  // 1. Basic length checks
  if (!t) { issues.push(m.title_required); }
  else if (t.length < 8) { issues.push(m.title_short(t.length)); }

  if (!d) { issues.push(m.desc_required); }
  else if (d.length < 20) { issues.push(m.desc_short(d.length)); }

  // 2. Obvious fake/test detection
  const fakePatterns = [
    /^(test|testing|abc|hello|hi|sample|dummy|asdf|qwerty|xxx|aaa|zzz|foo|bar|lol|fake|random)\b/,
    /^(.)\1{5,}$/,
  ];
  if (fakePatterns.some(p => p.test(t))) {
    issues.push(m.fake_title);
  }

  // 3. Narrative / everyday life detection (Arabic + English + FR + ES + TR)
  const narrativeAr = /اكل|التفاحة|المدرسة|ذهب للمدرسة|يلعب|يحب الاكل|البنت|الولد|ما بحب|وين راح|يتكلم|يقرأ|الدرس|واجبات|رحت السوق/;
  const narrativeEn = /\b(ate|eating|apple|school|homework|playing|went to school|i don't like|where did he go|reading a book|doing homework|went shopping)\b/;
  const narrativeFr = /\b(mangé|pomme|école|devoirs|jouer|est allé|n'aime pas|où est-il|lire un livre)\b/;
  const narrativeEs = /\b(comió|manzana|escuela|tarea|jugar|fue a la escuela|no le gusta|dónde fue|leyendo)\b/;
  const narrativeTr = /\b(yedi|elma|okul|ödev|oynuyor|okula gitti|sevmiyor|nereye gitti|kitap okuyor)\b/;

  const isNarrative = [narrativeAr, narrativeEn, narrativeFr, narrativeEs, narrativeTr].some(p => p.test(d));
  if (isNarrative) {
    issues.push(m.narrative);
  }

  // 4. Emergency vocabulary check (multilingual)
  const emergencyVocab = /fire|flame|smoke|burn|flood|water|overflow|crash|collision|accident|injur|bleed|trapped|victim|dead|earthquake|tremor|collapse|storm|hurricane|tornado|hazmat|chemical|gas leak|toxic|medical|heart|breathing|unconscious|seizure|help|sos|emergency|urgent|حريق|نار|دخان|حادث|اصطدام|مصاب|جريح|عالق|فيضان|سيل|زلزال|هزة|عاصفة|غاز|تسرب|طبي|قلب|لا يتنفس|طوارئ|مساعدة|incendie|inondation|blessé|séisme|tempête|chimique|médical|urgence|fuego|inundación|herido|terremoto|tormenta|químico|emergencia|yangın|sel|kaza|yaralı|deprem|fırtına|kimyasal|acil/i;

  const hasEmergency = emergencyVocab.test(combined);
  if (!hasEmergency && d.length >= 20) {
    issues.push(m.no_emergency);
  }

  // 5. Type-specific keyword match
  const typeKeywords = {
    FIRE:       /fire|flame|smoke|burn|blaze|حريق|نار|دخان|لهب|incendie|fuego|yangın/i,
    FLOOD:      /flood|overflow|inundat|water level|river|dam|سيل|فيضان|مياه|inondation|inundación|sel/i,
    EARTHQUAKE: /earthquake|tremor|shake|collapse|rubble|زلزال|هزة|انهيار|séisme|terremoto|deprem/i,
    STORM:      /storm|hurricane|tornado|cyclone|wind|lightning|عاصفة|رياح|برق|tempête|tormenta|fırtına/i,
    ACCIDENT:   /crash|collision|accident|hit|vehicle|car|truck|road|حادث|اصطدام|سيارة|طريق|choque|kaza/i,
    MEDICAL:    /medical|heart|stroke|breath|unconscious|seizure|overdose|طبي|قلب|لا يتنفس|إغماء|médical|tıbbi/i,
    HAZMAT:     /hazmat|chemical|gas|leak|toxic|poison|spill|مواد خطرة|غاز|تسرب|سمي|chimique|químico|kimyasal/i,
  };
  if (type !== 'OTHER' && typeKeywords[type] && !typeKeywords[type].test(combined)) {
    issues.push(m.type_mismatch(type));
  }

  // 6. Severity constraints
  if (severity === 'CRITICAL' && d.length < 50) {
    issues.push(m.critical_short(d.length));
  }

  // Score calculation
  let score = 100;
  score -= issues.filter(i => [m.narrative, m.no_emergency, m.fake_title].includes(i)).length * 50;
  score -= issues.filter(i => [m.title_required, m.desc_required].includes(i) || i.includes('short') || i.includes('court') || i.includes('corto') || i.includes('kısa') || i.includes('قصير')).length * 20;
  score -= issues.filter(i => i.includes('match') || i.includes('correspond') || i.includes('coincide') || i.includes('eşleşmiyor') || i.includes('يتطابق')).length * 25;
  score -= issues.filter(i => i.includes('CRITICAL') || i.includes('KRİTİK') || i.includes('الحرجة') || i.includes('CRITIQUE')).length * 15;
  score = Math.max(0, Math.min(100, score));

  const passed = score >= 70 && !isNarrative && hasEmergency;

  return {
    passed,
    score,
    issues,
    reasoning: passed ? m.passed_reason(type) : issues[0] || m.failed_reason,
    type_matches_description: type === 'OTHER' || (typeKeywords[type] ? typeKeywords[type].test(combined) : true),
    has_actionable_details:   hasEmergency && !isNarrative,
    severity_appropriate:     !(severity === 'CRITICAL' && d.length < 50),
    is_fake_or_test:          isNarrative || fakePatterns.some(p => p.test(t)),
    _source: 'rule-engine',
  };
}

// ── Language names for prompt ─────────────────────────────────────────────────
const LANG_NAMES = {
  ar: 'Arabic (العربية)',
  en: 'English',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  tr: 'Turkish (Türkçe)',
};

// ── Build Gemini prompt ───────────────────────────────────────────────────────
function buildPrompt(title, description, type, severity, lang = 'en') {
  const langName = LANG_NAMES[lang] || 'English';
  return `You are a strict multilingual emergency dispatch AI for a Disaster Management System.
Decide if this report describes a REAL emergency needing first responders.

⚠️ CRITICAL: You MUST write ALL text fields (reasoning, issues) in ${langName}. Never respond in English if the user's language is different.

REPORT:
- Title: ${title || '(empty)'}
- Type: ${type}
- Severity: ${severity}
- Description: ${description || '(empty)'}
- User language: ${langName}

Emergency keywords by language —
Arabic: حريق=fire, حادث=accident, فيضان=flood, زلزال=earthquake, مصاب=injured, عالق=trapped, دخان=smoke, نار=flames
Arabic NON-emergency (BLOCK): "اكل الولد التفاحة"=boy ate apple, "ذهب للمدرسة"=went to school → everyday story → BLOCK
French: incendie, inondation, accident, blessé, séisme, urgence, secours
Spanish: incendio, inundación, accidente, herido, terremoto, emergencia
Turkish: yangın, sel, kaza, yaralı, deprem, acil durum

RULES:
1. Description must match incident type "${type}"
2. Must have actionable emergency details (injuries, hazard, location clue, people affected)
3. Everyday stories, gibberish, test submissions → BLOCK with score 0
4. Short/vague descriptions → reduce score

RESPOND WITH ONLY THIS JSON (no markdown):
{"passed":false,"score":0,"reasoning":"one sentence in ${langName}","issues":["issue in ${langName}"],"type_matches_description":false,"has_actionable_details":false,"severity_appropriate":false,"is_fake_or_test":true}

Score: 90-100=clear emergency | 70-89=likely real | 50-69=suspicious | 0-49=fake/blocked
passed=true ONLY when score>=70 AND type_matches_description=true AND is_fake_or_test=false`;
}

// ── POST /verify-incident ─────────────────────────────────────────────────────
app.post('/verify-incident', async (req, res) => {
  const { title, description, type = 'OTHER', severity = 'MEDIUM', lang = 'en' } = req.body;
  stats.requests++;

  try {
    stats.geminiCalls++;
    const result = await callGemini([{ text: buildPrompt(title, description, type, severity, lang) }]);
    result._source = 'gemini';
    result.passed ? stats.passed++ : stats.blocked++;
    console.log(`[GEMINI|${lang}] "${title?.slice(0,40)}" → score=${result.score} passed=${result.passed}`);
    return res.json(result);
  } catch (geminiErr) {
    console.warn(`[GEMINI] Failed (${geminiErr.message}) — falling back to rule engine`);
  }

  stats.ruleCalls++;
  const result = ruleBasedVerify({ title, description, type, severity, lang });
  result.passed ? stats.passed++ : stats.blocked++;
  console.log(`[RULES|${lang}] "${title?.slice(0,40)}" → score=${result.score} passed=${result.passed}`);
  res.json(result);
});

// ── Phone number verification (multilingual) ──────────────────────────────────
const PHONE_MSG = {
  en: { valid:'Valid number', invalid:'Invalid format', fake:'Suspicious/unregistered', short:'Number too short', unknown:'Could not verify' },
  ar: { valid:'رقم صحيح', invalid:'تنسيق غير صحيح', fake:'رقم مشبوه أو غير مسجّل', short:'الرقم قصير جداً', unknown:'تعذّر التحقق' },
  fr: { valid:'Numéro valide', invalid:'Format invalide', fake:'Numéro suspect/non enregistré', short:'Numéro trop court', unknown:'Impossible de vérifier' },
  es: { valid:'Número válido', invalid:'Formato inválido', fake:'Número sospechoso/no registrado', short:'Número muy corto', unknown:'No se pudo verificar' },
  tr: { valid:'Geçerli numara', invalid:'Geçersiz biçim', fake:'Şüpheli/kayıtsız numara', short:'Numara çok kısa', unknown:'Doğrulanamadı' },
};

function localPhoneValidate(phone, countryCode, lang) {
  const m = PHONE_MSG[lang] || PHONE_MSG.en;
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 7) return { valid: false, suspicious: false, reason: m.short };
  // digits = full number without + or spaces, e.g. "96279123456"
  const rules = {
    '+962': d => d.length === 11 && d.startsWith('962') && d[3] === '7',  // Jordan +962 7XXXXXXXX
    '+966': d => d.length === 12 && d.startsWith('966') && d[3] === '5',  // Saudi +966 5XXXXXXXX
    '+971': d => d.length === 12 && d.startsWith('971') && d[3] === '5',  // UAE +971 5XXXXXXXX
    '+965': d => d.length === 11 && d.startsWith('965'),                   // Kuwait +965 XXXXXXXX
    '+974': d => d.length === 11 && d.startsWith('974'),                   // Qatar +974 XXXXXXXX
    '+20':  d => d.length === 12 && d.startsWith('20') && d[2] === '1',   // Egypt +20 1XXXXXXXXX
    '+90':  d => d.length === 12 && d.startsWith('90') && d[2] === '5',   // Turkey +90 5XXXXXXXXX
    '+44':  d => d.length === 12 && d.startsWith('44'),                    // UK +44 XXXXXXXXXX
    '+1':   d => d.length === 11 && d.startsWith('1'),                     // USA +1 XXXXXXXXXX
  };
  const rule = rules[countryCode];
  const valid = rule ? rule(digits) : digits.length >= 7 && digits.length <= 15;
  return { valid, suspicious: !valid, reason: valid ? m.valid : m.invalid };
}

// ── POST /verify-phone ────────────────────────────────────────────────────────
app.post('/verify-phone', async (req, res) => {
  const { phone, countryCode, countryName, lang = 'en' } = req.body;
  const m = PHONE_MSG[lang] || PHONE_MSG.en;
  stats.requests++;

  if (!phone) return res.status(400).json({ valid: false, reason: 'Phone required' });

  // Try AI for deeper check
  try {
    stats.geminiCalls++;
    const langName = LANG_NAMES[lang] || 'English';
    const prompt = `You are a phone number validator for emergency dispatch.
Verify if this phone number is plausibly real and valid for the given country.

Phone: ${phone}
Country: ${countryName || 'Unknown'} (${countryCode || 'unknown'})
User language: ${langName}

Check:
1. Is the format correct for ${countryName || 'the country'}?
2. Is the number length valid?
3. Does the prefix suggest a mobile/landline number (not test 555, 000, 111 patterns)?
4. Is it suspiciously sequential or repetitive (0000000, 1234567)?

Respond ONLY with JSON in ${langName}:
{"valid":false,"suspicious":false,"reason":"one sentence in ${langName}","format_ok":false,"length_ok":false}`;

    const result = await callGemini([{ text: prompt }]);
    result._source = 'gemini';
    console.log(`[PHONE|${lang}] ${phone} → valid=${result.valid}`);
    return res.json(result);
  } catch (err) {
    console.warn('[PHONE] Gemini unavailable, using local rules:');
    const result = localPhoneValidate(phone, countryCode, lang);
    result._source = 'rule-engine';
    return res.json(result);
  }
});

// ── POST /verify-image ────────────────────────────────────────────────────────
app.post('/verify-image', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', type = 'OTHER', lang = 'en',
          title = '', description = '', severity = 'MEDIUM' } = req.body;
  const langName = LANG_NAMES[lang] || 'English';
  stats.requests++;
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });

  try {
    stats.geminiCalls++;
    const result = await callGemini([
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
      { text: `You are an expert emergency evidence analyst for a Disaster Management System.
Analyze this image VERY carefully and thoroughly.

Report context:
- Title: "${title || 'Not provided'}"
- Type: ${type}
- Severity: ${severity}
- Description: "${description || 'Not provided'}"
- Language: ${langName}

⚠️ CRITICAL: Write ALL text (image_notes, image_issues) in ${langName}.

Examine every pixel and report:
1. What objects, people, vehicles, structures are visible?
2. Is there fire, smoke, flood water, debris, damage, injuries?
3. Does the scene match incident type "${type}"?
4. Is this a real photo (authentic) or stock image/screenshot/meme?
5. What is the environment (indoor, outdoor, road, building, nature)?
6. How severe does the situation look visually?
7. List every relevant element you detect.

RESPOND ONLY WITH THIS EXACT JSON (no markdown, no extra text):
{
  "image_passed": false,
  "appears_authentic": false,
  "shows_emergency": false,
  "matches_incident_type": false,
  "image_score": 0,
  "image_notes": "detailed description of everything visible, written in ${langName}",
  "image_issues": ["issue in ${langName}"],
  "detected_elements": ["fire","smoke","person","vehicle","damage","water","debris"],
  "environment": "outdoor",
  "severity_visible": "none"
}

Scoring: 90-100=clear emergency evidence | 70-89=likely real | 50-69=unclear | 0-49=fake/irrelevant
image_passed=true ONLY if image_score>=65 AND appears_authentic=true AND shows_emergency=true
severity_visible must be one of: none / minor / moderate / severe / critical` },
    ]);
    result._source = 'gemini';
    console.log(`[IMAGE|${lang}] type=${type} score=${result.image_score} passed=${result.image_passed}`);
    return res.json(result);
  } catch (err) {
    console.warn('[IMAGE] Gemini unavailable:');
    return res.json({
      image_passed: true,
      appears_authentic: true,
      shows_emergency: true,
      matches_incident_type: true,
      image_score: 60,
      image_notes: 'Image analysis unavailable — manual review required',
      image_issues: [],
      detected_elements: [],
      environment: 'unknown',
      severity_visible: 'unknown',
      _source: 'fallback',
    });
  }
});

// ── POST /verify-full ─────────────────────────────────────────────────────────
app.post('/verify-full', async (req, res) => {
  const { title, description, type = 'OTHER', severity = 'MEDIUM', lang = 'en', imageBase64, mimeType = 'image/jpeg' } = req.body;
  stats.requests++;

  try {
    stats.geminiCalls++;
    const parts = [{ text: buildPrompt(title, description, type, severity, lang) }];
    if (imageBase64) {
      parts.push({ inline_data: { mime_type: mimeType, data: imageBase64 } });
      parts.push({ text: `\nAlso analyze this image exhaustively. Add "image_analysis" to your JSON:
{
  "image_passed": bool,
  "appears_authentic": bool,
  "shows_emergency": bool,
  "matches_incident_type": bool,
  "image_score": 0-100,
  "image_notes": "Describe every visible element in detail in ${LANG_NAMES[lang]||'English'}: objects, people, damage, fire/smoke/water, vehicles, structures, environment, time of day if visible.",
  "image_issues": ["issues written in ${LANG_NAMES[lang]||'English'}"],
  "detected_elements": ["list every element: fire, smoke, person, vehicle, damage, water, debris, etc."],
  "environment": "outdoor/indoor/road/building/nature/vehicle",
  "severity_visible": "none/minor/moderate/severe/critical"
}
Score: 90-100=clear evidence | 70-89=likely real | 50-69=unclear | 0-49=fake/irrelevant.
image_passed=true ONLY if image_score>=65 AND appears_authentic=true AND shows_emergency=true.` });
    }
    const result = await callGemini(parts);
    result._source = 'gemini';
    result.passed ? stats.passed++ : stats.blocked++;
    return res.json(result);
  } catch (geminiErr) {
    console.warn('[FULL] Gemini failed, using rules:');
    stats.ruleCalls++;
    const result = ruleBasedVerify({ title, description, type, severity, lang });
    result.passed ? stats.passed++ : stats.blocked++;
    return res.json(result);
  }
});

// ── GET /health ───────────────────────────────────────────────────────────────


app.get('/stats', (_req, res) => res.json(stats));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║   DMS AI Agent — 100% FREE (no billing needed)    ║
╠════════════════════════════════════════════════════╣
║  Port:     http://localhost:${PORT}                   ║
║  Primary:  Gemini 2.5-flash (1500 req/day FREE)   ║
║  Fallback: Rule-based engine (offline, always on) ║
╠════════════════════════════════════════════════════╣
║  POST /verify-incident   text verification        ║
║  POST /verify-image      image analysis           ║
║  POST /verify-full       text + image             ║
║  POST /verify-phone      phone validation         ║
║  GET  /health            status + stats           ║
╚════════════════════════════════════════════════════╝
`);
});
