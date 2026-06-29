import type { StudentWebinarCard } from "../_lib/fetch-student-webinars";
import { AVATAR_GRADIENTS, fontSerif } from "./webinar-constants";

export function WebinarSpeakerAvatar({
  webinar,
  size,
}: {
  webinar: StudentWebinarCard;
  size: "featured" | "card";
}) {
  const featuredClasses = `h-[54px] w-[54px] ${fontSerif} text-[20px] tracking-[-0.5px]`;
  const cardClasses = `h-[42px] w-[42px] ${fontSerif} text-[15px]`;

  if (webinar.speakerImageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={webinar.speakerImageUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${size === "featured" ? featuredClasses : cardClasses}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${size === "featured" ? featuredClasses : cardClasses}`}
      style={{ background: AVATAR_GRADIENTS[webinar.avatarColorClass] }}
    >
      {webinar.speakerInitials}
    </div>
  );
}
