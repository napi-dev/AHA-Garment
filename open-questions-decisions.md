# Open questions: decisions and defaults


*Addendum to the Garment production and incentive system, Master plan v2.0 (revised). Version 2.1, September 20, 2026.*

## 1. Where things stand

The build can start now. This addendum records the answers given so far and, for every question still open, the default the system is built with until the client answers. Nothing here changes the incentive formula or the sample acceptance tests in the master plan.

**Decided** means you or the client settled it. **Default** means it is open, and the system is built with the stated behaviour, kept in settings so a different answer changes a setting rather than code.

| Q | Topic | Status | What is built |
|---|---|---|---|
| Q1 | Fixed salary | Decided | Salary is an input field, filled by the Super Manager or the Admin. Monthly schedule every 30 days. No salary arithmetic. |
| Q2 | Shortfalls | Decided | Net per period, Payable never below 0, nothing deducted from the fixed salary. |
| Q3 | Incentive card and operations | Decided | The card is the single source. Departments are the base unit. Operations are a grouping table. |
| Q4 | Hourly entry | Default | Supervisors enter actual pieces per hour. The system derives + and −. |
| Q5 | Absence and part days | Default | Target = hourly target × hours attended. |
| Q6 | What a mistake is | Default | A wrongly reported count. Entered with a reason. Value 0 until entered. |
| Q7 | Offences over time | Default | Recorded by Admin or Super Manager. 2 months = 4 pay periods. |
| Q8 | Pagume and periods | Default | Period boundaries kept in a per-month table. |
| Q9 | Wastage method | Default | Per cut job, from standard weight per piece, alert above 5%. |
| Q10 | Stage order | Default | Route per style, default the nine listed stages. |
| Q11 | Super Manager and Admin | Decided | Both see and act on everything. Only the Super Manager approves pay. Admin pay edits notify the Super Manager. |
| Q12 | Who enters counts | Default | Supervisors enter or verify. Operator entries stay pending until verified. |
| Q13 | Rates by garment | Default | One rate per department. |
| Q14 | QC rejections | Default | Rejected pieces are removed from the responsible operation. Repaired pieces are credited to the repair department only. |
| Q15 | Output conventions | Default | Blank signature column, Ethiopian dates, Arabic digits, no worker self-view, salaries visible only to the Super Manager and the Admin. |

## 2. Q1: Fixed salary

**Decision.** The salary is just an input. The Super Manager or the Admin fills it in for each employee. It is paid every 30 days. The system does not calculate anything on top of it.

### What gets built

- One salary amount per employee with an effective date. A change adds a new record and keeps the old one, so an old month always shows what was true then.
- Only the Super Manager and the Admin can see or edit salaries. Department roles and HR cannot. Any Admin entry or change sends a notice to the Super Manager, and every change is written to the audit log.
- A monthly fixed salary schedule generated every 30 days, with these columns: serial number, name, department, fixed salary, days attended (from attendance, for reference) and a blank signature column, with a total at the bottom. The schedule stays a draft until the Super Manager approves it.
- Not calculated: absence deductions, overtime, tax and pension. If the client wants any of them later, it is a written change request, because each one adds rules and legal duties.

### How the 30 days work

Ethiopian months have 30 days, so the schedule runs once per Ethiopian month on a pay date kept in settings, with day 30 as the default. Pagume (5 or 6 days) has no salary run of its own by default. Assumption to confirm: if the client means a rolling 30 days counted from each person's start date instead, the schedule logic changes, so confirm this one point.

### Layout

There is no client sample of a fixed salary schedule yet. The columns above are the default layout. When a sample arrives, the layout is changed to match it, and the acceptance test for this report is written against that sample.

## 3. Q3: Incentive card and operations

**Decision.** Handled with the design below. The two PDFs describe the same work in two ways (13 operations on the daily sheet, 21 rows on the incentive card), so the system keeps them separate and joins them with a mapping table.

### Design

- **The incentive card is the only source of targets and rates.** It is dated, so last month's statement still uses last month's numbers. Where the two PDFs disagree (hit press 82 against 90 per hour, ironing 41 against 45), the card wins.
- **Department is the base unit.** Each employee belongs to exactly one department, and each department has one card row (target per hour and rate per piece). The incentive engine reads only employee, department and card row. It never touches operations, so a mapping mistake cannot change anyone's pay.
- **Operation is only a reporting group** for the daily production sheet. A mapping table lists which departments belong to each operation. The Admin maintains it, and every change is audit-logged.
- On the sheet, each worker is shown against their own department's target, and a group's target is the sum of its workers' targets, not an average. Where an operation combines departments (ironing and packing), the workers are listed under their own department.
- Safeguard: a department with no operation appears in an Unmapped group instead of disappearing, and day close lists anything unmapped.

### Starting proposal for the mapping table

Made from department names and machine types only, before the real employee list exists. Clear rows are safe to load. Likely rows should be checked. Ask rows have no obvious card row and need the client.

| Sheet operation | Card departments (proposed) | Confidence |
|---|---|---|
| 1 Cutting and preparation, helpers | Cutter; Assistant cutter; Sticker and elastic cutting; Helper, trouser cutting | Likely |
| 2 DTF sticker heat-pressing | Heat-press applying | Clear |
| 3 Pocket sewing and topstitch | Pocket attaching; Sleeve topstitch and badge | Likely |
| 4 Neck rib and back tape | No matching card row | Ask |
| 5 Waistband and elastic joining | Waistband joining; Waist tacking | Likely |
| 6 Waist, Kanshay | Kanshay waist prep | Clear |
| 7 Trouser panel seam, front and back | No clear card row (overlock departments) | Ask |
| 8 Shoulder and sleeve joining | Shoulder, back and front; Sleeve and side; Sleeve | Likely |
| 9 T-shirt and trouser side seam | Side | Likely |
| 10 T-shirt and trouser hem or sleeve fold | Interlock hem | Clear |
| 11 Line material feeder or helper | Line helpers; Helper; Line running; Line control (all target 0) | Likely |
| 12 Thread trimming | Thread trimming | Clear |
| 13 Ironing and packing | Ironing; Packing | Clear |
| Not on the daily sheet | Quality inspector; Damage and repair (proposed group: Quality and repair) | Ask |

## 4. Q4 to Q8: not known yet

The client has not answered these. They are built with the defaults below. Each default is a setting, and each must be confirmed with the client before the pilot, because the incentive depends on them.

| Q | Default built | If the client answers differently |
|---|---|---|
| Q4 Hourly entry | Supervisors type actual pieces for hours 1 to 8 on a number pad. The system derives the difference against the hourly target, the daily + or −, and the period totals. | If the cells hold differences, the entry field accepts signed numbers. The derived totals stay the same. |
| Q5 Absence and part days | Target = hourly target × hours attended. A full shift is 8 hours. Hours come from attendance. An absent worker has a target of 0, so absence produces no negative and no penalty. | If the target stays fixed regardless of attendance, turn off the proportional setting. |
| Q6 What a mistake is | A count that was reported wrongly. Entered by a supervisor or the Admin with a reason, checked against bundle and QC records, and logged. The value is 0 until someone enters one, so the formula behaves exactly like the sample. | If a mistake means a sewing defect, only the source of the number changes (QC records). The formula does not change. |
| Q7 Offences over time | The Admin or Super Manager records each offence. The system counts them per employee and applies the ladder: 1st is the mistakes term in the formula; 2nd suspends the incentive for 2 months (4 pay periods); 3rd and 4th open an HR case and notify the Super Manager and the Admin, with no automatic pay effect. My assumption: offences do not expire until the client sets a window. | The window, the suspension length and the counting rule are settings. |
| Q8 Pagume and periods | Period boundaries live in a table per Ethiopian month, editable by the Admin, not in a formula. Period 1 runs from day 20 of the previous month to day 4, and Period 2 from day 5 to day 19. For Meskerem, whose previous month is Pagume, Period 1 runs from Nehase 20 to Meskerem 4 (20 or 21 days), so no day is left uncounted. My assumption: public holidays do not change the periods; holiday hours come through attendance. | Edit the table rows. No code change. |

## 5. To load after the build

The real incentive card, the real employee list and the Amharic glossary review will come after the build. None of them is needed to start. All three are needed before the pilot.

| Item | During the build | How the real version goes in |
|---|---|---|
| Real incentive card | Use the 21-row card in the master plan appendix as placeholder data, so the engine tests run. | Excel or CSV import screen for the Admin, with a preview and an error list before anything is saved. Dated, so it does not alter old statements. |
| Real employee list | Use sample employees, one per department, for screens and tests. | Excel or CSV import with the same preview. Each row needs a department, and a row without one is rejected. |
| Amharic glossary review | All screen text sits in one translation file, following the glossary in the master plan. | Two or three client staff review the wording. Only the translation file changes, never the logic. |

## 6. Ready-to-build checklist

| When | What |
|---|---|
| Start now | Application skeleton, login, the nine roles with server-side permission checks, Amharic strings, Ethiopic font, Ethiopian calendar conversion. Then departments, incentive card, employees and fixed salaries from the sample data. Then attendance, hourly counts and day close. Then the incentive engine as pure functions, tested against the appendix: Calculated 3,880.50, 3,765.00 and 7,645.50 ETB; Payable 4,243.50, 4,009.00 and 8,252.50 ETB. |
| Before deploying | Test that api.telegram.org and the Google APIs are reachable from the chosen host. Put the client's name on the hosting, Drive, Telegram bot and code accounts. Agree scope and support in writing. |
| Before the pilot | Q4 to Q8 confirmed with the client. Real incentive card and employee list loaded. Amharic wording reviewed. Sample fixed salary schedule received, if the client has one. Physical setup checked. HR or labour-law review of the incentive and penalty rules. |
| Before go-live | Recovery plan for the single Admin and single Super Manager. One full month in parallel with paper, with every difference explained. |
