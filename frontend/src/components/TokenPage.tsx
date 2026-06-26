import { useAppStore } from '@/store';
import { CodeBlock } from './CodeBlock';

export function TokenPage() {
  const { tokens, removeToken } = useAppStore();

  const requestBody = JSON.stringify({ openid: 'your-openid' }, null, 2);
  const curlExample = `curl -X POST \\
  "http://211.154.25.123:28999/api/open/v1/farm/code" \\
  -H "Authorization: Bearer <api-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"openid":"your-openid"}'`;

  return (
    <div className="space-y-4 px-4 pb-6 pt-2">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#2D2A5A]">已生成 Token</h2>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">名称</th>
                <th className="px-3 py-2.5 font-medium">token</th>
                <th className="px-3 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-3 text-gray-700">{item.name}</td>
                  <td className="px-3 py-3 text-gray-700">{item.token}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => removeToken(item.id)}
                      className="rounded-full bg-[#E86C6C] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#D85C5C]"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-xs text-gray-400">
                    暂无 Token
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#2D2A5A]">对接说明</h2>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="w-20 bg-gray-50 px-3 py-3 text-center text-xs font-medium text-gray-500">
                  接口地址
                </td>
                <td className="px-3 py-3">
                  <a
                    href="http://211.154.25.123:28999/api/open/v1/farm/code"
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-[#4A90E2] underline"
                  >
                    http://211.154.25.123:28999/api/open/v1/farm/code
                  </a>
                </td>
                <td className="w-16 bg-gray-50 px-2 py-3 text-center text-xs font-medium text-gray-500">
                  鉴权方式
                </td>
                <td className="px-3 py-3 text-gray-700">
                  Authorization: Bearer &lt;api-token&gt;
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="bg-gray-50 px-3 py-3 text-center text-xs font-medium text-gray-500">
                  支持功能
                </td>
                <td className="px-3 py-3 text-gray-700">QQ 经典农场固定 AppID Code</td>
                <td className="bg-gray-50 px-2 py-3 text-center text-xs font-medium text-gray-500">
                  不支持
                </td>
                <td className="px-3 py-3 text-gray-700">任意 AppID Code / 云函数</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">请求体示例</p>
          <CodeBlock code={requestBody} />
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500">curl 示例</p>
          <CodeBlock code={curlExample} />
        </div>
      </div>
    </div>
  );
}
