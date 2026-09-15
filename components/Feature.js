export default function Feature({ number, title, text }) {
  return (
    <article>
      <p className="font-mono text-sm text-[#2775a6]">{number}</p>
      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-sm leading-7 text-[#647b8f]">{text}</p>
    </article>
  );
}
