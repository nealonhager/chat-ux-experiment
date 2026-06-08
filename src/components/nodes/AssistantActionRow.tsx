import { RefreshCw } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useConversationFlow } from "@/components/useConversationFlow";
import {
  CHAT_MODEL_ITEMS,
  CHAT_MODELS,
  type ChatModelId,
} from "@/lib/chatModels";
import { cn } from "@/lib/utils";

type AssistantActionRowProps = {
  messageId: string;
  showTopBorder?: boolean;
};

export function AssistantActionRow({
  messageId,
  showTopBorder = true,
}: AssistantActionRowProps) {
  const { regenerate } = useConversationFlow();

  if (!regenerate) {
    return null;
  }

  const regenerateProps = regenerate;

  function stopEventPropagation(event: React.SyntheticEvent): void {
    event.stopPropagation();
  }

  function handleModelChange(nextModel: string | null): void {
    if (nextModel && CHAT_MODELS.some((entry) => entry.id === nextModel)) {
      regenerateProps.onModelChange(nextModel as ChatModelId);
    }
  }

  function handleRegenerate(): void {
    if (regenerateProps.disabled) {
      return;
    }

    regenerateProps.onRegenerate(messageId);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 pt-2",
        showTopBorder && "border-t border-black/10"
      )}
      onPointerDown={stopEventPropagation}
      onClick={stopEventPropagation}
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-gray-600 hover:text-gray-900"
        disabled={regenerateProps.disabled}
        onClick={handleRegenerate}
      >
        <RefreshCw />
        Regenerate
      </Button>

      <Select
        items={CHAT_MODEL_ITEMS}
        value={regenerateProps.model}
        onValueChange={handleModelChange}
        disabled={regenerateProps.disabled}
      >
        <SelectTrigger
          size="sm"
          className="h-7 min-w-[7.5rem] max-w-full cursor-pointer border-gray-300/70 bg-white text-[11px] text-muted-foreground"
          aria-label="Chat model"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          side="bottom"
          align="end"
          alignItemWithTrigger={false}
          className="max-h-72 w-max min-w-[12rem]"
        >
          {CHAT_MODELS.map((entry) => (
            <SelectItem key={entry.id} value={entry.id}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
