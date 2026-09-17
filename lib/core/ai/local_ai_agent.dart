// ─────────────────────────────────────────────────────────────────────────────
// local_ai_agent.dart
//
// Local AI Agent for the Disaster Management System (DMS) mobile app.
// Provides 100% on-device, offline-capable AI assistance with zero external
// API dependencies and zero runtime cost. Used during incident reporting to:
//   - Detect the incident type (fire, flood, earthquake, etc.) from user text
//   - Score the credibility of a submitted report (0–100 scale)
//   - Suggest pre-written titles and descriptions appropriate to type/severity
//   - Suggest realistic Jordan-based locations for each incident category
//   - Autocomplete report titles as the user types
//
// Implementation strategy: rule-based NLP using multilingual keyword dictionaries,
// pattern scoring with boost/weaken signals, and contextual template selection.
// Supports Arabic, English, French, Spanish, German, Japanese, Turkish, Russian.
// ─────────────────────────────────────────────────────────────────────────────

/// Singleton AI agent that runs entirely on-device for DMS incident analysis.
/// Uses rule-based NLP instead of neural models to remain cost-free and offline.
class LocalAiAgent {
  /// Private constructor prevents external instantiation — enforces singleton pattern.
  LocalAiAgent._();

  /// The single shared instance of LocalAiAgent, accessed globally across the app.
  static final instance = LocalAiAgent._();

  // ── Keyword dictionaries per incident type ──────────────────────────────────

  /// Maps each DMS incident type to a multilingual list of trigger keywords.
  /// Matching against user-entered text drives type detection and credibility scoring.
  /// Keywords cover Arabic, English, French, Spanish, German, Japanese, Turkish, Russian.
  static const _typeKeywords = {
    // Fire-related keywords: covers direct fire terms, combustion phenomena, and synonyms
    'FIRE': [
      'fire','flame','smoke','burning','blaze','inferno','heat','ember','ash',
      'explosion','ignite','charred','hot','spark','burn','combustion',
      // Arabic fire terms
      'حريق','نار','دخان','لهب','اشتعال',
      // French fire terms
      'feu','incendie','flamme','fumée',
      // Spanish fire terms
      'fuego','incendio','llama','humo',
      // German fire terms
      'Feuer','Brand','Flamme','Rauch',
      // Japanese fire terms
      '火災','火','煙','炎',
      // Turkish fire terms
      'yangın','ateş','duman','alev',
      // Russian fire terms
      'пожар','огонь','дым','пламя',
    ],
    // Flood-related keywords: water accumulation, overflow, and drainage failure signals
    'FLOOD': [
      'flood','water','overflow','rain','river','dam','inundation','submerged',
      'waterlogged','deluge','surge','wave','stream','drain','sewage','mud',
      // Arabic flood terms
      'فيضان','ماء','سيل','أمطار','نهر',
      // French flood terms
      'inondation','eau','pluie','rivière','débordement',
      // Spanish flood terms
      'inundación','agua','lluvia','río','desbordamiento',
      // German flood terms
      'Überschwemmung','Wasser','Regen','Fluss',
      // Japanese flood terms
      '洪水','水','雨','川','氾濫',
      // Turkish flood terms
      'sel','su','yağmur','nehir','taşkın',
      // Russian flood terms
      'наводнение','вода','дождь','река','потоп',
    ],
    // Earthquake-related keywords: seismic activity, structural failure, and aftermath terms
    'EARTHQUAKE': [
      'earthquake','tremor','quake','seismic','collapse','rubble','crack',
      'shake','shaking','aftershock','magnitude','fault','ground','building fell',
      // Arabic earthquake terms
      'زلزال','هزة','انهيار','شقوق','رجفة',
      // French earthquake terms
      'séisme','tremblement','effondrement','secousse',
      // Spanish earthquake terms
      'terremoto','temblor','sismo','derrumbe','grieta',
      // German earthquake terms
      'Erdbeben','Beben','Einsturz','Riss',
      // Japanese earthquake terms
      '地震','震动','倒塌','裂缝',
      // Turkish earthquake terms
      'deprem','sarsıntı','çatlak','yıkım',
      // Russian earthquake terms
      'землетрясение','толчок','обрушение','трещина',
    ],
    // Storm-related keywords: wind events, electrical storms, cyclones, and hail
    'STORM': [
      'storm','hurricane','tornado','wind','cyclone','thunder','lightning',
      'hail','gale','typhoon','tempest','downpour','flooding','debris',
      // Arabic storm terms
      'عاصفة','إعصار','رياح','رعد','برق','عواصف',
      // French storm terms
      'tempête','ouragan','tornaque','vent','tonnerre','foudre',
      // Spanish storm terms
      'tormenta','huracán','tornado','viento','trueno','relámpago',
      // German storm terms
      'Sturm','Orkan','Tornado','Wind','Donner','Blitz',
      // Japanese storm terms
      '嵐','台風','竜巻','風','雷','稲妻',
      // Turkish storm terms
      'fırtına','kasırga','tornado','rüzgar','şimşek','yıldırım',
      // Russian storm terms
      'шторм','ураган','торнадо','ветер','гром','молния',
    ],
    // Medical emergency keywords: injuries, unconsciousness, and hospital-related signals
    'MEDICAL': [
      'medical','injury','hurt','wound','blood','unconscious','heart attack',
      'stroke','ambulance','hospital','pain','fracture','bleeding','collapse',
      // Arabic medical terms
      'طبي','إصابة','جرح','دم','مغمى','نوبة قلبية','إسعاف',
      // French medical terms
      'médical','blessure','blessé','sang','inconscient','ambulance','hôpital',
      // Spanish medical terms
      'médico','herida','lesión','sangre','desmayo','ambulancia','hospital',
      // German medical terms
      'medizinisch','Verletzung','Wunde','Blut','bewusstlos','Krankenwagen',
      // Japanese medical terms
      '医療','負傷','怪我','血','意識不明','救急車','病院',
      // Turkish medical terms
      'tıbbi','yaralı','yara','kan','bayılma','ambulans','hastane',
      // Russian medical terms
      'медицинский','травма','рана','кровь','без сознания','скорая',
    ],
    // Road accident keywords: vehicle collisions, traffic incidents, and road hazards
    'ACCIDENT': [
      'accident','crash','collision','vehicle','car','truck','road','traffic',
      'injured','damage','wreck','overturn','skid','impact','pedestrian',
      // Arabic accident terms
      'حادث','تصادم','سيارة','طريق','مرور','إصابة',
      // French accident terms (note: 'accident' and 'collision' are shared with English)
      'accident','collision','véhicule','voiture','route','blessé',
      // Spanish accident terms
      'accidente','colisión','vehículo','coche','carretera','herido',
      // German accident terms
      'Unfall','Kollision','Fahrzeug','Auto','Straße','verletzt',
      // Japanese accident terms
      '事故','衝突','車','道路','交通','負傷',
      // Turkish accident terms
      'kaza','çarpışma','araç','araba','yol','yaralı',
      // Russian accident terms
      'авария','столкновение','автомобиль','дорога','пострадавший',
    ],
    // Hazardous materials keywords: chemical, biological, radiological, and nuclear threats
    'HAZMAT': [
      'chemical','toxic','gas','leak','poison','hazmat','spill','radiation',
      'contamination','fumes','biohazard','substance','nuclear','industrial',
      // Arabic hazmat terms
      'كيماوي','سام','غاز','تسرب','سم','إشعاع','تلوث',
      // French hazmat terms
      'chimique','toxique','gaz','fuite','poison','radiation','contamination',
      // Spanish hazmat terms
      'químico','tóxico','gas','fuga','veneno','radiación','contaminación',
      // German hazmat terms
      'chemisch','toxisch','Gas','Leck','Gift','Strahlung','Kontamination',
      // Japanese hazmat terms
      '化学','毒','ガス','漏洩','放射線','汚染',
      // Turkish hazmat terms
      'kimyasal','toksik','gaz','sızıntı','zehir','radyasyon','kirlilik',
      // Russian hazmat terms
      'химический','токсичный','газ','утечка','яд','радиация','заражение',
    ],
  };

  // ── Credibility signal words ────────────────────────────────────────────────

  /// Words that raise the credibility score of a report by signaling genuine urgency.
  /// Presence of these terms suggests an active, serious incident rather than hearsay.
  /// Multilingual coverage ensures non-English reporters are scored fairly.
  static const _credibilityBoost = [
    // English urgency and emergency action terms
    'urgent','emergency','immediate','critical','help','danger','trapped',
    'injured','casualties','multiple','several','evacuate','evacuation',
    // Arabic urgency terms
    'عاجل','طارئ','مساعدة','خطر','محاصر','إصابات','إخلاء',
    // French urgency terms
    'urgent','urgence','blessés','danger','piégé','évacuation',
    // Spanish urgency terms
    'urgente','emergencia','heridos','peligro','atrapado','evacuación',
    // German urgency terms
    'dringend','Notfall','verletzt','Gefahr','eingeschlossen','Evakuierung',
    // Japanese urgency terms
    '緊急','危険','負傷者','閉じ込め','避難',
    // Turkish urgency terms
    'acil','yaralı','tehlike','sıkışmış','tahliye',
    // Russian urgency terms
    'срочно','чрезвычайный','пострадавший','опасность','эвакуация',
  ];

  /// Words that reduce the credibility score by indicating uncertainty or speculation.
  /// Hedging language suggests the reporter is not an eyewitness and reduces trust.
  static const _credibilityWeaken = [
    // English uncertainty hedging terms
    'maybe','might','think','probably','heard','seems','perhaps','could be',
    'not sure',
    // Arabic uncertainty terms
    'ربما','يمكن','أظن','يبدو',
    // French uncertainty terms
    'peut-être','semble',
    // Spanish uncertainty terms
    'quizás',
    // German uncertainty terms
    'vielleicht','scheint',
    // Japanese uncertainty terms
    'もしかして','たぶん',
    // Turkish uncertainty terms
    'belki','sanırım',
    // Russian uncertainty terms
    'может быть',
  ];

  // ── Title templates per type ────────────────────────────────────────────────

  /// Pre-written title templates for each DMS incident type, ordered by severity.
  /// Index 0 = LOW, 1 = MEDIUM, 2 = HIGH, 3 = CRITICAL; used by [suggestTitle].
  /// Titles are professional, action-oriented, and dispatcher-ready.
  static const _titleTemplates = {
    // Fire incident titles — from contained small fire to catastrophic blaze
    'FIRE': [
      'Active Fire Emergency Reported',
      'Building Fire with Smoke Visible',
      'Structure Fire — Immediate Response Needed',
      'Wildfire Spreading Near Residential Area',
      'Fire Outbreak — Multiple Units Affected',
    ],
    // Flood incident titles — from minor road flooding to neighborhood submersion
    'FLOOD': [
      'Flash Flood Blocking Main Road',
      'Flood Waters Rising in Residential Zone',
      'Severe Flooding — Homes Submerged',
      'River Overflow Causing Neighborhood Flooding',
      'Flood Emergency — Residents Need Evacuation',
    ],
    // Earthquake incident titles — from felt tremors to multi-building collapse
    'EARTHQUAKE': [
      'Earthquake Tremors Felt — Building Damage Reported',
      'Seismic Event — Structural Collapse Possible',
      'Strong Earthquake Causes Infrastructure Damage',
      'Post-Earthquake Aftershocks Continuing',
      'Earthquake Damage — Multiple Buildings Affected',
    ],
    // Storm incident titles — from power outages to full coastal storm surge
    'STORM': [
      'Severe Storm Causing Power Outages',
      'Hurricane-Force Winds Damaging Structures',
      'Violent Storm with Heavy Rainfall',
      'Tornado Warning — Immediate Shelter Needed',
      'Storm Surge Flooding Coastal Areas',
    ],
    // Medical incident titles — from single patient to mass casualty event
    'MEDICAL': [
      'Medical Emergency — Multiple Casualties',
      'Serious Injury Requiring Immediate Medical Aid',
      'Mass Casualty Event — Medical Response Urgent',
      'Cardiac Emergency in Public Area',
      'Medical Crisis — Ambulance Requested',
    ],
    // Road accident titles — from single-vehicle to multi-vehicle major collision
    'ACCIDENT': [
      'Multi-Vehicle Traffic Accident on Main Highway',
      'Serious Road Collision — Injured Reported',
      'Vehicle Accident Blocking Emergency Access',
      'Major Traffic Collision — Urgent Response',
      'Road Accident with Multiple Vehicles',
    ],
    // Hazmat incident titles — from minor spill to mass exposure emergency
    'HAZMAT': [
      'Hazardous Chemical Spill Detected',
      'Toxic Gas Leak in Industrial Area',
      'Hazmat Emergency — Evacuation Required',
      'Chemical Contamination Spreading',
      'Radiation Hazard — Area Needs Clearance',
    ],
    // Catch-all titles for unclassified or ambiguous incidents
    'OTHER': [
      'Emergency Situation Requires Immediate Attention',
      'Incident Reported — First Responders Needed',
      'Critical Situation Developing in Area',
      'Public Safety Emergency',
      'Emergency — Assistance Required',
    ],
  };

  // ── Description templates ───────────────────────────────────────────────────

  /// Nested map of auto-generated descriptions keyed by [type] then [severity].
  /// Each description is dispatcher-quality narrative text pre-filled into reports
  /// to help reporters communicate the situation clearly to emergency coordinators.
  static const _descTemplates = {
    // Fire descriptions scaled from contained small fire to catastrophic mass evacuation
    'FIRE': {
      'LOW':      'Small fire visible in the area. Smoke is present but situation appears contained. Monitoring in progress. No injuries reported at this time.',
      'MEDIUM':   'Fire is actively spreading. Significant smoke visible from multiple locations. Residents in adjacent buildings advised to be on standby for evacuation.',
      'HIGH':     'Large fire with intense flames and thick black smoke. Multiple buildings may be threatened. Immediate firefighting response required. Evacuating nearby residents.',
      'CRITICAL': 'Catastrophic fire emergency. Massive blaze out of control. Multiple structures engulfed. Mass evacuation underway. All available fire units needed immediately.',
    },
    // Flood descriptions from minor street accumulation to neighborhood-wide submersion
    'FLOOD': {
      'LOW':      'Water accumulation observed on streets. Minor flooding causing inconvenience. Drainage appears overwhelmed but situation manageable.',
      'MEDIUM':   'Rising flood waters affecting multiple roads and ground-floor properties. Residents advised to move valuables to upper floors. Vehicle movement restricted.',
      'HIGH':     'Serious flooding with rapidly rising water levels. Homes and businesses inundated. Residents trapped in upper floors. Boat rescue operations may be required.',
      'CRITICAL': 'Catastrophic flooding event. Entire neighborhoods submerged. Mass rescue operation underway. Life-threatening conditions. All emergency services mobilized.',
    },
    // Earthquake descriptions from minor tremors felt to widespread structural collapse
    'EARTHQUAKE': {
      'LOW':      'Minor tremors felt. Some items fallen from shelves. No structural damage confirmed. Residents shaken but no injuries reported.',
      'MEDIUM':   'Moderate earthquake causing visible cracks in walls. Some buildings evacuated as precaution. Infrastructure being assessed for damage.',
      'HIGH':     'Strong earthquake with significant structural damage. Multiple buildings partially collapsed. Casualties possible. Search and rescue teams deployed.',
      'CRITICAL': 'Major earthquake causing widespread destruction. Multiple building collapses. Large number of casualties. Full emergency response required immediately.',
    },
    // Storm descriptions from minor disruptions to catastrophic coastal destruction
    'STORM': {
      'LOW':      'Strong winds and heavy rain causing minor disruptions. Some trees and branches down. Road conditions deteriorating. Stay indoors advised.',
      'MEDIUM':   'Severe storm with damaging winds. Power outages reported across several districts. Flooding on low-lying roads. Emergency services on standby.',
      'HIGH':     'Extremely dangerous storm conditions. Major structural damage to buildings. Widespread power failure. Multiple road closures. Emergency shelter activated.',
      'CRITICAL': 'Catastrophic storm event. Total infrastructure failure in affected areas. Mass casualties reported. Complete evacuation of coastal areas in progress.',
    },
    // Medical descriptions from stable single patient to field triage mass casualty
    'MEDICAL': {
      'LOW':      'Minor medical incident requiring attention. Patient conscious and stable. Medical transport requested as precaution.',
      'MEDIUM':   'Serious medical emergency. Patient in significant distress. Multiple individuals may be affected. Ambulance and medical personnel needed urgently.',
      'HIGH':     'Severe medical crisis. Multiple casualties with life-threatening conditions. Emergency medical teams required immediately at the scene.',
      'CRITICAL': 'Mass casualty event. Numerous life-threatening injuries. All available medical units requested. Field triage being established.',
    },
    // Accident descriptions from property-damage-only fender-bender to fatal multi-vehicle crash
    'ACCIDENT': {
      'LOW':      'Minor traffic collision with property damage only. Vehicles blocking lane. Police and assistance needed to manage traffic.',
      'MEDIUM':   'Road accident involving multiple vehicles. Injuries reported. Road partially blocked. Emergency services and tow trucks needed.',
      'HIGH':     'Serious multi-vehicle collision. Multiple serious injuries. Road completely blocked. Emergency medical and rescue services urgently needed.',
      'CRITICAL': 'Major catastrophic accident. Multiple fatalities possible. Complete road closure. All emergency services required. Air ambulance may be needed.',
    },
    // Hazmat descriptions from precautionary cordoning to mass toxic exposure evacuation
    'HAZMAT': {
      'LOW':      'Minor chemical spill detected. Area cordoned off as precaution. Hazmat team requested to assess and contain the situation.',
      'MEDIUM':   'Significant hazardous material release. Strong odor detected. Residents within 200m advised to evacuate. Hazmat response team needed.',
      'HIGH':     'Dangerous chemical emergency. Toxic fumes spreading over wide area. Mass evacuation of surrounding neighborhood underway. Full hazmat response required.',
      'CRITICAL': 'Catastrophic hazmat event. Highly toxic substance spreading rapidly. Massive evacuation in progress. Multiple casualties from exposure reported.',
    },
    // Generic fallback descriptions for unclassified incidents
    'OTHER': {
      'LOW':      'Incident reported requiring assessment by emergency services. Situation being monitored. Initial response team dispatched.',
      'MEDIUM':   'Developing emergency situation. Nature of incident being determined. Multiple first responders en route. Public advised to avoid the area.',
      'HIGH':     'Serious emergency in progress. Significant resources being deployed. Situation poses risk to public safety. Evacuation being considered.',
      'CRITICAL': 'Life-threatening emergency. All available units being mobilized. Command center activated. Public safety at severe risk.',
    },
  };

  // ── Location suggestions per type ───────────────────────────────────────────

  /// Curated Jordan-specific location suggestions per incident type.
  /// Returned by [suggestLocation] to help reporters identify a realistic address
  /// when GPS is unavailable or the user needs a starting point to refine.
  static const _locationSuggestions = {
    // High-density commercial and industrial fire-prone zones in Jordan
    'FIRE': [
      'Sweifieh District, Amman — Near Al-Rabeh Mall',
      'Industrial Area, Zarqa — Factory Zone',
      'Jabal Al-Hussein, Amman — Residential Block 7',
      'Abdoun Roundabout, Amman — Commercial Zone',
      'Aqaba Port Industrial Zone',
    ],
    // Low-lying flood-prone areas and riverbanks across Jordan
    'FLOOD': [
      'King Abdullah II St, Amman — Low-lying area',
      'Zarqa River Basin, Near Zarqa City Center',
      'Al-Karameh District, East Amman',
      'Sahab Industrial Zone, South Amman',
      'Dead Sea Highway, KM 45',
    ],
    // Seismically active zones along Jordan Rift Valley and southern fault lines
    'EARTHQUAKE': [
      'Aqaba, Jordan — Near Coastal Zone',
      'Wadi Araba Fault Line, South Jordan',
      'Ma\'an District, Southern Jordan',
      'Kerak Castle Area, Al-Karak',
      'Jordan Valley, Near Ghor Al-Safi',
    ],
    // Exposed desert highways and northern Jordan areas prone to desert storms
    'STORM': [
      'Azraq Desert Highway, Eastern Jordan',
      'Mafraq, Northern Jordan',
      'Irbid, Northern District',
      'Airport Road, Amman — Queen Alia International',
      'Wadi Rum, Southern Desert Zone',
    ],
    // Major hospital and medical center locations in Jordan for medical incident context
    'MEDICAL': [
      'Jordan University Hospital, Queens Road, Amman',
      'Al-Bashir Hospital Area, Amman',
      'King Hussein Medical Center, Amman',
      'Prince Hamzah Hospital, North Amman',
      'Aqaba Government Hospital Area',
    ],
    // High-traffic road corridors and accident-prone junctions in Jordan
    'ACCIDENT': [
      'Desert Highway, KM 120 — Near Qatrana',
      'First Circle, Jabal Amman',
      'Prince Mohammed Street, Amman',
      'Queen Alia Airport Road, Junction 3',
      'Highway 35 — Dead Sea Road Junction',
    ],
    // Industrial zones and chemical storage areas where hazmat risk is highest
    'HAZMAT': [
      'Aqaba Port — Chemical Storage Zone',
      'Zarqa Industrial Zone, Area B',
      'Sahab Industrial District, Amman',
      'Al-Hashimiyya Industrial Area',
      'Russeifa Chemical Plant Zone',
    ],
    // General public areas across Amman for uncategorized incidents
    'OTHER': [
      'Downtown Amman — Al-Husseini Mosque Area',
      'Mecca Mall Area, 7th Circle, Amman',
      'University of Jordan Campus, Amman',
      'Rainbow Street, Jabal Amman',
      'City Mall, Khalda District, Amman',
    ],
  };

  // ── PUBLIC API ──────────────────────────────────────────────────────────────

  /// Analyze a report and return a credibility score 0–100 + detected signals.
  ///
  /// Combines keyword matching, urgency signal detection, description length,
  /// image evidence count, and severity consistency into a single composite score.
  /// Used in the incident submission flow to guide reporters toward better reports
  /// and to flag low-quality or speculative submissions for dispatcher review.
  ///
  /// [title] and [description] are the reporter's free-text input, scanned for keywords.
  /// [type] is the selected DMS incident category (e.g. 'FIRE', 'FLOOD').
  /// [severity] is the reporter-selected severity level ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').
  /// [imageCount] is how many photos the reporter has attached to this report.
  AnalysisResult analyzeReport({
    required String title,
    required String description,
    required String type,
    required String severity,
    required int imageCount,
  }) {
    // Combine title and description into one lowercase string for uniform keyword scanning
    final text = '${title.toLowerCase()} ${description.toLowerCase()}';

    // Accumulate human-readable signals to display to the reporter as feedback
    final signals = <String>[];

    // Base score of 30 ensures every report starts with partial credibility
    int score = 30; // base score

    // 1. Type keyword match — reward reports whose text aligns with the declared incident type
    final typeWords = _typeKeywords[type] ?? []; // fetch keywords for selected type
    int typeHits = 0; // count how many type keywords appear in the report text
    for (final kw in typeWords) {
      if (text.contains(kw.toLowerCase())) {
        typeHits++;
        // Collect up to 3 matched keywords as evidence signals for the reporter
        if (typeHits <= 3) signals.add(kw);
      }
    }
    // Add up to 25 points based on how many type-specific terms appear (5 pts each, capped)
    score += (typeHits * 5).clamp(0, 25);

    // 2. Credibility boosts — reward urgency and action-oriented language
    int boostHits = 0; // count how many urgency-signaling keywords appear
    for (final kw in _credibilityBoost) {
      if (text.contains(kw.toLowerCase())) boostHits++;
    }
    // Add up to 20 points for urgency signals (4 pts each, capped at 5 matches)
    score += (boostHits * 4).clamp(0, 20);
    if (boostHits > 0) signals.add('Urgency signals detected'); // feedback label for reporter

    // 3. Credibility weakeners — penalize hedging and speculative language
    int weakenHits = 0; // count how many uncertainty-hedging terms appear
    for (final kw in _credibilityWeaken) {
      if (text.contains(kw.toLowerCase())) weakenHits++;
    }
    // Subtract up to 18 points for uncertainty language (6 pts each, capped at 3 matches)
    score -= (weakenHits * 6).clamp(0, 18);
    if (weakenHits > 0) signals.add('Uncertainty language found'); // flag for dispatcher review

    // 4. Title quality — longer, more specific titles indicate a thoughtful report
    if (title.length >= 10) score += 5; // reward minimal meaningful title
    if (title.length >= 20) score += 5; // reward a descriptive title

    // 5. Description quality — detailed descriptions provide context for dispatchers
    if (description.length >= 50)  { score += 5; signals.add('Detailed description'); }
    if (description.length >= 120) { score += 5; signals.add('Comprehensive report'); } // extra reward for thorough account

    // 6. Images attached — photo evidence significantly improves report trustworthiness
    if (imageCount >= 1) { score += 10; signals.add('Photo evidence attached'); }  // single photo bonus
    if (imageCount >= 3) { score += 5;  signals.add('Multiple photos provided'); } // additional bonus for multiple photos

    // 7. Severity consistency — penalize mismatch between declared severity and content signals
    if (severity == 'CRITICAL' && typeHits >= 3) score += 5; // consistent high-severity language boosts score
    if (severity == 'LOW' && boostHits >= 3) score -= 5;     // mismatch: urgent language but LOW severity is suspicious

    // 8. Type is not OTHER — reports with a specific type are more useful to dispatchers
    if (type != 'OTHER') score += 5;

    // Return clamped score (5–98), deduplicated signals, and a human-readable verdict
    return AnalysisResult(
      score: score.clamp(5, 98).toDouble(), // avoid absolute 0 or 100 to prevent overconfidence
      signals: signals.toSet().toList(),     // deduplicate signals before returning
      verdict: _verdict(score.clamp(5, 98)),
    );
  }

  /// Suggest a professional report title based on incident [type] and [severity].
  ///
  /// Selects from [_titleTemplates] using severity as the index so higher-severity
  /// incidents receive more urgent-sounding titles. Used to pre-fill the title field
  /// when the reporter clicks "Suggest Title" in the incident creation screen.
  String suggestTitle(String type, String severity) {
    // Fall back to OTHER templates if the type is unrecognized
    final templates = _titleTemplates[type] ?? _titleTemplates['OTHER']!;
    // Map severity string to a numeric index for template selection
    final idx = switch (severity) {
      'LOW'      => 0, // least severe — use first (mildest) template
      'MEDIUM'   => 1, // moderate — use second template
      'HIGH'     => 2, // serious — use third template
      'CRITICAL' => 3, // catastrophic — use fourth template
      _          => 1, // default to MEDIUM index for unknown severity values
    };
    // Modulo guards against out-of-bounds if the template list has fewer than 4 entries
    return templates[idx % templates.length];
  }

  /// Suggest a dispatcher-quality description based on incident [type] and [severity].
  ///
  /// Returns a pre-written narrative that reporters can use as-is or customize.
  /// Descriptions convey scope, immediate danger, and recommended first-responder actions.
  String suggestDescription(String type, String severity) {
    // Fall back to OTHER templates if the type is unrecognized
    final typeMap = _descTemplates[type] ?? _descTemplates['OTHER']!;
    // Fall back to MEDIUM severity description if the severity key is missing
    return typeMap[severity] ?? typeMap['MEDIUM']!;
  }

  /// Suggest a Jordan-specific location for the given incident [type].
  ///
  /// Rotates through the location list pseudo-randomly using the current second,
  /// so each call returns a different suggestion without requiring true randomness.
  /// Used to pre-fill the location field when GPS coordinates are unavailable.
  String suggestLocation(String type) {
    // Fall back to OTHER locations if the type is unrecognized
    final locs = _locationSuggestions[type] ?? _locationSuggestions['OTHER']!;
    // Use current second as a lightweight pseudo-random index for variety across calls
    final idx = DateTime.now().second % locs.length;
    return locs[idx];
  }

  /// Return title suggestions that match the reporter's [partial] input for the given [type].
  ///
  /// Enables real-time autocomplete in the title field of the incident creation screen.
  /// Only activates after at least 2 characters to avoid overwhelming the user with suggestions.
  /// Returns up to 3 matching templates sorted by their natural template order.
  List<String> autocompletTitle(String partial, String type) {
    // Require at least 2 characters to avoid suggestions on single keystrokes
    if (partial.length < 2) return [];
    // Fall back to OTHER templates if the type is unrecognized
    final templates = _titleTemplates[type] ?? _titleTemplates['OTHER']!;
    return templates
      .where((t) => t.toLowerCase().contains(partial.toLowerCase())) // case-insensitive substring match
      .take(3)  // limit to 3 suggestions to keep the UI uncluttered
      .toList();
  }

  /// Convert a numeric credibility [score] into a human-readable verdict string.
  ///
  /// Three tiers: high (>=75) clears the report for submission, moderate (>=50)
  /// encourages more detail, and low (<50) requests significant improvement.
  String _verdict(int score) {
    if (score >= 75) return 'High credibility — ready to submit';
    if (score >= 50) return 'Moderate — add more details if possible';
    return 'Low credibility — please provide more information';
  }
}

// ── Result model ───────────────────────────────────────────────────────────────

/// Immutable result object returned by [LocalAiAgent.analyzeReport].
///
/// Encapsulates the credibility [score] (0–100), the list of human-readable
/// [signals] that explain what raised or lowered the score, and a [verdict]
/// string suitable for display to the reporter in the DMS mobile app UI.
class AnalysisResult {
  /// Credibility score on a 0–100 scale; clamped to 5–98 to avoid absolutes.
  final double score;

  /// Human-readable labels describing what influenced the score (e.g. 'Photo evidence attached').
  final List<String> signals;

  /// Plain-language summary verdict guiding the reporter on whether to submit or improve their report.
  final String verdict;

  /// All fields are required; the object is const-constructible for efficient reuse.
  const AnalysisResult({required this.score, required this.signals, required this.verdict});
}