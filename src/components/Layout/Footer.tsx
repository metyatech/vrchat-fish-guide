import React from 'react';
import { AdSlot } from '@/components/AdSlot';

export function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 mt-12">
      {/* Footer ad slot */}
      <div className="flex justify-center py-3 border-b border-gray-700">
        <AdSlot position="footer" size="leaderboard" showPlaceholder={false} />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <h3 className="text-white font-semibold mb-2">VRChat Fish! ガイド</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              このサイトはコミュニティ非公式の攻略情報サイトです。ゲーム開発者・運営とは無関係です。
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">免責事項</h3>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• 掲載データには公開コミュニティ情報に基づく推定値を含みます</li>
              <li>• ゲームアップデートにより情報が古くなる場合があります</li>
              <li>• 計算結果は参考値であり実際の結果を保証しません</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">広告について</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              将来的にサイト維持のための広告を掲載する予定があります。広告は明示的に「広告」と表示され、コンテンツと明確に区別されます。
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-6 pt-4 text-center text-xs text-gray-500">
          © 2026 VRChat Fish! ガイド — コミュニティ非公式サイト
        </div>
      </div>
    </footer>
  );
}

export default Footer;
