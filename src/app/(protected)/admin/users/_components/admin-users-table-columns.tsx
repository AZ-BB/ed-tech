"use client";

import type { ReactNode } from "react";

import type { AdminUserTableRow } from "../_lib/fetch-admin-users-page";
import type { UsersTabId } from "../_data/users-tabs-data";

export type AdminUsersTableColumn = {
  id: string;
  heading: string;
  align?: "left" | "center";
  cellClassName?: string;
  render: (row: AdminUserTableRow) => ReactNode;
};

function displayName(row: AdminUserTableRow): string {
  const full = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return full || row.email || "User";
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        active
          ? "bg-[#e8f5ee] text-[#2D6A4F]"
          : "bg-[#f3f2f0] text-[#8a8a8a]"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TextCell({
  value,
  title,
  subdued = false,
  maxWidthClass = "max-w-[220px]",
}: {
  value: string;
  title?: string;
  subdued?: boolean;
  maxWidthClass?: string;
}) {
  return (
    <span
      title={title ?? (value !== "—" ? value : undefined)}
      className={`block truncate text-[13px] ${maxWidthClass} ${
        subdued ? "text-[#a0a0a0]" : "text-[#4a4a4a]"
      }`}
    >
      {value}
    </span>
  );
}

const statusColumn: AdminUsersTableColumn = {
  id: "status",
  heading: "Status",
  render: (row) => <StatusBadge active={row.isActive} />,
};

const defaultColumns: AdminUsersTableColumn[] = [
  {
    id: "user",
    heading: "User",
    render: (row) => (
      <>
        <div className="text-[13px] font-semibold text-[#1a1a1a]">{displayName(row)}</div>
        <div className="mt-px text-[11px] text-[#a0a0a0]">{row.email || "—"}</div>
      </>
    ),
  },
  {
    id: "role",
    heading: "Role",
    render: (row) => <TextCell value={row.role} />,
  },
  {
    id: "school",
    heading: "School",
    render: (row) => <TextCell value={row.school} />,
  },
  {
    id: "last-active",
    heading: "Last Active",
    render: (row) => <TextCell value={row.lastActiveLabel} subdued />,
  },
  statusColumn,
  {
    id: "joined",
    heading: "Joined",
    render: (row) => <TextCell value={row.joinedLabel} />,
  },
];

export type AdminUsersTableColumnOptions = {
  hideSchoolColumn?: boolean;
  hideRoleColumn?: boolean;
};

function applyColumnOptions(
  columns: AdminUsersTableColumn[],
  options?: AdminUsersTableColumnOptions,
): AdminUsersTableColumn[] {
  if (!options?.hideSchoolColumn && !options?.hideRoleColumn) return columns;

  return columns.filter((column) => {
    if (options.hideRoleColumn && column.id === "role") return false;
    if (options.hideSchoolColumn && column.id === "school") return false;
    return true;
  });
}

export function getAdminUsersTableColumns(
  tabId: UsersTabId,
  renderActions: (row: AdminUserTableRow) => ReactNode,
  options?: AdminUsersTableColumnOptions,
): AdminUsersTableColumn[] {
  if (tabId === "advisors") {
    return [
      defaultColumns[0]!,
      {
        id: "title",
        heading: "Title",
        render: (row) => (
          <TextCell value={row.advisorDetail?.title ?? "—"} title={row.advisorDetail?.title} />
        ),
      },
      {
        id: "countries",
        heading: "Countries",
        render: (row) => (
          <TextCell
            value={row.advisorDetail?.specializations ?? "—"}
            title={row.advisorDetail?.specializations}
          />
        ),
      },
      {
        id: "experience",
        heading: "Experience",
        render: (row) => <TextCell value={row.advisorDetail?.experienceYears ?? "—"} />,
      },
      {
        id: "languages",
        heading: "Languages",
        render: (row) => (
          <TextCell
            value={row.advisorDetail?.languages ?? "—"}
            title={row.advisorDetail?.languages}
          />
        ),
      },
      {
        id: "tags",
        heading: "Tags",
        render: (row) => (
          <TextCell value={row.advisorDetail?.tags ?? "—"} title={row.advisorDetail?.tags} />
        ),
      },
      {
        id: "status",
        heading: "Status",
        render: (row) => <StatusBadge active={row.isActive} />,
      },
      {
        id: "joined",
        heading: "Joined",
        render: (row) => <TextCell value={row.joinedLabel} />,
      },
      {
        id: "actions",
        heading: "Actions",
        align: "center",
        render: renderActions,
      },
    ];
  }

  if (tabId === "ambassadors") {
    return [
      defaultColumns[0]!,
      {
        id: "university",
        heading: "University",
        render: (row) => (
          <TextCell
            value={row.ambassadorDetail?.university ?? "—"}
            title={row.ambassadorDetail?.university}
          />
        ),
      },
      {
        id: "major",
        heading: "Major",
        render: (row) => (
          <TextCell
            value={row.ambassadorDetail?.major ?? "—"}
            title={row.ambassadorDetail?.major}
            maxWidthClass="max-w-[100px]"
          />
        ),
      },
      {
        id: "destination",
        heading: "Destination",
        render: (row) => (
          <TextCell
            value={row.ambassadorDetail?.destination ?? "—"}
            title={row.ambassadorDetail?.destination}
          />
        ),
      },
      {
        id: "student-status",
        heading: "Student",
        render: (row) => (
          <TextCell value={row.ambassadorDetail?.studentStatus ?? "—"} />
        ),
      },
      {
        id: "status",
        heading: "Status",
        render: (row) => <StatusBadge active={row.isActive} />,
      },
      {
        id: "joined",
        heading: "Joined",
        render: (row) => <TextCell value={row.joinedLabel} />,
      },
      {
        id: "actions",
        heading: "Actions",
        align: "center",
        render: renderActions,
      },
    ];
  }

  if (tabId === "students") {
    const teacherColumn: AdminUsersTableColumn = {
      id: "teacher",
      heading: "Teacher",
      render: (row) => {
        const name = row.teacherName?.trim();
        if (!name) {
          return (
            <span className="inline-flex rounded-full bg-[#FCEBEB] px-2.5 py-0.5 text-[10px] font-semibold text-[#E74C3C]">
              Unassigned
            </span>
          );
        }
        return <TextCell value={name} />;
      },
    };

    const base = [
      defaultColumns[0]!,
      ...defaultColumns.slice(1, 3),
      teacherColumn,
      ...defaultColumns.slice(3),
      {
        id: "actions",
        heading: "Actions",
        align: "center" as const,
        render: renderActions,
      },
    ];

    return applyColumnOptions(base, options);
  }

  if (tabId === "teachers") {
    return applyColumnOptions(
      [
        defaultColumns[0]!,
        ...defaultColumns.slice(1),
        {
          id: "actions",
          heading: "Actions",
          align: "center",
          render: renderActions,
        },
      ],
      options,
    );
  }

  if (tabId === "admins") {
    return [
      defaultColumns[0]!,
      ...defaultColumns.slice(1),
      {
        id: "actions",
        heading: "Actions",
        align: "center",
        render: renderActions,
      },
    ];
  }

  return [
    ...defaultColumns,
    {
      id: "actions",
      heading: "Actions",
      align: "center",
      render: renderActions,
    },
  ];
}
