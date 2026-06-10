"use client";

export default function UnpublishButton({ testId }: { testId: string }) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetch(`/api/admin/tests/${testId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unpublish" }),
    }).then(() => window.location.reload());
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" className="text-xs text-red-600 hover:underline">
        Unpublish
      </button>
    </form>
  );
}
