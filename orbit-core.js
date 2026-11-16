/**
 * ORBIT CARE // CORE ENGINE (v2.0 MVP - NASA Space Apps Challenge 2026)
 * Unified offline engine: state synchronization, HRR rules, environments, and SC-16 guides.
 */

const OrbitCore = (() => {
  const STORAGE_KEY = 'orbitCareState_v2';

  const ENVIRONMENTS = {
    station: {
      id: 'station',
      name: 'Orbital Station (ISS / Gateway)',
      gravity: '0g (Microgravity)',
      primaryHazards: 'Cephalad fluid shift (SANS), bone mineral loss, and isolation.',
      co2Threshold: 0.65,
      radiationAlert: 50,
      commDelay: '≈ 0.5 s (TDRS network, near real-time)',
      uplinkMs: 2500,
      tip: 'Prioritize ARED resistive exercise and wear Thigh Cuffs during waking shifts.'
    },
    spacecraft: {
      id: 'spacecraft',
      name: 'Deep Space Transit (Orion)',
      gravity: '0g + GCR/SPE Radiation',
      primaryHazards: 'Galactic cosmic radiation, extreme confinement, and communication latency.',
      co2Threshold: 0.60,
      radiationAlert: 35,
      commDelay: '1.3 s – 20 min (distance-dependent, Deep Space Network)',
      uplinkMs: 5000,
      tip: 'Monitor mSv dosimetry every 6h and run the PVT cognitive test before critical maneuvers.'
    },
    rover: {
      id: 'rover',
      name: 'Pressurized Exploration Rover',
      gravity: '0.16g – 0.38g (Surface)',
      primaryHazards: 'Limb muscular fatigue, compact-cabin CO₂ spikes, and dehydration.',
      co2Threshold: 0.55,
      radiationAlert: 30,
      commDelay: '≈ 1.3 s (lunar relay) / up to 20 min (Mars)',
      uplinkMs: 3500,
      tip: 'Inspect CO₂ scrubbers every 2h and hydrate 300 mL/h during surface traverses.'
    },
    lunar_base: {
      id: 'lunar_base',
      name: 'Lunar / Mars Habitat (Artemis)',
      gravity: '1/6g (Partial Gravity)',
      primaryHazards: 'Regolith dust exposure (airways) and disrupted circadian rhythms.',
      co2Threshold: 0.65,
      radiationAlert: 40,
      commDelay: '≈ 1.3 s (Moon) / up to 20 min (Mars)',
      uplinkMs: 4000,
      tip: 'Perform post-EVA nasal/cabin swab and maintain 480 nm circadian light therapy.'
    }
  };

  const BODY_SEGMENTS = {
    'cn': {
      name: 'Head, Eyes & Brain',
      short: 'Head / Eyes',
      problemTitle: 'Neuro-Cognitive Stress, Headache & Ocular Pressure (SANS)',
      problemShort: 'Stress / SANS',
      dataset: 'SANS Study (NASA)',
      hazard: 'Microgravity Fluid Shift',
      functionDesc: 'In microgravity, bodily fluids shift cephalad and press behind the eyes, potentially blurring vision; it also reflects cognitive stress load and mental fatigue.',
      howToMeasure: 'Apply ultrasound gel to closed eyelid and hold portable probe for 10 seconds to check optic nerve sheath diameter (target < 5.0 mm), plus review HRV and sleep.',
      riskAction: 'If experiencing head pressure, elevated stress, or visual fatigue, apply elastic Thigh Cuffs for 2 hours and perform 4-7-8 breathing.',
      gestureHint: '☝️ Dwell 1.2 s over head or swipe 👋 Prev/Next to CN to inspect stress, sleep, and SANS ocular pressure.',
      problemStatus: {
        optimo: 'No signs of neuro-cognitive stress or SANS optic edema. HRV, sleep recovery, and optic nerve sheath remain within baseline.',
        warn: 'Moderate stress load or incipient cephalad pressure (reduced HRV, sleep debt, or emotional strain). Thigh Cuffs and 4-7-8 breathing recommended.',
        crit: 'ALERT: Severe stress, headache, or suspected SANS neuro-ocular syndrome (ONSD > 5.0 mm / high BP). Halt high-load tasks and notify Flight Surgeon.'
      }
    },
    'ts': {
      name: 'Chest, Heart & Lungs',
      short: 'Chest / Heart',
      problemTitle: 'Respiratory & Cardiac Rhythm Disturbances (Tachycardia / Tachypnea / Hypoxia)',
      problemShort: 'Heart / Resp.',
      dataset: 'Astroskin Vest Sensor',
      hazard: 'Closed Cabin Air & Microgravity',
      functionDesc: 'Monitors heart rate anomalies (tachycardia/bradycardia), respiratory rate (tachypnea), blood oxygen saturation, and cabin CO₂ buildup.',
      howToMeasure: 'Activate the Heart Rate (BPM) and Respiratory Rate (BRPM) monitor or clip the SpO₂ sensor to your index finger for 30 seconds (target ≥ 95%).',
      riskAction: 'If breathing or resting pulse is elevated, inspect cabin CO₂ (< 0.65%), reduce exertion, and perform slow paced breathing.',
      gestureHint: '☝️ Point to chest or show ✌️ Two fingers to start touchless Heart Rate and Respiratory Rate capture.',
      problemStatus: {
        optimo: 'Heart rate, respiratory rate, and SpO₂ saturation remain stable. Cabin ventilation is nominal.',
        warn: 'Moderate cardiorespiratory shift: elevated pulse or breathing rate, borderline SpO₂, or high cabin CO₂. Re-measure at rest.',
        crit: 'CARDIORESPIRATORY ALERT: Severe tachycardia/bradycardia, tachypnea, or hypoxia (SpO₂ < 90%). Check CO₂ scrubbers and O₂ supply immediately.'
      }
    },
    'tm': {
      name: 'Abdomen & Energy (Glucose)',
      short: 'Abdomen / Energy',
      problemTitle: 'Metabolic & Glycemic Imbalance',
      problemShort: 'Glucose / Metab.',
      dataset: 'Inspiration4 Blood Dataset',
      hazard: 'Spaceflight Diet & Stress',
      functionDesc: 'Tracks how your body converts spaceflight rations into cellular energy and prevents sharp glucose spikes (hyperglycemia) or drops (hypoglycemia).',
      howToMeasure: 'Prick the side of a fingertip, apply a blood drop to the glucometer strip, and log the value (healthy fasting target: 70–110 mg/dL).',
      riskAction: 'Do not skip scheduled meals, hydrate every 2 hours, and cut simple sugars if readings exceed 126 mg/dL.',
      gestureHint: '☝️ Point to abdomen or swipe 👋 to TM to review capillary glucose and metabolic energy balance.',
      problemStatus: {
        optimo: 'Energy metabolism and capillary blood glucose are within healthy range (70–110 mg/dL).',
        warn: 'Mild metabolic imbalance: glucose outside optimal window (72–126 mg/dL). Adjust carbohydrate intake and hydration.',
        crit: 'METABOLIC ALERT: Hypoglycemia (< 65 mg/dL) or marked hyperglycemia (≥ 160 mg/dL). Intervene immediately and re-test.'
      }
    },
    'ti': {
      name: 'Kidneys & Urinary Tract',
      short: 'Kidneys',
      problemTitle: 'Dehydration & Renal Stone Risk (Nephrolithiasis)',
      problemShort: 'Kidneys / Hydrat.',
      dataset: 'NASA Urine Chemistry',
      hazard: 'Bone Calcium Resorption',
      functionDesc: 'As microgravity accelerates bone calcium loss, excess calcium filters through the kidneys and can crystallize into painful stones without adequate hydration.',
      howToMeasure: 'Dip a reagent test strip into your morning urine sample and scan optically to measure specific gravity and urinary calcium.',
      riskAction: 'Drink at least 2.5 liters of water per day (approx. 1 pouch every 2 hours).',
      gestureHint: '☝️ Point to lower torso/pelvis or swipe 👋 to TI to inspect hydration and urinary calcium status.',
      problemStatus: {
        optimo: 'Hydration status adequate and urinary calcium excretion within safe limits.',
        warn: 'Moderate dehydration or elevated urine concentration; increased renal stone risk. Increase fluid intake.',
        crit: 'HIGH RENAL RISK: Severe dehydration or suspected renal colic/calculi. Prioritize hydration and consult Flight Surgeon.'
      }
    },
    'br-izq': {
      name: 'Left Arm (Blood Pressure)',
      short: 'Left Arm',
      problemTitle: 'Blood Pressure Anomaly (Hypertension / Hypotension)',
      problemShort: 'Blood Pressure',
      dataset: 'Blood Pressure Monitor',
      hazard: 'Stress & Fluid Shift',
      functionDesc: 'Primary anatomical site for measuring arterial pressure generated by left ventricular pumping.',
      howToMeasure: 'Wrap cuff 2 cm above the elbow crease, keep arm relaxed and neutrally floating, and press start (nominal target: ~120/80 mmHg).',
      riskAction: 'If pressure exceeds 135/85 mmHg, run the 4-7-8 slow breathing protocol in Private Space and re-measure in 20 minutes.',
      gestureHint: '☝️ Point to left arm or swipe 👋 to BR-IZQ to review systolic/diastolic pressure.',
      problemStatus: {
        optimo: 'Arterial blood pressure within nominal range; stable peripheral perfusion.',
        warn: 'Blood pressure elevated in caution zone (≥ 130/85 mmHg). Rest, perform 4-7-8 breathing, and re-check in 20 min.',
        crit: 'HYPERTENSIVE CRISIS / HEMODYNAMIC ALERT (≥ 140/90 mmHg). Suspend physical exertion and contact Flight Surgeon.'
      }
    },
    'br-der': {
      name: 'Right Arm (EVA Workload)',
      short: 'Right Arm',
      problemTitle: 'Muscular Overload & EVA Joint Fatigue',
      problemShort: 'EVA Fatigue',
      dataset: 'Spacewalk Activity Log',
      hazard: 'Spacesuit Mechanical Load',
      functionDesc: 'Bears primary mechanical torque while operating EVA tools and translating along external station handrails.',
      howToMeasure: 'Rotate shoulder through full range and palpate bicep/deltoid gently for soreness or swelling after an EVA.',
      riskAction: 'Apply a warm compress for 15 minutes and avoid heavy loads for 24 hours if muscular fatigue appears.',
      gestureHint: '☝️ Point to right arm to review shoulder/biceps strain after extravehicular activity.',
      problemStatus: {
        optimo: 'Full joint range of motion with no signs of EVA tool overload.',
        warn: 'Mild muscular fatigue or shoulder/arm stiffness after pressurized suit work. Apply warm compress and relative rest.',
        crit: 'ACUTE EVA INJURY OR INFLAMMATION: Limiting pain or strength loss. Restrict extravehicular tasks.'
      }
    },
    'ab-izq': {
      name: 'Left Forearm (Skin)',
      short: 'L. Forearm',
      problemTitle: 'Microbiome Dermatitis & Skin Irritation',
      problemShort: 'Skin / Dermatitis',
      dataset: 'Cabin Microbiome OSD-572',
      hazard: 'Closed Habitat Environment',
      functionDesc: 'Skin becomes drier and more sensitive in spacecraft habitats, increasing susceptibility to irritation or allergies from recycled air flora.',
      howToMeasure: 'Capture a close-up optical image if redness, dryness, or rashes appear.',
      riskAction: 'Apply fragrance-free barrier moisturizer and cleanse affected area with cabin antiseptic wipes.',
      gestureHint: '☝️ Point to left forearm to inspect skin alerts and OSD-572 microbiome protocol.',
      problemStatus: {
        optimo: 'Skin integrity preserved; no lesions or irritation from cabin humidity or recycled airflow.',
        warn: 'Mild dryness, erythema, or closed-cabin dermatitis. Moisturize and monitor progression.',
        crit: 'ACTIVE SKIN INFECTION OR REACTION: Spreading lesion or severe pruritus. Swab/photograph and isolate using antiseptic protocol.'
      }
    },
    'ab-der': {
      name: 'Right Forearm (Temperature)',
      short: 'R. Forearm',
      problemTitle: 'Thermal Stress & Core Thermoregulation Shift',
      problemShort: 'Thermal Stress',
      dataset: 'Wearable Thermal Sensor',
      hazard: 'Thermal Load Inside Spacesuit',
      functionDesc: 'Tracks thermoregulation balance, critical inside pressurized EVA suits where convective airflow is absent.',
      howToMeasure: 'Inspect the sleeve thermal telemetry sensor or take an ear tympanic reading (normal: 36.0°C to 37.4°C).',
      riskAction: 'If temperature exceeds 37.6°C, increase LCVG suit cooling water flow and rest in a well-ventilated module.',
      gestureHint: '☝️ Point to right forearm to check body temperature and heat-stress risk.',
      problemStatus: {
        optimo: 'Core body thermoregulation normal (36.0 °C – 37.4 °C).',
        warn: 'Moderate temperature rise (≥ 37.6 °C) or low-grade fever onset. Hydrate, ventilate, and verify LCVG cooling flow.',
        crit: 'THERMAL STRESS / HIGH FEVER (≥ 38.2 °C): Risk of heat exhaustion or systemic infection. Immediate cooling and EVA suspension.'
      }
    },
    'ma-izq': {
      name: 'Left Hand (Reflexes)',
      short: 'Left Hand',
      problemTitle: 'Cognitive Fatigue & Reaction Latency (PVT)',
      problemShort: 'Reflexes / Fatigue',
      dataset: 'NASA Cognitive Test (PVT)',
      hazard: 'Isolation & Sleep Debt',
      functionDesc: 'Measures neuro-motor response speed required for emergency responses and precision robotic arm operations.',
      howToMeasure: 'Complete the 15-second Psychomotor Vigilance Task by tapping the display immediately when the visual cue appears.',
      riskAction: 'If reaction latency exceeds 450 ms, fatigue is present: take a 20-min recovery nap or use 480 nm blue-enriched light.',
      gestureHint: '☝️ Point to left hand to evaluate psychomotor reaction latency and sleep-debt fatigue.',
      problemStatus: {
        optimo: 'Psychomotor reaction latency optimal (< 350 ms); cognitive alertness intact.',
        warn: 'Moderate cognitive fatigue or slowed reflexes from sleep debt. Schedule rest break or 480 nm light therapy.',
        crit: 'SEVERE ATTENTION/REFLEX DEFICIT: Latency > 500 ms or acute sleep deprivation. Do not operate robotic arm or critical maneuvers.'
      }
    },
    'ma-der': {
      name: 'Right Hand (Grip Strength)',
      short: 'Right Hand',
      problemTitle: 'Grip Fatigue & EMU Glove Compression',
      problemShort: 'Glove Strain',
      dataset: 'EMU Glove Ergonomics',
      hazard: 'Pressurized Suit Resistance',
      functionDesc: 'Pressurized EVA gloves act like rigid inflated bladders, placing high resistive strain on finger flexors and fingernails.',
      howToMeasure: 'Squeeze the dynamometer 3 times and inspect fingernails and knuckles for chafing or trauma immediately post-EVA.',
      riskAction: 'Perform structured finger flexor stretches before and after every suited run.',
      gestureHint: '☝️ Point to right hand to review grip strength and EMU glove micro-trauma.',
      problemStatus: {
        optimo: 'Grip strength nominal with no pressurized-glove skin or nail trauma.',
        warn: 'Hand flexor fatigue or knuckle/nailbed redness post-EVA. Perform hand mobility stretches.',
        crit: 'PRESSURIZED GLOVE TRAUMA: Fingernail delamination, paresthesia, or sharp grip drop. Re-size EMU glove fitment.'
      }
    },
    'mu-izq': {
      name: 'Left Thigh (Femur Bone)',
      short: 'Left Thigh',
      problemTitle: 'Femoral Bone Mineral Loss (Osteopenia)',
      problemShort: 'Bone Loss',
      dataset: 'NASA Bedrest Study',
      hazard: 'Microgravity Unloading',
      functionDesc: 'Weight-bearing long bones like the femur rapidly demineralize without gravitational mechanical loading.',
      howToMeasure: 'Run the quantitative ultrasound scanner over the mid-femur weekly and log ARED resistive squat load.',
      riskAction: 'Complete your daily 45-minute squat and deadlift protocol on the ARED resistive machine.',
      gestureHint: '☝️ Point to left thigh to inspect femoral bone status and ARED training compliance.',
      problemStatus: {
        optimo: 'Bone mineral density protected through daily ARED resistive loading and Vitamin D.',
        warn: 'Early demineralization trend from missed axial loading sets. Complete daily ARED session.',
        crit: 'ACCELERATED BONE LOSS: Elevated fracture risk upon gravitational return. Urgent countermeasure review.'
      }
    },
    'mu-der': {
      name: 'Right Thigh (Muscle Mass)',
      short: 'Right Thigh',
      problemTitle: 'Quadriceps Muscular Atrophy',
      problemShort: 'Muscle Atrophy',
      dataset: 'NASA Bedrest Study',
      hazard: 'Antigravity Unloading',
      functionDesc: 'Preserves ambulatory strength required to walk unassisted upon Lunar or Martian landing.',
      howToMeasure: 'Measure mid-thigh circumference with tape every 7 days to track lean muscle volume retention.',
      riskAction: 'Meet daily dietary protein targets and finish lower-limb resistive sets.',
      gestureHint: '☝️ Point to right thigh to review quadriceps mass retention and protein intake.',
      problemStatus: {
        optimo: 'Lower-body muscle volume and strength preserved within pre-flight baseline.',
        warn: 'Early quadriceps lean-mass decline. Increase lower-limb resistive volume and protein intake.',
        crit: 'SIGNIFICANT MUSCULAR ATROPHY: Functional weakness jeopardizing landing egress or surface traverses.'
      }
    },
    'p-izq': {
      name: 'Left Calf (Venous Flow)',
      short: 'Left Calf',
      problemTitle: 'Venous Stasis & Impaired Return Flow',
      problemShort: 'Venous Flow',
      dataset: 'NASA Venous Circulation',
      hazard: 'Absence of Hydrostatic Gradient',
      functionDesc: 'On Earth, calf muscles pump venous blood upward against gravity; in orbit they decondition rapidly from disuse.',
      howToMeasure: 'Press one finger firmly over the anterior shin for 5 seconds; tissue should rebound without pitting or swelling.',
      riskAction: 'Perform daily heel raises against resistance bands to activate the calf muscle pump.',
      gestureHint: '☝️ Point to left calf to check venous return status and confirm absence of edema.',
      problemStatus: {
        optimo: 'Venous return flow and left gastrocnemius tone normal; no edema detected.',
        warn: 'Sluggish venous return or mild calf fatigue. Execute resistance-band calf raises.',
        crit: 'SUSPECTED VENOUS STASIS / EDEMA: Visible calf swelling or tenderness. Perform venous Doppler scan and contact Flight Surgeon.'
      }
    },
    'p-der': {
      name: 'Right Calf (Tibia Bone)',
      short: 'Right Calf',
      problemTitle: 'Tibial Cortical Bone Weakness',
      problemShort: 'Tibial Density',
      dataset: 'NASA Bone Density',
      hazard: 'Skeletal Unloading',
      functionDesc: 'Absorbs vertical impact forces when ambulating or running on planetary surfaces.',
      howToMeasure: 'Monthly portable cortical ultrasound sweep along the anterior tibial crest.',
      riskAction: 'Take daily Vitamin D and Calcium supplementation as scheduled.',
      gestureHint: '☝️ Point to right calf to inspect tibial cortical integrity and supplementation.',
      problemStatus: {
        optimo: 'Tibial cortical strength preserved; nutritional supplementation on schedule.',
        warn: 'Slight reduction in tibial impact loading. Reinforce T2 treadmill sessions with axial harness.',
        crit: 'MARKED TIBIAL BONE WEAKNESS: High stress-fracture risk during Lunar/Martian surface impact.'
      }
    },
    'pi-izq': {
      name: 'Left Foot (Balance)',
      short: 'Left Foot',
      problemTitle: 'Neuro-Vestibular Balance Alteration',
      problemShort: 'Balance',
      dataset: 'NASA Motor Control',
      hazard: 'Gravity Transitions',
      functionDesc: 'Plantar mechanoreceptors lose sensitivity while floating, causing ataxia or stumbles upon gravity re-entry.',
      howToMeasure: 'With light handhold support, test single-leg static balance after completing lower-body exercise.',
      riskAction: 'Wear plantar pressure stimulation bands for 15 minutes daily.',
      gestureHint: '☝️ Point to left foot to review plantar proprioception and balance readiness.',
      problemStatus: {
        optimo: 'Plantar sensory sensitivity and postural balance control remain stable.',
        warn: 'Mild decline in plantar proprioception; apply stimulation bands and T2 balance drills.',
        crit: 'SEVERE VESTIBULAR / POSTURAL INSTABILITY: High fall hazard during gravity transition.'
      }
    },
    'pi-der': {
      name: 'Right Foot (Circulation)',
      short: 'Right Foot',
      problemTitle: 'Vascular Compression & Restraint Paresthesia',
      problemShort: 'Foot Compression',
      dataset: 'NASA Motor Control',
      hazard: 'Cabin Foot Restraints',
      functionDesc: 'Verifies adequate distal arterial perfusion all the way to the toes.',
      howToMeasure: 'Check that feet stay warm without numbness or tingling after anchored workstation restraint use.',
      riskAction: 'Release feet from workstation foot-loops every 90 minutes and perform ankle circles.',
      gestureHint: '☝️ Point to right foot to verify distal perfusion after foot-restraint work.',
      problemStatus: {
        optimo: 'Distal circulation and plantar temperature normal with no paresthesia.',
        warn: 'Mild dorsum tingling or strap compression from workstation footloops. Release restraints and mobilize ankles.',
        crit: 'SEVERE FOOT ISCHEMIA / COMPRESSION: Persistent coldness, pallor, or numbness. Release restraints immediately.'
      }
    }
  };

  const DEFAULT_STATE = {
    theme: 'dark',
    controlMode: 'manual',
    environment: 'station',
    profile: {
      crewName: 'Emilio Hernández Landa',
      crewRole: 'Systems & EVA Engineer',
      bloodType: 'O+',
      bodyMass: '72.5',
      heightCm: '176',
      allergies: 'None recorded',
      medicalNotes: 'Vestibular adaptation complete. No cardiovascular history.',
      baseHr: 58,
      baseHrv: 68,
      baseSpo2: 98,
      baseRr: 14,
      sleepTarget: 7.5,
      co2Limit: 0.65,
      emergencyProtocol: 'Flight Surgeon // Encrypted Channel 02'
    },
    latestMetrics: {
      hrv: 68,
      hr: 60,
      respRate: 14,
      spo2: 98,
      bpSys: 118,
      bpDia: 76,
      glucose: 94,
      temp: 36.6,
      sleep: 7.6,
      co2: 0.38,
      radiation: 14.2,
      pvtMs: 285,
      ultrasoundNote: 'ONSD: 4.4 mm (No optic edema)'
    },
    history: [
      { sol: 'SOL-109', hrv: 66, sleep: 7.4, glucose: 92 },
      { sol: 'SOL-110', hrv: 69, sleep: 7.8, glucose: 95 },
      { sol: 'SOL-111', hrv: 64, sleep: 7.1, glucose: 98 },
      { sol: 'SOL-112', hrv: 70, sleep: 7.8, glucose: 91 },
      { sol: 'SOL-113', hrv: 61, sleep: 6.8, glucose: 102 },
      { sol: 'SOL-114', hrv: 68, sleep: 7.6, glucose: 94 }
    ],
    segmentHealth: {
      'cn': 100, 'ts': 100, 'tm': 100, 'ti': 100,
      'br-izq': 100, 'br-der': 96, 'ab-izq': 100, 'ab-der': 100,
      'ma-izq': 100, 'ma-der': 100, 'mu-izq': 100, 'mu-der': 100,
      'p-izq': 100, 'p-der': 100, 'pi-izq': 100, 'pi-der': 100
    },
    countermeasures: [true, true, false, false, false],
    streakDays: 14,
    evaGates: [true, true, true, true, true, true],
    privateDiary: '',
    moodLog: buildSeedMoodLog(),
    groundTransmissions: []
  };

  /* =====================================================================
   *  PHQ-9 (Patient Health Questionnaire-9) — Kroenke, Spitzer & Williams 2001
   *  Adapted for onboard daily mood check-in. Score range 0–27.
   * ===================================================================== */
  const PHQ9_ITEMS = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself — or that you are a failure or have let yourself or your crew/family down',
    'Trouble concentrating on things, such as reading procedures or following a maneuver',
    'Moving or speaking so slowly that others noticed, or being so fidgety or restless that you move around a lot more than usual',
    'Thoughts that you would be better off dead, or of hurting yourself in some way'
  ];

  const PHQ_OPTIONS = [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' }
  ];

  const LEVEL_ORDER = { optimo: 0, precaucion: 1, accion: 2 };
  const LEVEL_FROM_ORDER = ['optimo', 'precaucion', 'accion'];

  /** 5-level qualitative scale for body segment integrity and coherence (0–100). */
  function severityWordFromScore(pct) {
    const v = Number(pct);
    if (v < 80) return 'Critical';
    if (v < 85) return 'Deficient';
    if (v < 90) return 'Sufficient';
    if (v < 98) return 'Acceptable';
    return 'Perfect';
  }

  /** 5-level qualitative scale for physiological stress load (0–100, lower is better). */
  function stressSeverityWord(index) {
    const v = Number(index);
    if (v <= 12) return 'Perfect';
    if (v <= 24) return 'Acceptable';
    if (v <= 38) return 'Sufficient';
    if (v <= 54) return 'Deficient';
    return 'Critical';
  }

  /** Qualitative scale for individual biometric stress factors (% of factor max). */
  function factorSeverityWord(val) {
    const v = Number(val);
    if (v <= 10) return 'Perfect';
    if (v <= 25) return 'Acceptable';
    if (v <= 45) return 'Sufficient';
    if (v <= 65) return 'Deficient';
    return 'Critical';
  }

  /** Qualitative scale for mood-to-biometrics coherence (0–100). */
  function coherenceWordFromScore(pct) {
    const v = Number(pct);
    if (v >= 88) return 'Perfect';
    if (v >= 75) return 'Acceptable';
    if (v >= 60) return 'Sufficient';
    if (v >= 45) return 'Deficient';
    return 'Critical';
  }

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Demo seed log (prior 6 days) so the 7-day trend starts populated
  function buildSeedMoodLog() {
    const seeds = [
      { score: 3, hr: 61, rr: 14, idx: 8, tx: 'private' },
      { score: 4, hr: 63, rr: 15, idx: 12, tx: 'private' },
      { score: 6, hr: 70, rr: 17, idx: 30, tx: 'sent' },
      { score: 5, hr: 66, rr: 16, idx: 22, tx: 'private' },
      { score: 2, hr: 60, rr: 14, idx: 6, tx: 'private' },
      { score: 3, hr: 62, rr: 14, idx: 10, tx: 'private' }
    ];
    const out = [];
    seeds.forEach((s, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (seeds.length - i));
      const phqLevel = s.score >= 15 ? 'accion' : s.score >= 5 ? 'precaucion' : 'optimo';
      const physioLevel = s.idx >= 50 ? 'accion' : s.idx >= 25 ? 'precaucion' : 'optimo';
      const cohPct = Math.max(0, 100 - Math.abs(Math.round((s.score / 27) * 100) - s.idx));
      out.push({
        date: todayKey(d),
        ts: d.getTime(),
        seed: true,
        score: s.score,
        severity: phqSeverityLabel(s.score, 0),
        phqLevel,
        item9: 0,
        vitals: { hr: s.hr, rr: s.rr },
        physio: { index: s.idx, level: physioLevel, severityWord: stressSeverityWord(s.idx) },
        coherence: {
          code: phqLevel === physioLevel ? 'coherente' : 'subreporte',
          pct: cohPct,
          levelWord: coherenceWordFromScore(cohPct)
        },
        finalLevel: phqLevel,
        transmission: { status: s.tx, ts: d.getTime() }
      });
    });
    return out;
  }

  function phqSeverityLabel(score, item9 = 0) {
    if (Number(item9) > 0 || score >= 20) return 'Critical';
    if (score <= 4) return 'Perfect';
    if (score <= 9) return 'Acceptable';
    if (score <= 14) return 'Sufficient';
    return 'Deficient';
  }

  /**
   * Scores the PHQ-9 questionnaire.
   * Traffic light: Green 0–4 · Yellow 5–14 · Red ≥15 or any item 9 response > 0.
   */
  function scorePHQ9(answers) {
    const score = answers.reduce((a, b) => a + Number(b || 0), 0);
    const item9 = Number(answers[8] || 0);
    let level = 'optimo';
    if (score >= 15 || item9 > 0) level = 'accion';
    else if (score >= 5) level = 'precaucion';
    return { score, item9, severity: phqSeverityLabel(score, item9), level };
  }

  /* =====================================================================
   *  VITAL SIGNS: classification for Heart Rate, Respiratory Rate & SpO₂
   * ===================================================================== */
  function classifyVital(type, v) {
    v = Number(v);
    if (type === 'hr') {
      if (v > 120 || v < 40) return { level: 'accion', label: v > 120 ? 'TACHYCARDIA' : 'BRADYCARDIA' };
      if (v > 100 || v < 45) return { level: 'precaucion', label: v > 100 ? 'ELEVATED' : 'LOW' };
      return { level: 'optimo', label: 'NORMAL' };
    }
    if (type === 'rr') {
      if (v >= 25 || v <= 8) return { level: 'accion', label: v >= 25 ? 'TACHYPNEA' : 'BRADYPNEA' };
      if (v > 20 || v < 10) return { level: 'precaucion', label: v > 20 ? 'FAST' : 'SLOW' };
      return { level: 'optimo', label: 'NORMAL' };
    }
    if (type === 'spo2') {
      if (v < 90) return { level: 'accion', label: 'HYPOXIA' };
      if (v < 95) return { level: 'precaucion', label: 'LOW' };
      return { level: 'optimo', label: 'NORMAL' };
    }
    if (type === 'hrv') {
      if (v < 35) return { level: 'accion', label: 'HIGH STRESS' };
      if (v < 50) return { level: 'precaucion', label: 'STRESS' };
      return { level: 'optimo', label: 'NORMAL' };
    }
    return { level: 'optimo', label: '—' };
  }

  /**
   * Physiological Stress Index (0–100) from HR, RR, HRV, sleep, BP, and SpO₂.
   * Cross-validates what the crew member reports on the PHQ-9 against bodily signals.
   */
  function computePhysioStress(metrics, profile) {
    const m = metrics;
    const p = profile;
    const factors = [];

    // Resting heart rate vs personal baseline (max 22)
    const hrDelta = m.hr - p.baseHr;
    let hrPts = 0;
    if (m.hr > 100 || hrDelta > 25) hrPts = 22;
    else if (hrDelta > 15) hrPts = 14;
    else if (hrDelta > 8) hrPts = 7;
    factors.push({ key: 'hr', name: 'Heart rate', value: `${m.hr} bpm (base ${p.baseHr})`, points: hrPts, max: 22 });

    // Respiratory rate (max 20)
    let rrPts = 0;
    if (m.respRate >= 25) rrPts = 20;
    else if (m.respRate > 20) rrPts = 14;
    else if (m.respRate >= 18) rrPts = 7;
    else if (m.respRate < 10) rrPts = 10;
    factors.push({ key: 'rr', name: 'Respiratory rate', value: `${m.respRate} brpm (normal 12–20)`, points: rrPts, max: 20 });

    // Heart rate variability (max 25) — primary autonomic stress marker
    const ratio = m.hrv / p.baseHrv;
    let hrvPts = 0;
    if (ratio < 0.6) hrvPts = 25;
    else if (ratio < 0.75) hrvPts = 15;
    else if (ratio < 0.9) hrvPts = 7;
    factors.push({ key: 'hrv', name: 'Heart rate variability (HRV)', value: `${m.hrv} ms (base ${p.baseHrv})`, points: hrvPts, max: 25 });

    // Sleep duration (max 20)
    let slPts = 0;
    if (m.sleep < 5) slPts = 20;
    else if (m.sleep < 6) slPts = 12;
    else if (m.sleep < p.sleepTarget - 0.5) slPts = 6;
    factors.push({ key: 'sleep', name: 'Sleep duration', value: `${m.sleep} h (target ${p.sleepTarget})`, points: slPts, max: 20 });

    // Blood pressure (max 8)
    let bpPts = 0;
    if (m.bpSys >= 140 || m.bpDia >= 90) bpPts = 8;
    else if (m.bpSys >= 130 || m.bpDia >= 85) bpPts = 4;
    factors.push({ key: 'bp', name: 'Blood pressure', value: `${m.bpSys}/${m.bpDia} mmHg`, points: bpPts, max: 8 });

    // Oxygen saturation (max 5)
    let spPts = 0;
    if (m.spo2 < 92) spPts = 5;
    else if (m.spo2 < 95) spPts = 3;
    factors.push({ key: 'spo2', name: 'Blood oxygen', value: `${m.spo2}%`, points: spPts, max: 5 });

    factors.forEach(f => {
      f.levelWord = factorSeverityWord(Math.round((f.points / f.max) * 100));
    });

    const index = Math.min(100, factors.reduce((a, f) => a + f.points, 0));
    const level = index >= 50 ? 'accion' : index >= 25 ? 'precaucion' : 'optimo';
    return { index, level, severityWord: stressSeverityWord(index), factors };
  }

  /**
   * Cross-references PHQ-9 score with physiological stress index to determine
   * whether self-reported mood aligns with objective biometrics.
   */
  function evaluateMoodCoherence(phq, physio) {
    const a = LEVEL_ORDER[phq.level];
    const b = LEVEL_ORDER[physio.level];
    const phqNorm = Math.round((phq.score / 27) * 100);
    const pct = Math.max(0, 100 - Math.abs(phqNorm - physio.index));
    const levelWord = coherenceWordFromScore(pct);

    let code, label, detail;
    if (a === b) {
      code = 'coherente';
      label = 'COHERENT';
      detail = 'Your self-reported PHQ-9 answers match your physiological signals (heart rate, breathing, HRV, and sleep).';
    } else if (b > a) {
      code = 'subreporte';
      label = 'POSSIBLE UNDER-REPORTING';
      detail = 'Your physiology shows more strain than the questionnaire indicates. This may reflect physical fatigue, unacknowledged stress, or downplaying symptoms.';
    } else {
      code = 'sin_correlato';
      label = 'DISTRESS WITHOUT PHYSICAL CORRELATE';
      detail = 'The test indicates emotional distress even though vital signs appear stable. PHQ-9 remains the primary clinical criterion: your feelings are valid.';
    }

    // Final traffic light: PHQ governs; physiological under-reporting elevates green -> yellow.
    // Red is reserved for PHQ (score >= 15 or item 9) for clinical safety.
    let finalOrder = a;
    if (code === 'subreporte' && a === 0) finalOrder = 1;
    return { code, label, detail, pct, levelWord, finalLevel: LEVEL_FROM_ORDER[finalOrder] };
  }

  function getTodayMoodEntry(state = getState()) {
    const key = todayKey();
    return (state.moodLog || []).find(e => e.date === key) || null;
  }

  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        saveState(DEFAULT_STATE);
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
      }
      const parsed = JSON.parse(raw);
      const base = JSON.parse(JSON.stringify(DEFAULT_STATE));
      return {
        ...base,
        ...parsed,
        profile: { ...base.profile, ...(parsed.profile || {}) },
        latestMetrics: { ...base.latestMetrics, ...(parsed.latestMetrics || {}) },
        segmentHealth: { ...base.segmentHealth, ...(parsed.segmentHealth || {}) },
        moodLog: Array.isArray(parsed.moodLog) ? parsed.moodLog : base.moodLog,
        groundTransmissions: Array.isArray(parsed.groundTransmissions) ? parsed.groundTransmissions : []
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function saveState(newState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }

  function updateState(updaterFn) {
    const current = getState();
    const updated = updaterFn(current) || current;
    saveState(updated);
    return updated;
  }

  // Evalúa automáticamente el semáforo clínico HRR basado en métricas reales
  function evaluateClinicalStatus(state = getState()) {
    const m = state.latestMetrics;
    const env = ENVIRONMENTS[state.environment] || ENVIRONMENTS.station;
    const alerts = [];
    let level = 'optimo'; // 'optimo' | 'precaucion' | 'accion'

    if (m.bpSys >= 140 || m.bpDia >= 90 || m.glucose >= 160 || m.glucose < 65 || m.co2 >= 0.95 || m.hrv < 35 ||
      m.hr > 120 || m.hr < 40 || m.respRate >= 25 || m.respRate <= 8 || m.spo2 < 90) {
      level = 'accion';
    } else if (
      m.bpSys >= 130 || m.bpDia >= 85 ||
      m.glucose >= 126 || m.glucose < 72 ||
      m.co2 >= env.co2Threshold ||
      m.hrv < (state.profile.baseHrv * 0.75) ||
      m.sleep < 6.0 ||
      m.temp >= 37.6 ||
      m.hr > 100 || m.hr < 45 ||
      m.respRate > 20 || m.respRate < 10 ||
      m.spo2 < 95
    ) {
      level = 'precaucion';
    }

    if (m.hr > 100) alerts.push(`Elevated heart rate (${m.hr} bpm)`);
    if (m.hr < 45) alerts.push(`Low heart rate (${m.hr} bpm)`);
    if (m.respRate > 20) alerts.push(`Rapid breathing (${m.respRate} brpm)`);
    if (m.respRate < 10) alerts.push(`Slow breathing (${m.respRate} brpm)`);
    if (m.spo2 < 95) alerts.push(`Low O₂ saturation (${m.spo2}%)`);
    if (m.bpSys >= 130 || m.bpDia >= 85) alerts.push(`Elevated blood pressure (${m.bpSys}/${m.bpDia} mmHg)`);
    if (m.glucose >= 126) alerts.push(`Elevated blood glucose (${m.glucose} mg/dL)`);
    if (m.glucose < 72) alerts.push(`Low blood glucose (${m.glucose} mg/dL)`);
    if (m.co2 >= env.co2Threshold) alerts.push(`Elevated CO₂ in ${env.name} (${m.co2}%)`);
    if (m.hrv < state.profile.baseHrv * 0.75) alerts.push(`HRV drop (${m.hrv} ms vs base ${state.profile.baseHrv} ms)`);
    if (m.sleep < 6.0) alerts.push(`Sleep debt detected (${m.sleep} h)`);
    if (m.temp >= 37.6) alerts.push(`Elevated body temperature (${m.temp}°C)`);

    return { level, alerts, env };
  }

  // Initializes shared Navbar state (Theme & Crew Member Name)
  function initCommonUI() {
    const state = getState();
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');

    const applyTheme = (mode) => {
      const isLight = mode === 'light';
      document.body.classList.toggle('light-mode', isLight);
      if (themeToggle) themeToggle.setAttribute('aria-pressed', String(isLight));
      if (themeLabel) themeLabel.textContent = isLight ? 'Light: ON' : 'Light: OFF';
    };

    applyTheme(state.theme);

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const updated = updateState(s => {
          s.theme = s.theme === 'light' ? 'dark' : 'light';
          return s;
        });
        applyTheme(updated.theme);
      });
    }

    // Populate crew name across elements marked with data-crew-name
    document.querySelectorAll('[data-crew-name]').forEach(el => {
      el.textContent = state.profile.crewName;
    });
  }

  /* =====================================================================
   *  SC-16 SEGMENT DIAGNOSTICS + METRIC SYNCHRONIZATION
   * ===================================================================== */
  function syncSegmentsFromMetrics(state) {
    const m = state.latestMetrics || {};
    const p = state.profile || DEFAULT_STATE.profile;
    const env = ENVIRONMENTS[state.environment] || ENVIRONMENTS.station;
    const sh = { ...(state.segmentHealth || {}) };
    const mood = getTodayMoodEntry(state) || ((state.moodLog || [])[state.moodLog.length - 1] || null);
    const note = String(m.ultrasoundNote || '').toLowerCase();

    // Head / Eyes / Stress (CN): HRV, sleep, PHQ-9 mood state, and ONSD (SANS)
    if (note.includes('5.7') || note.includes('5.8') || (!note.includes('sin edema') && !note.includes('no optic edema') && note.includes('edema')) || note.includes('alerta sans') || note.includes('sans alert')) {
      sh['cn'] = 74;
    } else if (m.hrv < 35 || m.sleep < 5.0 || (mood && !mood.seed && mood.finalLevel === 'accion')) {
      sh['cn'] = 78;
    } else if (m.hrv < p.baseHrv * 0.75 || m.sleep < 6.0 || (mood && !mood.seed && mood.finalLevel === 'precaucion')) {
      sh['cn'] = 86;
    } else {
      sh['cn'] = 100;
    }

    // Chest / Heart & Lungs (TS): HR, RR, SpO2, and cabin CO2
    if (m.hr > 120 || m.hr < 40 || m.respRate >= 25 || m.respRate <= 8 || m.spo2 < 90 || m.co2 >= 0.95) {
      sh['ts'] = 76;
    } else if (m.hr > 100 || m.hr < 45 || m.respRate > 20 || m.respRate < 10 || m.spo2 < 95 || m.co2 >= env.co2Threshold) {
      sh['ts'] = 84;
    } else {
      sh['ts'] = 100;
    }

    // Abdomen / Glucose (TM)
    sh['tm'] = (m.glucose >= 160 || m.glucose < 65) ? 76 : (m.glucose >= 126 || m.glucose < 72) ? 86 : 100;

    // Left Arm / Blood Pressure (BR-IZQ)
    sh['br-izq'] = (m.bpSys >= 140 || m.bpDia >= 90) ? 78 : (m.bpSys >= 130 || m.bpDia >= 85) ? 86 : 100;

    // Right Forearm / Temperature (AB-DER)
    sh['ab-der'] = (m.temp >= 38.2) ? 75 : (m.temp >= 37.6) ? 85 : 100;

    // Left Hand / PVT Reflexes (MA-IZQ)
    sh['ma-izq'] = (m.pvtMs >= 500 || m.sleep < 5.0) ? 78 : (m.pvtMs >= 420 || m.sleep < 6.0) ? 86 : 100;

    state.segmentHealth = sh;
    return state;
  }

  function getSegmentDiagnostics(partId, state = getState()) {
    const seg = BODY_SEGMENTS[partId];
    if (!seg) return null;
    const m = state.latestMetrics || {};
    const env = ENVIRONMENTS[state.environment] || ENVIRONMENTS.station;
    const pct = state.segmentHealth && state.segmentHealth[partId] != null ? state.segmentHealth[partId] : 100;
    const levelWord = severityWordFromScore(pct);
    const tier = pct < 80 ? 'crit' : pct < 90 ? 'warn' : 'optimo';
    const colorMap = { optimo: '#68ff9b', warn: '#fbbf24', crit: '#f87171' };
    const trafficPrefix = tier === 'crit' ? 'RED' : tier === 'warn' ? 'YELLOW' : 'GREEN';
    const tierLabel = `${trafficPrefix} · ${levelWord.toUpperCase()}`;
    const mood = getTodayMoodEntry(state) || ((state.moodLog || [])[state.moodLog.length - 1] || null);

    let metrics = [];
    if (partId === 'cn') {
      metrics = [
        { label: 'HRV Stress', val: `${m.hrv} ms` },
        { label: 'Sleep', val: `${m.sleep} h` },
        { label: 'PHQ-9 Mood', val: mood ? `${mood.score}/27 (${phqSeverityLabel(mood.score, mood.item9)})` : 'Pending' },
        { label: 'Optic (ONSD)', val: m.ultrasoundNote || 'Nominal' }
      ];
    } else if (partId === 'ts') {
      metrics = [
        { label: 'Heart Rate', val: `${m.hr} bpm` },
        { label: 'Resp. Rate', val: `${m.respRate} brpm` },
        { label: 'SpO₂', val: `${m.spo2}%` },
        { label: 'Cabin CO₂', val: `${m.co2}%` }
      ];
    } else if (partId === 'tm') {
      metrics = [
        { label: 'Glucose', val: `${m.glucose} mg/dL` },
        { label: 'SC-16 Level', val: levelWord }
      ];
    } else if (partId === 'br-izq') {
      metrics = [
        { label: 'Blood Pressure', val: `${m.bpSys}/${m.bpDia} mmHg` },
        { label: 'Pulse', val: `${m.hr} bpm` }
      ];
    } else if (partId === 'ab-der') {
      metrics = [
        { label: 'Temperature', val: `${m.temp} °C` },
        { label: 'SC-16 Level', val: levelWord }
      ];
    } else if (partId === 'ma-izq') {
      metrics = [
        { label: 'PVT Reflexes', val: `${m.pvtMs} ms` },
        { label: 'Sleep', val: `${m.sleep} h` }
      ];
    } else {
      metrics = [
        { label: 'SC-16 Level', val: levelWord },
        { label: 'Environment', val: env.gravity }
      ];
    }

    return {
      partId,
      seg,
      pct,
      levelWord,
      tier,
      color: colorMap[tier],
      tierLabel,
      problemTitle: seg.problemTitle,
      problemShort: seg.problemShort,
      diagnosis: seg.problemStatus[tier],
      gestureHint: seg.gestureHint,
      metrics
    };
  }

  /* =====================================================================
   *  MANUAL / HAND-GESTURE CONTROL SYSTEM (HANDS-FREE)
   * ===================================================================== */
  const GESTURE_GUIDE = [
    { gesture: '📷 Framing', title: 'Camera distance (40–60 cm)', desc: 'Keep your hand centered before the optical sensor or hover steadily before issuing a gesture.' },
    { gesture: '☝️ Dwell (1.2 s)', title: 'Touchless Selection', desc: 'In Gesture Mode, hold your finger/pointer for 1.2 s over any 3D body zone or button to activate it automatically.' },
    { gesture: '👋 Swipe ◀ / ▶', title: 'Navigate SC-16 / PHQ-9', desc: 'Move your hand left or right to step across all 16 anatomical segments or advance the PHQ-9 steps.' },
    { gesture: '✌️ Two Fingers', title: 'Measure Pulse & Breathing', desc: 'Starts the touchless 10 s capture of Heart Rate (BPM) and Respiratory Rate (BRPM).' },
    { gesture: '✊ Closed Fist', title: 'Confirm / 3D Auto Scan', desc: 'Runs the full 3D Anatomical Auto Scan or confirms saving the active biometric reading.' },
    { gesture: '👍 / 👎 Thumb', title: 'Ground Downlink Decision', desc: 'On a yellow PHQ-9 result in Private Space, 👍 sends summary to NASA Ground Control and 👎 keeps it private.' },
    { gesture: '🖐️ Open Palm', title: 'Pause or Clear Selection', desc: 'Stops an active scan, pauses the live sensor stream, or clears the selected segment.' }
  ];

  function injectGestureCSS() {
    if (document.getElementById('orbitGestureCSS')) return;
    const style = document.createElement('style');
    style.id = 'orbitGestureCSS';
    style.textContent = `
      .oc-gesture-wrap { display:flex; flex-direction:column; gap:0.55rem; }
      .oc-gesture-bar {
        display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem;
        border:1px solid var(--privacy-accent, #38bdf8);
        background:rgba(56, 189, 248, 0.08);
        padding:0.55rem 0.9rem; font-size:0.74rem;
      }
      .oc-mode-group { display:flex; align-items:center; gap:0.45rem; flex-wrap:wrap; }
      .oc-mode-btn {
        background:var(--bg-panel-alt, #06190e);
        border:1px solid var(--green-border, #1b6b3e);
        color:var(--green-mid, #28c76f);
        padding:0.32rem 0.7rem; font-size:0.72rem; cursor:pointer;
        text-transform:uppercase; letter-spacing:0.8px; transition:all .2s;
      }
      .oc-mode-btn.active {
        border-color:var(--privacy-accent, #38bdf8);
        background:var(--privacy-bg, rgba(56, 189, 248, 0.16));
        color:var(--privacy-accent, #38bdf8); font-weight:700;
      }
      .oc-gesture-pad { display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap; }
      .oc-gbtn {
        background:var(--bg-panel-alt, #06190e);
        border:1px solid var(--privacy-accent, #38bdf8);
        color:var(--privacy-accent, #38bdf8);
        padding:0.28rem 0.55rem; font-size:0.68rem; cursor:pointer;
        letter-spacing:0.5px; transition:all .15s;
      }
      .oc-gbtn:hover { background:var(--privacy-bg, rgba(56, 189, 248, 0.18)); }
      .oc-gesture-drawer {
        border:1px dashed var(--privacy-accent, #38bdf8);
        background:var(--bg-subpanel, rgba(2,10,5,0.94));
        padding:0.75rem 0.95rem;
        display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.55rem;
      }
      .oc-gesture-drawer[hidden] { display:none; }
      .oc-gcard {
        border:1px solid var(--green-border, #1b6b3e);
        background:var(--bg-panel-alt, #06190e);
        padding:0.45rem 0.6rem; font-size:0.71rem; line-height:1.38;
      }
      .oc-gcard strong { color:var(--privacy-accent, #38bdf8); display:block; margin-bottom:2px; }
      .oc-gcard span { color:var(--green-bright, #68ff9b); }
      .oc-g-feedback { font-size:0.7rem; color:var(--privacy-accent, #38bdf8); font-weight:700; }
      .oc-dwell-badge {
        position:fixed; z-index:9999; pointer-events:none; display:none;
        background:rgba(2, 10, 18, 0.92); color:#38bdf8; border:1px solid #38bdf8;
        padding:3px 7px; font-size:0.65rem; letter-spacing:0.6px;
        box-shadow:0 0 10px rgba(56, 189, 248, 0.45);
      }
      .oc-dwell-track { width:72px; height:4px; background:rgba(56,189,248,0.2); margin-top:3px; }
      .oc-dwell-fill { height:100%; width:0%; background:#68ff9b; }
      body.gesture-mode .body-zone-map:hover,
      body.gesture-mode .part-btn:hover { outline:1px dashed var(--privacy-accent, #38bdf8); }
    `;
    document.head.appendChild(style);
  }

  function initGestureHUD(options = {}) {
    injectGestureCSS();
    const state = getState();
    let mode = state.controlMode || 'manual';
    let drawerOpen = mode === 'gestos';

    const applyMode = (m) => {
      mode = m === 'gestos' ? 'gestos' : 'manual';
      document.body.classList.toggle('gesture-mode', mode === 'gestos');
      document.querySelectorAll('[data-control-mode-label]').forEach(el => {
        el.textContent = mode === 'gestos' ? 'GESTURE MODE (HANDS-FREE)' : 'MANUAL MODE';
      });
    };

    // Floating dwell badge (1.2s hover lock) when Gesture Mode is active
    let dwellBadge = document.getElementById('ocDwellBadge');
    if (!dwellBadge) {
      dwellBadge = document.createElement('div');
      dwellBadge.id = 'ocDwellBadge';
      dwellBadge.className = 'oc-dwell-badge';
      dwellBadge.innerHTML = '<span>☝️ LOCKING GESTURE…</span><div class="oc-dwell-track"><div class="oc-dwell-fill"></div></div>';
      document.body.appendChild(dwellBadge);
    }

    let dwellTarget = null;
    let dwellTimer = null;
    let dwellAnim = null;

    function clearDwell() {
      if (dwellTimer) clearTimeout(dwellTimer);
      if (dwellAnim) cancelAnimationFrame(dwellAnim);
      dwellTimer = null;
      dwellAnim = null;
      dwellTarget = null;
      dwellBadge.style.display = 'none';
    }

    const DWELL_SELECTOR = '.body-zone-map, .part-btn, .ov-btn, .ov-chip, .action-btn, .phq-opt span, .triage-sim-btn, .scan-action-btn';

    document.addEventListener('pointermove', (e) => {
      if (mode !== 'gestos') {
        if (dwellTarget) clearDwell();
        return;
      }
      const el = e.target && e.target.closest ? e.target.closest(DWELL_SELECTOR) : null;
      if (!el || el.disabled) {
        clearDwell();
        return;
      }
      dwellBadge.style.left = `${Math.min(window.innerWidth - 130, e.clientX + 14)}px`;
      dwellBadge.style.top = `${Math.min(window.innerHeight - 40, e.clientY + 14)}px`;

      if (el === dwellTarget) return;
      clearDwell();
      dwellTarget = el;
      dwellBadge.style.display = 'block';
      const fill = dwellBadge.querySelector('.oc-dwell-fill');
      const start = performance.now();
      const DWELL_MS = 1200;

      const tick = (now) => {
        if (dwellTarget !== el || mode !== 'gestos') return;
        const p = Math.min(1, (now - start) / DWELL_MS);
        fill.style.width = `${Math.round(p * 100)}%`;
        if (p < 1) dwellAnim = requestAnimationFrame(tick);
      };
      dwellAnim = requestAnimationFrame(tick);

      dwellTimer = setTimeout(() => {
        const targetEl = dwellTarget;
        clearDwell();
        if (targetEl) {
          targetEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      }, DWELL_MS);
    });

    document.addEventListener('pointerdown', clearDwell);

    const mountEl = options.mountEl || (options.containerId ? document.getElementById(options.containerId) : null);
    let feedbackEl = null;

    function setFeedback(txt) {
      if (feedbackEl) feedbackEl.textContent = txt;
    }

    function renderBar() {
      if (!mountEl) return;
      const isGestos = mode === 'gestos';
      const ctx = options.context || 'general';
      const extraBtns = ctx === 'opcion1'
        ? `<button type="button" class="oc-gbtn" data-gesture="approve" title="Thumbs up: Downlink to Ground Control (yellow state)">👍 Send</button>
           <button type="button" class="oc-gbtn" data-gesture="reject" title="Thumbs down: Keep private">👎 Private</button>`
        : `<button type="button" class="oc-gbtn" data-gesture="scan" title="Closed fist: 3D Auto Scan">✊ 3D Scan</button>
           <button type="button" class="oc-gbtn" data-gesture="vitals" title="Two fingers: Capture Pulse & Breathing">✌️ Vitals</button>`;

      mountEl.innerHTML = `
        <div class="oc-gesture-wrap">
          <div class="oc-gesture-bar">
            <div class="oc-mode-group">
              <strong style="color:var(--privacy-accent,#38bdf8); letter-spacing:1px;">OPERATION:</strong>
              <button type="button" class="oc-mode-btn ${!isGestos ? 'active' : ''}" data-set-mode="manual">🖱️ Manual</button>
              <button type="button" class="oc-mode-btn ${isGestos ? 'active' : ''}" data-set-mode="gestos">🖐️ Gesture Mode</button>
              <button type="button" class="oc-gbtn" data-toggle-guide="1">${drawerOpen ? '▲ Hide Gesture Guide' : '▼ Gesture Instructions'}</button>
            </div>
            <div class="oc-gesture-pad">
              <span class="oc-g-feedback" id="ocGestureFeedback">${isGestos ? 'Gesture sensor active (dwell 1.2 s or issue command):' : 'Touch/mouse mode active · Switch to Gesture Mode for hands-free control'}</span>
              <button type="button" class="oc-gbtn" data-gesture="prev" title="Swipe left">👋 ◀ Prev</button>
              <button type="button" class="oc-gbtn" data-gesture="next" title="Swipe right">👋 Next ▶</button>
              ${extraBtns}
              <button type="button" class="oc-gbtn" data-gesture="release" title="Open palm: Release / Pause">🖐️ Release</button>
            </div>
          </div>
          <div class="oc-gesture-drawer" id="ocGestureDrawer" ${drawerOpen ? '' : 'hidden'}>
            ${GESTURE_GUIDE.map(g => `
              <div class="oc-gcard">
                <strong>${g.gesture} — ${g.title}</strong>
                <span>${g.desc}</span>
              </div>`).join('')}
          </div>
        </div>
      `;

      feedbackEl = mountEl.querySelector('#ocGestureFeedback');

      mountEl.querySelectorAll('[data-set-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const nextMode = btn.dataset.setMode;
          updateState(s => { s.controlMode = nextMode; return s; });
          applyMode(nextMode);
          if (nextMode === 'gestos') drawerOpen = true;
          renderBar();
          if (options.onModeChange) options.onModeChange(nextMode);
        });
      });

      const toggleBtn = mountEl.querySelector('[data-toggle-guide]');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          drawerOpen = !drawerOpen;
          const drawer = mountEl.querySelector('#ocGestureDrawer');
          if (drawer) drawer.hidden = !drawerOpen;
          toggleBtn.textContent = drawerOpen ? '▲ Hide Gesture Guide' : '▼ Gesture Instructions';
        });
      }

      mountEl.querySelectorAll('[data-gesture]').forEach(btn => {
        btn.addEventListener('click', () => {
          const g = btn.dataset.gesture;
          setFeedback(`Gesture detected: ${btn.textContent.trim()}`);
          if (options.onGesture) options.onGesture(g);
        });
      });
    }

    applyMode(mode);
    renderBar();

    return {
      getMode: () => mode,
      setMode: (m) => {
        updateState(s => { s.controlMode = m; return s; });
        applyMode(m);
        if (m === 'gestos') drawerOpen = true;
        renderBar();
      },
      toggleGuide: (open) => {
        drawerOpen = open !== undefined ? open : !drawerOpen;
        renderBar();
      },
      setFeedback
    };
  }

  return {
    ENVIRONMENTS,
    BODY_SEGMENTS,
    GESTURE_GUIDE,
    getState,
    saveState,
    updateState,
    evaluateClinicalStatus,
    syncSegmentsFromMetrics,
    getSegmentDiagnostics,
    initCommonUI,
    initGestureHUD,
    PHQ9_ITEMS,
    PHQ_OPTIONS,
    todayKey,
    phqSeverityLabel,
    severityWordFromScore,
    coherenceWordFromScore,
    stressSeverityWord,
    factorSeverityWord,
    scorePHQ9,
    classifyVital,
    computePhysioStress,
    evaluateMoodCoherence,
    getTodayMoodEntry
  };
})();