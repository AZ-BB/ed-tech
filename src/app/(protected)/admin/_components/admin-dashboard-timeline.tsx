import Link from "next/link";

import type {
  AdminDashboardActivityItem,
  AdminDashboardAttentionItem,
} from "../_lib/fetch-admin-dashboard";

type Tone = "green" | "blue" | "orange" | "red";

function toneClass(tone: Tone) {
  if (tone === "green") return "bg-[#52B788]";
  if (tone === "blue") return "bg-[#3498DB]";
  if (tone === "orange") return "bg-[#E67E22]";
  return "bg-[#E74C3C]";
}

export function AdminDashboardTimeline({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: AdminDashboardActivityItem[] | AdminDashboardAttentionItem[];
  emptyLabel: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 text-[15px] font-semibold tracking-[-0.01em] text-[#1a1a1a]">{title}</div>
      <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-[#ece9e4] bg-white px-5 py-4">
        {items.length === 0 ? (
          <div className="text-[12px] text-[#8a8a8a]">{emptyLabel}</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isAttention = "href" in item;
              return (
                <div key={item.id} className="flex gap-3 border-b border-[#ece9e4] pb-3 last:border-b-0 last:pb-0">
                  <div className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${toneClass(item.tone)}`} />
                  <div className="min-w-0">
                    {isAttention ? (
                      <Link href={item.href} className="text-[12px] leading-[1.4] text-[#4a4a4a] hover:text-[#2D6A4F]">
                        {item.text}
                      </Link>
                    ) : (
                      <div className="text-[12px] leading-[1.4] text-[#4a4a4a]">{item.text}</div>
                    )}
                    <div className="mt-0.5 text-[10px] text-[#a0a0a0]">
                      {isAttention ? item.hint : item.timeLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
