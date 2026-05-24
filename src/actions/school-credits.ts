"use server";

import type { GeneralResponse } from "@/utils/response";

export async function updateSchoolDefaultCreditLimitsAction(
  _prev: GeneralResponse<null> | null,
  _formData: FormData,
): Promise<GeneralResponse<null>> {
  return {
    data: null,
    error: "School default credits can only be changed by platform administrators.",
  };
}
