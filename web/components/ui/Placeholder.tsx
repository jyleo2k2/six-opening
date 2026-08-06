/**
 * 뼈대 단계 자리표시 화면. 각 트랙이 이 자리를 자기 구현으로 갈아끼운다.
 * 실제 구현이 들어가면 이 컴포넌트 사용을 지운다.
 */
export function Placeholder({
  title,
  owner,
  todo,
}: {
  title: string;
  owner: string;
  todo: string[];
}) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="text-xs text-neutral-500">담당 · {owner}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {todo.map((item) => (
          <li key={item} className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
