"use client";

import Link from "next/link";
import styles from "./discovery-journey.module.css";

export const STUDENT_OPEN_SIDEBAR_EVENT = "student-open-sidebar";

export function DiscoveryTopBar({
  title,
  avatarInitials,
  menuAriaLabel,
}: {
  title: string;
  avatarInitials?: string;
  menuAriaLabel: string;
}) {
  return (
    <div className={styles.topBar}>
      <div className={styles.tbLeft}>
        <div className={styles.tbIcon} aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 6.5L22 9l-5 4.9L18.2 21 12 17.3 5.8 21 7 13.9 2 9l7-0.5z" />
          </svg>
        </div>
        <div className={styles.topBarTitle}>{title}</div>
      </div>
      <div className={styles.tbRight}>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label={menuAriaLabel}
          onClick={() => window.dispatchEvent(new CustomEvent(STUDENT_OPEN_SIDEBAR_EVENT))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {avatarInitials ? (
          <div className={styles.tbAvatar} aria-hidden>
            {avatarInitials}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DiscoveryTestHeader({
  backLabel,
  backHref = "/student/discovery-journey",
  title,
}: {
  backLabel: string;
  backHref?: string;
  title?: string;
}) {
  return (
    <div className={styles.testHeader}>
      <Link href={backHref} className={styles.testBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {backLabel}
      </Link>
      {title ? <div className={styles.testHeaderTitle}>{title}</div> : null}
    </div>
  );
}
