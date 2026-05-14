import { AiUniversityMatching } from "./_components/ai-university-matching";
import { loadAiMatchingProfileDefaults } from "./_lib/load-ai-matching-profile-defaults";

export const dynamic = "force-dynamic";

export default async function StudentAiMatchingPage() {
  const profileDefaults = await loadAiMatchingProfileDefaults();
  return <AiUniversityMatching profileDefaults={profileDefaults} />;
}
