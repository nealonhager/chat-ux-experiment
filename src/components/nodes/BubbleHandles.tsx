import { Handle, Position } from "@xyflow/react";

export function BubbleHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="!pointer-events-none !size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="!pointer-events-none !size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0"
      />
    </>
  );
}
