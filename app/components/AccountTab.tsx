"use client";

import ViewerInvitePanel from "./ViewerInvitePanel";

interface Props {
  isViewer?: boolean;
}

export default function AccountTab({ isViewer }: Props) {
  return (
    <div className="space-y-6">
      {!isViewer && <ViewerInvitePanel />}
      {isViewer && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-sm text-gray-500">
          閲覧モードではアカウント管理は利用できません。
        </div>
      )}
    </div>
  );
}
