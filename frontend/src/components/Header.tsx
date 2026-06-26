import { Menu } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-[#F7F3E8] px-4 py-3">
      <div className="flex items-center gap-2">
        <WheatIcon />
        <h1 className="text-lg font-bold text-[#5D4E37]">QQ农场智能助手</h1>
      </div>
      <button
        type="button"
        className="rounded-full p-2 text-[#5D4E37] transition-colors hover:bg-[#EDE8DA]"
        aria-label="菜单"
      >
        <Menu size={22} />
      </button>
    </header>
  );
}

function WheatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C12 2 10 5 10 8C10 10.5 11.5 12 12 12C12.5 12 14 10.5 14 8C14 5 12 2 12 2Z"
        fill="#E6A23C"
      />
      <path
        d="M12 12V22"
        stroke="#8B6914"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 14C9 14 7 16 7 19"
        stroke="#8B6914"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16C15 16 17 18 17 21"
        stroke="#8B6914"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="8" cy="10" rx="2" ry="3" fill="#E6A23C" />
      <ellipse cx="16" cy="10" rx="2" ry="3" fill="#E6A23C" />
      <ellipse cx="7" cy="15" rx="2" ry="3" fill="#E6A23C" />
      <ellipse cx="17" cy="15" rx="2" ry="3" fill="#E6A23C" />
    </svg>
  );
}
