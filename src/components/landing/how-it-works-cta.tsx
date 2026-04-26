"use client";

export function HowItWorksCta() {
  return (
    <div className="how-cta">
      <button
        type="button"
        className="btn-hero"
        style={{ margin: "0 auto" }}
        onClick={() => {
          window.location.href = "signup.html";
        }}
      >
        Start your journey{" "}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
