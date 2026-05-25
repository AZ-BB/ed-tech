import { AdminUsersTableLoader } from "@/app/(protected)/admin/users/_components/admin-users-table-loader";

import { AdminSchoolUsersTabActions } from "./admin-school-users-tab-actions";

export type AdminSchoolTeachersTabProps = {
  schoolId: string;
  schoolName: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function AdminSchoolTeachersTab({
  schoolId,
  schoolName,
  searchParams,
}: AdminSchoolTeachersTabProps) {
  return (
    <>
      <AdminSchoolUsersTabActions
        tabId="teachers"
        schoolId={schoolId}
        schoolName={schoolName}
      />
      <AdminUsersTableLoader
        tabId="teachers"
        searchParams={searchParams}
        scopedSchoolId={schoolId}
        embedMode
        embedTabParam="teachers"
      />
    </>
  );
}
