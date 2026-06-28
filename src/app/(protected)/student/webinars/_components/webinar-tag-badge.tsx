/** Matches `.tag` / `.featured-tags` / `.wb-tags` from webinars page.html */
export const webinarTagClassName =
  "inline-block rounded-[50px] bg-[var(--green-pale)] px-[10px] py-1 text-[11px] font-semibold leading-none text-[var(--green-dark)]";

export const webinarTagsWrapClassName = "flex flex-wrap gap-[6px]";

type WebinarTagsProps = {
  tags: string[];
  className?: string;
};

export function WebinarTagBadge({ children }: { children: React.ReactNode }) {
  return <span className={webinarTagClassName}>{children}</span>;
}

export function WebinarTags({ tags, className }: WebinarTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className={className ? `${webinarTagsWrapClassName} ${className}` : webinarTagsWrapClassName}>
      {tags.map((tag) => (
        <WebinarTagBadge key={tag}>{tag}</WebinarTagBadge>
      ))}
    </div>
  );
}
