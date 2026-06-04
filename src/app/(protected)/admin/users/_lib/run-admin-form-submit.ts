type AdminFormActionResult = { ok: boolean; error?: string };

type RunAdminFormSubmitOptions = {
  setSubmitting: (value: boolean) => void;
  setError: (value: string | null) => void;
  onBeforeSubmit?: () => void;
};

export async function runAdminFormSubmit(
  { setSubmitting, setError, onBeforeSubmit }: RunAdminFormSubmitOptions,
  action: () => Promise<AdminFormActionResult>,
  onSuccess: () => void,
): Promise<void> {
  setSubmitting(true);
  onBeforeSubmit?.();
  setError(null);

  try {
    const result = await action();
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    onSuccess();
  } catch (error) {
    console.error("[admin form submit]", error);
    setError(error instanceof Error ? error.message : "Something went wrong.");
  } finally {
    setSubmitting(false);
  }
}
