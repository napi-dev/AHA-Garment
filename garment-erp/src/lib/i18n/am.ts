/**
 * Amharic translation strings.
 * All UI text lives here — never hard-coded in components.
 * Keys are English identifiers; values are Amharic strings.
 * Follow the glossary in master plan chapter 14.
 */

export const am = {
  // ── App / General ────────────────────────────────────────────────────────
  appName: "ልብስ ፋብሪካ ሥርዓት",
  loading: "በመጫን ላይ...",
  save: "አስቀምጥ",
  cancel: "ሰርዝ",
  delete: "ሰርዝ",
  edit: "አስተካክል",
  add: "ጨምር",
  search: "ፈልግ",
  filter: "አጣራ",
  export: "ወደ ውጭ አውጣ",
  print: "አትም",
  close: "ዝጋ",
  confirm: "አረጋግጥ",
  back: "ተመለስ",
  next: "ቀጣይ",
  previous: "ቀዳሚ",
  submit: "አስተላልፍ",
  approve: "አፅድቅ",
  reject: "ውድቅ አድርግ",
  verify: "አረጋግጥ",
  correct: "አስተካክል",
  reason: "ምክንያት",
  notes: "ማስታወሻ",
  total: "ጠቅላላ",
  serialNumber: "ተ.ቁ",
  date: "ቀን",
  signature: "ፊርማ",
  status: "ሁኔታ",
  actions: "ተግባራት",
  yes: "አዎ",
  no: "አይ",
  required: "ይህ መስክ ያስፈልጋል",
  error: "ስህተት ተፈጥሯል",
  success: "ተሳክቷል",
  warning: "ማስጠንቀቂያ",
  permissionDenied: "ተፈቅዶ አልነበረም",
  noData: "ምንም ዳታ የለም",
  rowsPerPage: "በገጽ ያሉ ረድፎች",
  page: "ገጽ",
  of: "ከ",
  draft: "ረቂቅ",
  submitted: "ቀርቧል",
  verified: "ተረጋግጧል",
  locked: "ተቆልፏል",
  pending: "በጥበቃ ላይ",

  // ── Navigation ───────────────────────────────────────────────────────────
  nav: {
    dashboard: "ዳሽቦርድ",
    employees: "ሠራተኞች",
    attendance: "መገኘት",
    counts: "ቁጥር ማስቀመጥ",
    dayClose: "ቀን ዝጋ",
    incentive: "ኢንሴንቲቭ",
    salary: "ደሞዝ",
    materials: "ጥሬ እቃ",
    cutting: "ቆረጣ",
    production: "ምርት",
    quality: "ጥራት",
    packing: "ማሸግ",
    delivery: "ማድረስ",
    reports: "ሪፖርቶች",
    settings: "ቅንብሮች",
    users: "ተጠቃሚዎች",
    auditLog: "የፍተሻ ምዝግብ",
    logout: "ውጣ",
  },

  // ── Login ────────────────────────────────────────────────────────────────
  login: {
    title: "ወደ ሥርዓቱ ይግቡ",
    employeeCode: "የሠራተኛ ቁጥር",
    pin: "ፒን",
    signIn: "ግባ",
    invalidCredentials: "ቁጥሩ ወይም ፒኑ ትክክል አይደለም",
    accountDisabled: "ይህ አካውንት ተዘጋ ነው",
    employeeCodePlaceholder: "EMP-001",
    pinPlaceholder: "••••",
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  roles: {
    ADMIN: "አስተዳዳሪ",
    SUPER_MANAGER: "ሱፐር ማኔጀር",
    STORE_KEEPER: "የመጋዘን ኃላፊ",
    CUTTING_MANAGER: "የቆረጣ ኃላፊ",
    PRODUCTION_MANAGER: "የምርት ኃላፊ",
    QC_INSPECTOR: "የጥራት ተቆጣጣሪ",
    FINISHED_GOODS_MANAGER: "የተጠናቀቀ እቃ ኃላፊ",
    HR_CLERK: "የሰው ሀብት / ጸሐፊ",
    OPERATOR: "የስራ ቦታ ኦፕሬተር",
  },

  // ── Stages ───────────────────────────────────────────────────────────────
  stages: {
    RECEIVING: "ጥሬ እቃ መቀበያ",
    CUTTING: "ቆረጣ",
    SEWING: "ስፌት",
    TRIMMING: "ለቀማ",
    QUALITY_CONTROL: "ጥራት ቁጥጥር",
    STYLING_HITPRESS: "ሂትፕረስ",
    IRONING: "ካውያ",
    PACKING: "ማሸግ",
    DELIVERY: "ማድረስ",
  },

  // ── Employees ────────────────────────────────────────────────────────────
  employees: {
    title: "ሠራተኞች",
    addEmployee: "ሠራተኛ ጨምር",
    editEmployee: "ሠራተኛ አስተካክል",
    name: "ሙሉ ስም",
    department: "ክፍል",
    serialNumber: "ተ.ቁ",
    hiredAt: "የተቀጠረበት ቀን",
    status: "ሁኔታ",
    active: "ንቁ",
    inactive: "ያልሰራ",
    noEmployees: "ምንም ሠራተኛ የለም",
  },

  // ── Attendance ───────────────────────────────────────────────────────────
  attendance: {
    title: "የምርት ሰጭ ሂደት",
    hoursWorked: "የሰሩ ሰዓቶች",
    fullShift: "ሙሉ ቀን (8 ሰዓት)",
    halfShift: "ግማሽ ቀን",
    absent: "አልቀረበም",
    line: "ረድፍ",
    markAll: "ሁሉንም አስምር",
    bulkAttendance: "የጅምላ ምርት ሰጭ",
  },

  // ── Hourly Counts ────────────────────────────────────────────────────────
  counts: {
    title: "ሥዕዳዊ ቁጥር ማስቀመጥ",
    hourlyCount: "በሰዓት ቁጥር",
    hour: "ሰዓት",
    produced: "የተሰሩ ፍሬዎች",
    target: "ዒላማ",
    plus: "+ፍሬ",
    minus: "−ፍሬ",
    mistakes: "ማሳሳቶች",
    mistakeReason: "የስህተት ምክንያት",
    dayTarget: "የቀን ዒላማ",
    totalProduced: "ጠቅላላ ያደረሱ",
    difference: "ልዩነት",
    percentOfTarget: "ከዒላማ %",
    aboveTarget: "ከዒላማ በላይ",
    belowTarget: "ከዒላማ በታች",
    enterCount: "ቁጥር አስገባ",
    verifyCount: "ቁጥር አረጋግጥ",
    closeDay: "ቀን ዝጋ",
    dayAlreadyClosed: "ቀኑ ተዘግቷል",
    unusualCount: "ያልተለመደ ቁጥር — ያረጋግጡ",
    h1: "ሰ1",
    h2: "ሰ2",
    h3: "ሰ3",
    h4: "ሰ4",
    h5: "ሰ5",
    h6: "ሰ6",
    h7: "ሰ7",
    h8: "ሰ8",
  },

  // ── Incentive ────────────────────────────────────────────────────────────
  incentive: {
    title: "ኢንሴንቲቭ",
    statement: "ኢንሴንቲቭ ክፍያ",
    period1: "ቀን 4 ክፍያ",
    period2: "ቀን 19 ክፍያ",
    rate: "ሳንቲም",
    ratePerPiece: "በፍሬ ዋጋ (ሳንቲም)",
    targetPerHour: "በሰዓት ዒላማ",
    plusPieces: "+ፍሬ",
    minusPieces: "−ፍሬ",
    mistakes: "ማሳሳቶች (×2)",
    calculated: "የተሰላ (ብር)",
    payable: "የሚከፈል (ብር)",
    suspended: "ታግዷል",
    monthSummary: "ወርሃዊ ማጠቃለያ",
    periodFrom: "ከ",
    periodTo: "እስከ",
    pendingApproval: "ለማፅደቅ በጥበቃ ላይ",
    approveStatement: "መግለጫ አፅድቅ",
    approved: "ፀድቋል",
    formula: "= (+ፍሬ − −ፍሬ − 2×ማሳሳቶች) × ሳንቲም",
    payableRule: "ሊከፈል የሚችለው ሁልጊዜ ከዜሮ ያነሰ አይደለም",
  },

  // ── Salary ───────────────────────────────────────────────────────────────
  salary: {
    title: "ቋሚ ደሞዝ",
    schedule: "ደሞዝ ሰሌዳ",
    fixedSalary: "ቋሚ ደሞዝ (ብር)",
    daysAttended: "የቀረቡ ቀናት",
    effectiveFrom: "ከ",
    setSalary: "ደሞዝ አዘጋጅ",
    salaryHistory: "የደሞዝ ታሪክ",
    approveSchedule: "ሰሌዳ አፅድቅ",
    restricted: "ለሱፐር ማኔጀር እና አስተዳዳሪ ብቻ",
  },

  // ── Materials / Stock ────────────────────────────────────────────────────
  materials: {
    title: "ጥሬ እቃ",
    sku: "SKU",
    name: "ስም",
    unit: "ክፍሎ",
    quantity: "መጠን",
    minimumLevel: "ዝቅተኛ ወሰን",
    supplier: "አቅራቢ",
    lot: "ሎት",
    receive: "ተቀበል",
    issue: "ሰጥ",
    return: "መልስ",
    adjust: "አስተካክል",
    lowStock: "ክምችት ዝቅተኛ ነው",
    currentStock: "ያለ ክምችት",
  },

  // ── Cutting ──────────────────────────────────────────────────────────────
  cutting: {
    title: "ቆረጣ",
    weightIssued: "የተሰጠ ጨርቅ (ኪ.ግ)",
    weightUsed: "የወጣ ጨርቅ (ኪ.ግ)",
    piecesCut: "የተቆረጡ ፍሬዎች",
    wastage: "ብክነት %",
    wastageAlert: "⚠️ ብክነት ከወሰን በላይ ነው",
    bundles: "ባንድሎች",
    createBundle: "ባንድል ፍጠር",
  },

  // ── Quality Control ───────────────────────────────────────────────────────
  qc: {
    title: "ጥራት ቁጥጥር",
    inspect: "ፍተሻ",
    pass: "ፀደቀ",
    fail: "ወደቀ",
    defectType: "የጉድለት አይነት",
    piecesAffected: "የተጠቁ ፍሬዎች",
    sendBack: "ለጥገና ላክ",
    repaired: "ተጠገነ",
    responsibleStage: "ተጠያቂ ደረጃ",
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  alerts: {
    LOW_STOCK: "📦 የክምችት ማስጠንቀቂያ",
    WASTAGE: "⚠️ የብክነት ማስጠንቀቂያ",
    DELAYED_ORDER: "⏰ ዘግይቶ ትዕዛዝ",
    REPORT_FAILED: "❌ ሪፖርት መላክ አልተሳካም",
    DAY_NOT_CLOSED: "⚠️ ቀኑ አልተዘጋም",
    UNUSUAL_COUNT: "⚠️ ያልተለመደ ቁጥር",
  },

  // ── Penalty ladder ───────────────────────────────────────────────────────
  offences: {
    title: "የቅጣት መሰላል",
    FIRST: "1ኛ ጥፋት — 2×ማሳሳቶች ከኢንሴንቲቭ ይቀነሳሉ",
    SECOND: "2ኛ ጥፋት — ኢንሴንቲቭ ለ2 ወር ታግዷል",
    THIRD: "3ኛ ጥፋት — ጽሑፍ ማስጠንቀቂያ እና HR ጉዳይ",
    FOURTH: "4ኛ ጥፋት — እስከ ሥራ ማቆም ሊሆን ይችላል",
    recordOffence: "ጥፋት ያስቀምጡ",
    offenceLevel: "የጥፋት ደረጃ",
    offenceDate: "የጥፋት ቀን",
    offenceReason: "ምክንያት",
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    title: "ሪፖርቶች",
    DAILY_SUMMARY: "የዕለት ማጠቃለያ",
    DAILY_PRODUCTION_SHEET: "የዕለት ምርት ሰሌዳ",
    DAILY_PIECE_COUNT: "የዕለት ቁጥር ሰሌዳ",
    RUNNING_INCENTIVE: "የቀጠለ ኢንሴንቲቭ",
    INCENTIVE_STATEMENT: "የኢንሴንቲቭ ሰሌዳ",
    MONTHLY_INCENTIVE_SUMMARY: "ወርሃዊ ኢንሴንቲቭ ማጠቃለያ",
    MONTHLY_SALARY_SCHEDULE: "ወርሃዊ ደሞዝ ሰሌዳ",
    DAILY_INVENTORY: "የዕለት ክምችት ሪፖርት",
    CUTTING_WASTAGE: "የቆረጣ ብክነት ሪፖርት",
    EMPLOYEE_PRODUCTIVITY: "የሠራተኛ ምርታማነት",
    ORDER_STATUS: "የትዕዛዝ ሁኔታ",
    generate: "ፍጠር",
    download: "አውርድ",
    deliveryStatus: "የላኪ ሁኔታ",
    sent: "ተልኳል",
    failed: "አልተሳካም",
    pending: "በጥበቃ ላይ",
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    title: "ዳሽቦርድ",
    todayProduction: "የዛሬ ምርት",
    workersAboveTarget: "ከዒላማ በላይ የሰሩ",
    openAlerts: "ክፍት ማስጠንቀቂያዎች",
    currentStock: "ያለ ክምችት",
    pendingApprovals: "ለማፅደቅ የቀሩ",
    recentActivity: "የቅርብ ጊዜ ተግባር",
    incentiveCost: "የኢንሴንቲቭ ወጪ",
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    title: "ቅንብሮች",
    wastageLimit: "የብክነት ወሰን (%)",
    salaryPayDay: "የደሞዝ ክፍያ ቀን",
    telegramSetup: "ቴሌግራም ቅንብር",
    driveSetup: "Google Drive ቅንብር",
    backups: "ምትኬዎች",
    linkTelegram: "ቴሌግራም አያይዝ",
    verificationCode: "የማረጋገጫ ኮድ",
  },

  // ── Audit log ────────────────────────────────────────────────────────────
  audit: {
    title: "የፍተሻ ምዝግብ",
    user: "ተጠቃሚ",
    action: "ተግባር",
    entity: "ነገር",
    before: "ቀዳሚ",
    after: "ቀጣይ",
    reason: "ምክንያት",
    actedAsManager: "እንደ ሥራ አስኪያጅ ሠርቷል",
    timestamp: "ጊዜ",
  },

  // ── Ethiopian calendar labels ─────────────────────────────────────────────
  ethMonths: [
    "መስከረም", // 1
    "ጥቅምት",  // 2
    "ህዳር",   // 3
    "ታህሳስ",  // 4
    "ጥር",    // 5
    "የካቲት",  // 6
    "መጋቢት",  // 7
    "ሚያዚያ",  // 8
    "ግንቦት",  // 9
    "ሰኔ",    // 10
    "ሐምሌ",   // 11
    "ነሐሴ",   // 12
    "ጳጉሜ",  // 13
  ],

  ethDaysOfWeek: ["እሁድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "አርብ", "ቅዳሜ"],
} as const;

export type AmharicStrings = typeof am;
