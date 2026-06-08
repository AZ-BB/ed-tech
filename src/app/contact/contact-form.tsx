"use client";

import { submitContactForm } from "@/actions/contact";
import { useRef, useState, useTransition } from "react";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitContactForm(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      setToastOpen(true);
      window.setTimeout(() => setToastOpen(false), 3200);
    });
  }

  return (
    <>
      <form ref={formRef} className="form-card" onSubmit={handleSubmit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="contact-name">Full name</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              required
              disabled={isPending}
            />
          </div>
          <div className="form-field">
            <label htmlFor="contact-email">Email address</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              required
              disabled={isPending}
            />
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="contact-subject">
            Subject <span className="opt">(optional)</span>
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            placeholder="What is this about?"
            disabled={isPending}
          />
        </div>
        <div className="form-field">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            placeholder="Tell us how we can help..."
            required
            disabled={isPending}
          />
        </div>
        <button type="submit" className="btn-submit" disabled={isPending}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          {isPending ? "Sending…" : "Send message"}
        </button>
      </form>

      <div
        className={`toast${toastOpen ? " show" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>Message sent! We&apos;ll be in touch soon.</span>
      </div>
    </>
  );
}
