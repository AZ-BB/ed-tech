import { netSessionCreditsByKindFromRows } from "./net-session-credits-used";

export type StudentAllocationRow = {
  studentId: string;
  studentName: string;
  advisorUsed: number;
  advisorLimit: number | null;
  ambassadorUsed: number;
  ambassadorLimit: number | null;
};

type StudentProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  advisor_credit_limit: number | null;
  ambassador_credit_limit: number | null;
};

type CreditHistoryRow = {
  student_id: string | null;
  amount: number;
  status: string | null;
  type: string;
};

export function buildStudentAllocations(
  profiles: StudentProfileRow[],
  creditRows: CreditHistoryRow[],
  schoolDefaults: {
    defaultAdvisorLimit: number | null;
    defaultAmbassadorLimit: number | null;
  },
): StudentAllocationRow[] {
  const usageByStudent = new Map<
    string,
    { advisorUsed: number; ambassadorUsed: number }
  >();

  const byStudent = new Map<string, CreditHistoryRow[]>();
  for (const row of creditRows) {
    const sid = row.student_id;
    if (!sid) continue;
    const list = byStudent.get(sid);
    if (list) list.push(row);
    else byStudent.set(sid, [row]);
  }

  for (const [studentId, rows] of byStudent) {
    const nets = netSessionCreditsByKindFromRows(rows);
    usageByStudent.set(studentId, {
      advisorUsed: nets.advisorUsedNet,
      ambassadorUsed: nets.ambassadorUsedNet,
    });
  }

  return profiles.map((p) => {
    const usage = usageByStudent.get(p.id) ?? {
      advisorUsed: 0,
      ambassadorUsed: 0,
    };
    const studentName =
      `${p.first_name?.trim() ?? ""} ${p.last_name?.trim() ?? ""}`.trim() ||
      "Student";
    return {
      studentId: p.id,
      studentName,
      advisorUsed: usage.advisorUsed,
      advisorLimit:
        p.advisor_credit_limit ?? schoolDefaults.defaultAdvisorLimit ?? null,
      ambassadorUsed: usage.ambassadorUsed,
      ambassadorLimit:
        p.ambassador_credit_limit ??
        schoolDefaults.defaultAmbassadorLimit ??
        null,
    };
  });
}
