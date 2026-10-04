-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PRODUCTION_MANAGER', 'ORDER_PLACER', 'LINE_SUPERVISOR', 'STORE_KEEPER', 'CUTTING_MANAGER', 'QC_INSPECTOR');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT_UNAUTHORIZED', 'ABSENT_AUTHORIZED', 'SICK_LEAVE');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'LOCKED');

-- CreateEnum
CREATE TYPE "IncentiveStatementStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "OffenceLevel" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'FOURTH');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'WASTAGE', 'CONSUMPTION', 'DELAYED_ORDER', 'ORDER_COUNTDOWN', 'FLOW_VARIANCE', 'SHOP_SOLD_OUT', 'ATTENDANCE_MISSING', 'REPORT_FAILED', 'DAY_NOT_CLOSED', 'UNUSUAL_COUNT', 'HR_CASE', 'SALARY_CHANGED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIVE', 'ISSUE', 'RETURN', 'ADJUST');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY_SUMMARY', 'DAILY_PRODUCTION_SHEET', 'DAILY_PIECE_COUNT', 'RUNNING_INCENTIVE', 'INCENTIVE_STATEMENT', 'MONTHLY_INCENTIVE_SUMMARY', 'MONTHLY_SALARY_SCHEDULE', 'DAILY_INVENTORY', 'CUTTING_WASTAGE', 'EMPLOYEE_PRODUCTIVITY', 'ORDER_STATUS');

-- CreateEnum
CREATE TYPE "ShopMoveType" AS ENUM ('RECEIVE', 'SALE', 'RETURN');

-- CreateEnum
CREATE TYPE "ShopSource" AS ENUM ('FACTORY', 'RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('PCS', 'KG');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('S', 'M', 'L', 'XL', 'XXL');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "nameAm" TEXT,
    "pinHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "nameAm" TEXT NOT NULL,
    "nameEn" TEXT,
    "flowOrder" INTEGER,
    "controllers" "Role"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "nameAm" TEXT NOT NULL,
    "nameEn" TEXT,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "serialNumber" INTEGER NOT NULL,
    "employeeCode" TEXT,
    "nameAm" TEXT NOT NULL,
    "nameEn" TEXT,
    "departmentId" TEXT NOT NULL,
    "jobId" TEXT,
    "lineNo" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hiredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalarySetting" (
    "id" TEXT NOT NULL,
    "attendanceBonus" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "effectiveFrom" DATE NOT NULL,
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalarySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveCard" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "targetPerHour" INTEGER NOT NULL,
    "ratePerPiece" DECIMAL(6,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncentiveCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "enteredById" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSubmission" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyBox" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "h1" INTEGER,
    "h2" INTEGER,
    "h3" INTEGER,
    "h4" INTEGER,
    "h5" INTEGER,
    "h6" INTEGER,
    "h7" INTEGER,
    "h8" INTEGER,
    "totalProduced" INTEGER NOT NULL DEFAULT 0,
    "targetForDay" INTEGER NOT NULL DEFAULT 0,
    "plusPieces" INTEGER NOT NULL DEFAULT 0,
    "minusPieces" INTEGER NOT NULL DEFAULT 0,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "mistakeReason" TEXT,
    "supervisorId" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayClose" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "closedById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "DayClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivePeriod" (
    "id" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "ethYear" INTEGER NOT NULL,
    "ethMonth" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "paymentDay" INTEGER,
    "status" "IncentiveStatementStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentivePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveLine" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "ratePerPiece" DECIMAL(6,4) NOT NULL,
    "plusPieces" INTEGER NOT NULL DEFAULT 0,
    "minusPieces" INTEGER NOT NULL DEFAULT 0,
    "mistakes" INTEGER NOT NULL DEFAULT 0,
    "calculated" DECIMAL(10,2) NOT NULL,
    "payable" DECIMAL(10,2) NOT NULL,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspensionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "correctedFromId" TEXT,
    "correctionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offence" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "level" "OffenceLevel" NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "relatedBoxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suspension" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nameAm" TEXT NOT NULL,
    "nameEn" TEXT,
    "unit" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'other',
    "minimumLevel" DECIMAL(10,3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nameAm" TEXT NOT NULL,
    "nameEn" TEXT,
    "contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "lotId" TEXT,
    "reference" TEXT,
    "destination" TEXT,
    "enteredById" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAlert" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "color" TEXT,
    "size" "Size",
    "fromDeptId" TEXT,
    "toDeptId" TEXT,
    "unit" "Unit" NOT NULL DEFAULT 'PCS',
    "sentQty" DECIMAL(10,3) NOT NULL,
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedQty" DECIMAL(10,3),
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowInvestigation" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reasonFound" TEXT,
    "signedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowInvestigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fabricId" TEXT NOT NULL,
    "kgReceived" DECIMAL(10,3) NOT NULL,
    "piecesCut" INTEGER NOT NULL,
    "consumption" DECIMAL(8,4) NOT NULL,
    "limitUsed" DECIMAL(5,2) NOT NULL,
    "date" DATE NOT NULL,
    "cuttingLeadId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopMovement" (
    "id" TEXT NOT NULL,
    "type" "ShopMoveType" NOT NULL,
    "source" "ShopSource",
    "orderId" TEXT,
    "typeId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "buyerName" TEXT,
    "date" DATE NOT NULL,
    "enteredById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "defectType" TEXT NOT NULL,
    "responsibleDeptId" TEXT NOT NULL,
    "responsibleEmpId" TEXT,
    "piecesAffected" INTEGER NOT NULL,
    "repaired" BOOLEAN NOT NULL DEFAULT false,
    "repairedById" TEXT,
    "repairedAt" TIMESTAMP(3),
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportJob" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "periodDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "driveFileId" TEXT,
    "driveUrl" TEXT,
    "telegramMsgId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dayCloseId" TEXT,
    "periodId" TEXT,

    CONSTRAINT "ReportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "sentStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedReports" "ReportType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "reference" TEXT,
    "sentAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "actedAsManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_employeeCode_key" ON "AppUser"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_employeeId_key" ON "AppUser"("employeeId");

-- CreateIndex
CREATE INDEX "AppUser_role_idx" ON "AppUser"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Department_nameAm_key" ON "Department"("nameAm");

-- CreateIndex
CREATE INDEX "Department_flowOrder_idx" ON "Department"("flowOrder");

-- CreateIndex
CREATE INDEX "Job_departmentId_idx" ON "Job"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_departmentId_nameAm_key" ON "Job"("departmentId", "nameAm");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_serialNumber_key" ON "Employee"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_jobId_idx" ON "Employee"("jobId");

-- CreateIndex
CREATE INDEX "Employee_isActive_idx" ON "Employee"("isActive");

-- CreateIndex
CREATE INDEX "Employee_lineNo_idx" ON "Employee"("lineNo");

-- CreateIndex
CREATE INDEX "SalaryRecord_employeeId_effectiveFrom_idx" ON "SalaryRecord"("employeeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalarySetting_effectiveFrom_idx" ON "SalarySetting"("effectiveFrom");

-- CreateIndex
CREATE INDEX "IncentiveCard_jobId_effectiveFrom_idx" ON "IncentiveCard"("jobId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveCard_jobId_effectiveFrom_key" ON "IncentiveCard"("jobId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceSubmission_date_idx" ON "AttendanceSubmission"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSubmission_date_supervisorId_key" ON "AttendanceSubmission"("date", "supervisorId");

-- CreateIndex
CREATE INDEX "HourlyBox_date_idx" ON "HourlyBox"("date");

-- CreateIndex
CREATE INDEX "HourlyBox_employeeId_idx" ON "HourlyBox"("employeeId");

-- CreateIndex
CREATE INDEX "HourlyBox_jobId_idx" ON "HourlyBox"("jobId");

-- CreateIndex
CREATE INDEX "HourlyBox_departmentId_idx" ON "HourlyBox"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyBox_date_employeeId_key" ON "HourlyBox"("date", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "DayClose_date_key" ON "DayClose"("date");

-- CreateIndex
CREATE INDEX "IncentivePeriod_status_idx" ON "IncentivePeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IncentivePeriod_ethYear_ethMonth_periodNumber_key" ON "IncentivePeriod"("ethYear", "ethMonth", "periodNumber");

-- CreateIndex
CREATE INDEX "IncentiveLine_periodId_idx" ON "IncentiveLine"("periodId");

-- CreateIndex
CREATE INDEX "IncentiveLine_employeeId_idx" ON "IncentiveLine"("employeeId");

-- CreateIndex
CREATE INDEX "IncentiveLine_jobId_idx" ON "IncentiveLine"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "IncentiveLine_periodId_employeeId_key" ON "IncentiveLine"("periodId", "employeeId");

-- CreateIndex
CREATE INDEX "Offence_employeeId_idx" ON "Offence"("employeeId");

-- CreateIndex
CREATE INDEX "Offence_departmentId_idx" ON "Offence"("departmentId");

-- CreateIndex
CREATE INDEX "Suspension_employeeId_isActive_idx" ON "Suspension"("employeeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Material_sku_key" ON "Material"("sku");

-- CreateIndex
CREATE INDEX "Material_sku_idx" ON "Material"("sku");

-- CreateIndex
CREATE INDEX "Material_kind_idx" ON "Material"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_lotNumber_key" ON "Lot"("lotNumber");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_date_idx" ON "StockMovement"("materialId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProdOrder_orderNo_key" ON "ProdOrder"("orderNo");

-- CreateIndex
CREATE INDEX "ProdOrder_status_idx" ON "ProdOrder"("status");

-- CreateIndex
CREATE INDEX "ProdOrder_deadlineAt_idx" ON "ProdOrder"("deadlineAt");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderAlert_orderId_idx" ON "OrderAlert"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAlert_orderId_threshold_key" ON "OrderAlert"("orderId", "threshold");

-- CreateIndex
CREATE INDEX "Handover_orderId_idx" ON "Handover"("orderId");

-- CreateIndex
CREATE INDEX "Handover_fromDeptId_idx" ON "Handover"("fromDeptId");

-- CreateIndex
CREATE INDEX "Handover_toDeptId_idx" ON "Handover"("toDeptId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowInvestigation_handoverId_key" ON "FlowInvestigation"("handoverId");

-- CreateIndex
CREATE INDEX "CutJob_orderId_idx" ON "CutJob"("orderId");

-- CreateIndex
CREATE INDEX "CutJob_date_idx" ON "CutJob"("date");

-- CreateIndex
CREATE INDEX "ShopMovement_type_idx" ON "ShopMovement"("type");

-- CreateIndex
CREATE INDEX "ShopMovement_orderId_idx" ON "ShopMovement"("orderId");

-- CreateIndex
CREATE INDEX "ShopMovement_date_idx" ON "ShopMovement"("date");

-- CreateIndex
CREATE INDEX "Defect_responsibleDeptId_idx" ON "Defect"("responsibleDeptId");

-- CreateIndex
CREATE INDEX "Defect_orderId_idx" ON "Defect"("orderId");

-- CreateIndex
CREATE INDEX "GeneratedReport_type_periodKey_idx" ON "GeneratedReport"("type", "periodKey");

-- CreateIndex
CREATE INDEX "GeneratedReport_createdAt_idx" ON "GeneratedReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramRecipient_userId_key" ON "TelegramRecipient"("userId");

-- CreateIndex
CREATE INDEX "Alert_type_resolvedAt_idx" ON "Alert"("type", "resolvedAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRecord" ADD CONSTRAINT "SalaryRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveCard" ADD CONSTRAINT "IncentiveCard_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyBox" ADD CONSTRAINT "HourlyBox_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyBox" ADD CONSTRAINT "HourlyBox_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyBox" ADD CONSTRAINT "HourlyBox_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveLine" ADD CONSTRAINT "IncentiveLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "IncentivePeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveLine" ADD CONSTRAINT "IncentiveLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveLine" ADD CONSTRAINT "IncentiveLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveLine" ADD CONSTRAINT "IncentiveLine_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "IncentiveCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offence" ADD CONSTRAINT "Offence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offence" ADD CONSTRAINT "Offence_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProdOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAlert" ADD CONSTRAINT "OrderAlert_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProdOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProdOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_fromDeptId_fkey" FOREIGN KEY ("fromDeptId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_toDeptId_fkey" FOREIGN KEY ("toDeptId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowInvestigation" ADD CONSTRAINT "FlowInvestigation_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "Handover"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutJob" ADD CONSTRAINT "CutJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProdOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopMovement" ADD CONSTRAINT "ShopMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProdOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_responsibleDeptId_fkey" FOREIGN KEY ("responsibleDeptId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_dayCloseId_fkey" FOREIGN KEY ("dayCloseId") REFERENCES "DayClose"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportJob" ADD CONSTRAINT "ReportJob_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "IncentivePeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramRecipient" ADD CONSTRAINT "TelegramRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
