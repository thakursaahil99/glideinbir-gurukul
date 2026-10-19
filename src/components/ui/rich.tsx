/** Renders admin text where `**word**` becomes bold. No HTML is ever injected. */
export function Rich({ text, boldClassName = "font-semibold text-fg" }: { text: string; boldClassName?: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <b key={i} className={boldClassName}>
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </>
  );
}
