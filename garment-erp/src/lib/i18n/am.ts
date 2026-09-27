/**
 * Amharic translation strings.
 * All UI text lives here — never hard-coded in components.
 * Keys are English identifiers; values are Amharic strings.
 * Follow the glossary in master plan chapter 14.
 */

export const am = {
  // ── App / General ────────────────────────────────────────────────────────
  appName: "የልብስ ፋብሪካ አስተዳደር ሥርዓት",
  loading: "በመጫን ላይ...",
  save: "አስቀምጥ",
  cancel: "ሰርዝ",
  delete: "ሰርዝ",
  edit: "አስተካክል",
  add: "አዲስ ጨምር",
  search: "ፈልግ...",
  filter: "አጣራ",
  export: "ወደ Excel/PDF አውጣ",
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
  required: "ይህ መስክ መሞላት አለበት",
  error: "ስህተት ተፈጥሯል",
  success: "ተሳክቷል",
  warning: "ማስጠንቀቂያ",
  permissionDenied: "ይህንን ገጽ ለማየት ወይም ለመጠቀም ፈቃድ የለዎትም",
  noData: "ምንም የተመዘገበ መረጃ የለም",
  rowsPerPage: "በአንድ ገጽ የሚታዩ",
  page: "ገጽ",
  of: "ከ",
  draft: "ረቂቅ",
  submitted: "ቀርቧል",
  verified: "ተረጋግጧል",
  locked: "ተቆልፏል",
  pending: "በጥበቃ ላይ",

  // ── Navigation ───────────────────────────────────────────────────────────
  nav: {
    dashboard: "ዳሽቦርድ (ጠቅላላ እይታ)",
    employees: "ሠራተኞች",
    attendance: "የሠራተኞች መገኘት",
    counts: "የሰዓት ምርት ቆጠራ",
    dayClose: "የዕለት ሥራ ማጠቃለያ",
    incentive: "የኢንሴንቲቭ ክፍያ",
    salary: "የቋሚ ደሞዝ ሠንጠረዥ",
    materials: "ጥሬ ዕቃዎችና መጋዘን",
    cutting: "የቆረጣ ክፍል",
    production: "የምርት ሂደት",
    quality: "ጥራት ቁጥጥር (QC)",
    packing: "የተጠናቀቀ ምርትና ማሸግ",
    delivery: "ምርት ርክክብና መላኪያ",
    reports: "ሪፖርቶችና ትንተና",
    settings: "የሥርዓቱ ቅንብሮች",
    users: "ተጠቃሚዎችና ፈቃዶች",
    auditLog: "የተግባራት ምዝግብ (ኦዲት)",
    logout: "ውጣ",
  },

  // ── Login ────────────────────────────────────────────────────────────────
  login: {
    title: "ወደ ፋብሪካው ሥርዓት ይግቡ",
    employeeCode: "የሠራተኛ መለያ ቁጥር",
    pin: "የይለፍ ፒን (PIN)",
    signIn: "ግባ",
    invalidCredentials: "የሠራተኛ ቁጥር ወይም ፒን ትክክል አይደለም",
    accountDisabled: "ይህ የተጠቃሚ አካውንት እንዳይሰራ ታግዷል",
    employeeCodePlaceholder: "ለምሳሌ፦ EMP-001",
    pinPlaceholder: "••••",
  },

  // ── Roles ────────────────────────────────────────────────────────────────
  roles: {
    ADMIN: "አስተዳዳሪ (Admin)",
    SUPER_MANAGER: "ዋና ሥራ አስኪያጅ (Super Manager)",
    STORE_KEEPER: "የጥሬ ዕቃ መጋዘን ኃላፊ",
    CUTTING_MANAGER: "የቆረጣ ክፍል ኃላፊ",
    PRODUCTION_MANAGER: "የምርትና ስፌት ኃላፊ",
    QC_INSPECTOR: "የጥራት ተቆጣጣሪ (QC)",
    FINISHED_GOODS_MANAGER: "የተጠናቀቀ ምርት መጋዘን ኃላፊ",
    HR_CLERK: "የሰው ኃይልና ጸሐፊ (HR)",
    OPERATOR: "የስራ ቦታ ኦፕሬተር",
  },

  // ── Stages ───────────────────────────────────────────────────────────────
  stages: {
    RECEIVING: "ጥሬ ዕቃ መቀበያ",
    CUTTING: "ቆረጣ",
    SEWING: "ስፌት",
    TRIMMING: "ለቀማና ማፅዳት",
    QUALITY_CONTROL: "ጥራት ቁጥጥር (QC)",
    STYLING_HITPRESS: "ሂትፕረስና ማስተካከል",
    IRONING: "ካውያ",
    PACKING: "ማሸግ",
    DELIVERY: "ርክክብና መላኪያ",
  },

  // ── Employees ────────────────────────────────────────────────────────────
  employees: {
    title: "የሠራተኞች ማውጫ",
    addEmployee: "አዲስ ሠራተኛ መዝግብ",
    editEmployee: "የሠራተኛ መረጃ አስተካክል",
    name: "ሙሉ ስም",
    department: "የሥራ ክፍል",
    serialNumber: "ተ.ቁ",
    hiredAt: "የተቀጠረበት ቀን",
    status: "የሥራ ሁኔታ",
    active: "ንቁ (በስራ ላይ ያለ)",
    inactive: "የማይሰራ / የታገደ",
    noEmployees: "ምንም የተመዘገበ ሠራተኛ አልተገኘም",
  },

  // ── Attendance ───────────────────────────────────────────────────────────
  attendance: {
    title: "የሠራተኞች የዕለት መገኘት",
    hoursWorked: "የተሠራበት የሰዓት ብዛት",
    fullShift: "ሙሉ ቀን (8 ሰዓት)",
    halfShift: "ግማሽ ቀን (4 ሰዓት)",
    absent: "አልቀረበም / ቀሪ",
    line: "የስራ መስመር",
    markAll: "ሁሉንም ሙላ",
    bulkAttendance: "የጋራ መገኘት መመዝገቢያ",
  },

  // ── Hourly Counts ────────────────────────────────────────────────────────
  counts: {
    title: "የሰዓት ምርት ቆጠራ መመዝገቢያ",
    hourlyCount: "የሰዓት ምርት ቆጠራ",
    hour: "ሰዓት",
    produced: "የተመረተ ብዛት (ፍሬ)",
    target: "የሰዓት ዒላማ",
    plus: "+ትርፍ ፍሬ",
    minus: "−ጉድለት ፍሬ",
    mistakes: "የስፌት ብልሽቶች",
    mistakeReason: "የብልሽት ምክንያት",
    dayTarget: "የዕለቱ ጠቅላላ ዒላማ",
    totalProduced: "ጠቅላላ የተመረተ",
    difference: "ከዒላማ ልዩነት",
    percentOfTarget: "የዒላማ አፈጻጸም %",
    aboveTarget: "ከዒላማ በላይ",
    belowTarget: "ከዒላማ በታች",
    enterCount: "ምርት መዝግብ",
    verifyCount: "ቁጥር አረጋግጥ",
    closeDay: "የዕለት ሥራ አጠቃልል",
    dayAlreadyClosed: "የዕለቱ ሥራ ተጠቃልሎ ተዘግቷል",
    unusualCount: "ያልተለመደ ከፍተኛ/ዝቅተኛ ቁጥር — እባክዎ ደግመው ያረጋግጡ",
    h1: "ሰዓት 1",
    h2: "ሰዓት 2",
    h3: "ሰዓት 3",
    h4: "ሰዓት 4",
    h5: "ሰዓት 5",
    h6: "ሰዓት 6",
    h7: "ሰዓት 7",
    h8: "ሰዓት 8",
  },

  // ── Incentive ────────────────────────────────────────────────────────────
  incentive: {
    title: "የምርት ኢንሴንቲቭ አስተዳደር",
    statement: "የኢንሴንቲቭ ክፍያ ዝርዝር ሰሌዳ",
    period1: "የ1ኛ ወቅት ክፍያ (ቀን 4)",
    period2: "የ2ኛ ወቅት ክፍያ (ቀን 19)",
    rate: "የሳንቲም ተመን",
    ratePerPiece: "በፍሬ ተመን (ሳንቲም)",
    targetPerHour: "በሰዓት የሚጠበቅ ዒላማ",
    plusPieces: "+የትርፍ ምርት ፍሬ",
    minusPieces: "−ያልተሟላ ፍሬ",
    mistakes: "የስፌት ብልሽቶች (×2 ቅጣት)",
    calculated: "የተሰላ መጠን (ብር)",
    payable: "የሚከፈል የተጣራ (ብር)",
    suspended: "ክፍያው ታግዷል",
    monthSummary: "ወርሃዊ የኢንሴንቲቭ ማጠቃለያ",
    periodFrom: "ከቀን",
    periodTo: "እስከ ቀን",
    pendingApproval: "የማኔጅመንት ማረጋገጫ የሚጠብቅ",
    approveStatement: "የክፍያ ዝርዝር አፅድቅ",
    approved: "ተረጋግጦ ፀድቋል",
    formula: "= (+ትርፍ ፍሬ − −ጉድለት ፍሬ − 2×ብልሽቶች) × ሳንቲም",
    payableRule: "የሚከፈለው ኢንሴንቲቭ ከዜሮ በታች አይሆንም",
  },

  // ── Salary ───────────────────────────────────────────────────────────────
  salary: {
    title: "የቋሚ ደሞዝ አስተዳደር",
    schedule: "የወርሃዊ ደሞዝ መክፈያ ሠንጠረዥ",
    fixedSalary: "ወርሃዊ ቋሚ ደሞዝ (ብር)",
    daysAttended: "የተገኘባቸው ቀናት",
    effectiveFrom: "የሚጀምርበት ቀን",
    setSalary: "ደሞዝ መድብ / መዝግብ",
    salaryHistory: "የደሞዝ ማሻሻያ ታሪክ",
    approveSchedule: "የደሞዝ ሠንጠረዥ አፅድቅ",
    restricted: "ይህ መረጃ ለሱፐር ማኔጀር እና ለአስተዳዳሪ ብቻ የተፈቀደ ነው",
  },

  // ── Materials / Stock ────────────────────────────────────────────────────
  materials: {
    title: "የጥሬ ዕቃዎችና ግብአቶች ክምችት",
    sku: "የዕቃ መለያ (SKU)",
    name: "የዕቃው ስም",
    unit: "መለኪያ",
    quantity: "መጠን / ብዛት",
    minimumLevel: "ዝቅተኛ የክምችት ወሰን",
    supplier: "አቅራቢ ድርጅት",
    lot: "የሎት (Lot) ቁጥር",
    receive: "ዕቃ ገቢ አድርግ",
    issue: "ዕቃ ለስራ አውጣ",
    return: "ወደ መጋዘን መልስ",
    adjust: "ክምችት አስተካክል",
    lowStock: "ዝቅተኛ የክምችት መጠን",
    currentStock: "ወቅታዊ የክምችት መጠን",
  },

  // ── Cutting ──────────────────────────────────────────────────────────────
  cutting: {
    title: "የጨርቅ ቆረጣ ክፍል",
    weightIssued: "የተሰጠ ጨርቅ ሚዛን (ኪ.ግ)",
    weightUsed: "ለቆረጣ የዋለ ጨርቅ (ኪ.ግ)",
    piecesCut: "የተቆረጡ ፍሬዎች ብዛት",
    wastage: "የጨርቅ ብክነት (%)",
    wastageAlert: "⚠️ የጨርቅ ብክነት ከተፈቀደው ወሰን በላይ ሆኗል!",
    bundles: "የተዘጋጁ ባንድሎች (ጥቅሎች)",
    createBundle: "አዲስ ባንድል ፍጠር",
  },

  // ── Quality Control ───────────────────────────────────────────────────────
  qc: {
    title: "የምርት ጥራት ቁጥጥር (QC)",
    inspect: "የጥራት ፍተሻ አካሂድ",
    pass: "ጥራቱን አሟልቶ ያለፈ",
    fail: "ጉድለት የተገኘበት",
    defectType: "የብልሽት / ጉድለት አይነት",
    piecesAffected: "የተበላሹ ፍሬዎች ብዛት",
    sendBack: "ለስራ ማስተካከያ (Repair) መልስ",
    repaired: "ተስተካክሎ ያለቀ",
    responsibleStage: "ጉድለቱ የተፈጠረበት የስራ ክፍል",
  },

  // ── Alerts ───────────────────────────────────────────────────────────────
  alerts: {
    LOW_STOCK: "📦 ዝቅተኛ የጥሬ ዕቃ ክምችት",
    WASTAGE: "⚠️ ከፍተኛ የጨርቅ ብክነት",
    DELAYED_ORDER: "⏰ የዘገየ የምርት ትዕዛዝ",
    REPORT_FAILED: "❌ ሪፖርት መላክ አልተሳካም",
    DAY_NOT_CLOSED: "⚠️ የዕለት ሥራ አልተዘጋም",
    UNUSUAL_COUNT: "⚠️ ያልተለመደ የምርት ቁጥር",
  },

  // ── Penalty ladder ───────────────────────────────────────────────────────
  offences: {
    title: "የዲሲፕሊንና ጥፋት እርምጃዎች",
    FIRST: "1ኛ ጥፋት — 2×ብልሽቶች ከኢንሴንቲቭ ይቀነሳሉ",
    SECOND: "2ኛ ጥፋት — የ2 ወር የኢንሴንቲቭ ክፍያ ይታገዳል",
    THIRD: "3ኛ ጥፋት — የጽሑፍ ማስጠንቀቂያና የHR ጉዳይ",
    FOURTH: "4ኛ ጥፋት — ከስራ እስከ ማሰናበት እርምጃ ይወሰዳል",
    recordOffence: "የጥፋት መዝገብ አስገባ",
    offenceLevel: "የጥፋት ደረጃ",
    offenceDate: "ጥፋቱ የተፈጸመበት ቀን",
    offenceReason: "የጥፋቱ ዝርዝር ምክንያት",
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    title: "ሪፖርቶችና ትንተናዎች",
    DAILY_SUMMARY: "የዕለት ጠቅላላ ማጠቃለያ",
    DAILY_PRODUCTION_SHEET: "የዕለት የምርት ሰሌዳ",
    DAILY_PIECE_COUNT: "የዕለት የቁጥር መመዝገቢያ ሰሌዳ",
    RUNNING_INCENTIVE: "ተከታታይ የኢንሴንቲቭ ክትትል",
    INCENTIVE_STATEMENT: "የኢንሴንቲቭ ክፍያ ሠንጠረዥ",
    MONTHLY_INCENTIVE_SUMMARY: "ወርሃዊ የኢንሴንቲቭ ማጠቃለያ ሪፖርት",
    MONTHLY_SALARY_SCHEDULE: "ወርሃዊ የደሞዝ መክፈያ ሰሌዳ",
    DAILY_INVENTORY: "የዕለት የጥሬ ዕቃ ክምችት ሪፖርት",
    CUTTING_WASTAGE: "የቆረጣ ብክነት ትንተና ሪፖርት",
    EMPLOYEE_PRODUCTIVITY: "የሠራተኞች ምርታማነት ትንተና",
    ORDER_STATUS: "የትዕዛዞች የዕድገት ደረጃ",
    generate: "ሪፖርት አዘጋጅ",
    download: "አውርድ (Download)",
    deliveryStatus: "የመላኪያ ሁኔታ",
    sent: "ተልኳል",
    failed: "አልተሳካም",
    pending: "በጥበቃ ላይ",
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    title: "ዳሽቦርድ (የፋብሪካው ጠቅላላ እይታ)",
    todayProduction: "የዛሬ ጠቅላላ ምርት",
    workersAboveTarget: "ዒላማ ያሳኩ ሠራተኞች",
    openAlerts: "ክፍት ማስጠንቀቂያዎች",
    currentStock: "ወቅታዊ የክምችት መጠን",
    pendingApprovals: "ለማፅደቅ የቀረቡ",
    recentActivity: "የቅርብ ጊዜ እንቅስቃሴዎች",
    incentiveCost: "የኢንሴንቲቭ ወጪ",
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    title: "የሥርዓቱ ዋና ቅንብሮች",
    wastageLimit: "የተፈቀደ ከፍተኛ የብክነት ወሰን (%)",
    salaryPayDay: "የወርሃዊ ደሞዝ መክፈያ ቀን",
    telegramSetup: "የቴሌግራም ማሳወቂያ ቦት ቅንብር",
    driveSetup: "የGoogle Drive ምትኬ ቅንብር",
    backups: "የመረጃ ምትኬዎች (Backups)",
    linkTelegram: "የቴሌግራም ቦት አገናኝ",
    verificationCode: "የማረጋገጫ ኮድ",
  },

  // ── Audit log ────────────────────────────────────────────────────────────
  audit: {
    title: "የተግባራት ምዝግብ (ኦዲት)",
    user: "ተጠቃሚ",
    action: "የተከናወነ ተግባር",
    entity: "የተቀየረ መረጃ",
    before: "ከለውጥ በፊት",
    after: "ከለውጥ በኋላ",
    reason: "የተደረገበት ምክንያት",
    actedAsManager: "በሥራ አስኪያጅ ፈቃድ የተከናወነ",
    timestamp: "የተከናወነበት ሰዓትና ቀን",
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
