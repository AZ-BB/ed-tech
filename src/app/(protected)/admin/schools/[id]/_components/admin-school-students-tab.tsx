import { AdminUsersTableLoader } from "@/app/(protected)/admin/users/_components/admin-users-table-loader";

import { AdminSchoolUsersTabActions } from "./admin-school-users-tab-actions";

export type AdminSchoolStudentsTabProps = {
  schoolId: string;
  schoolName: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function AdminSchoolStudentsTab({
  schoolId,
  schoolName,
  searchParams,
}: AdminSchoolStudentsTabProps) {
  return (
    <>
      <AdminSchoolUsersTabActions
        tabId="students"
        schoolId={schoolId}
        schoolName={schoolName}
      />
      <AdminUsersTableLoader
        tabId="students"
        searchParams={searchParams}
        scopedSchoolId={schoolId}
        embedMode
        embedTabParam="students"
      />
    </>
  );
}
