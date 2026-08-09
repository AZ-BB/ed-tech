export function formatStudentTypeLabel(
  studentType: string | null | undefined,
): string {
  switch (studentType) {
    case "school":
      return "School";
    case "individual":
      return "Individual";
    case "funnel":
      return "Funnel";
    case "custom":
      return "Custom";
    default:
      return "Unknown";
  }
}
