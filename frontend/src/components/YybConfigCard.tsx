interface YybConfigCardProps {
  onClick: () => void;
}

export function YybConfigCard({ onClick }: YybConfigCardProps) {
  return (
    <div className="rounded-2xl border-2 border-[#D68A8A]/60 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <AppStoreIcon />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-800">应用宝配置</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            配置应用宝一键登录的 API Token 和 OpenID，实现自动获取登录 Code
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="rounded-full bg-[#4A90E2] px-5 py-2 text-sm font-medium text-white shadow-md shadow-blue-200 transition-colors hover:bg-[#3A80D2]"
        >
          配置应用宝
        </button>
      </div>
    </div>
  );
}

function AppStoreIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#4A90E2" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="#50C878" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="#F5A623" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#D0021B" />
    </svg>
  );
}
