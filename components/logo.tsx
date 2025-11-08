import { Workflow } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
        <Workflow className="w-8 h-8 text-white" />
      </div>
      <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        EduFlow
      </span>
    </div>
  );
}

