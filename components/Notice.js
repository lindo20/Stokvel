export default function Notice({ title, message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-6 text-[#102a43]">
      <section className="max-w-lg rounded-2xl border border-[#1f5f8b]/20 bg-[#e8f0f6] p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-[#526b80]">{message}</p>
      </section>
    </main>
  );
}
