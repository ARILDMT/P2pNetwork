import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CalendarEvent } from "./types";

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  type: z.enum(["study", "review", "meeting"]),
  start: z.string(),
  end: z.string(),
  isShared: z.boolean(),
});

type EventModalProps = {
  event: Partial<CalendarEvent> | null;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
};

export function EventModal({ event, onClose, onSave, onDelete }: EventModalProps) {
  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      type: event?.type || "study",
      start: event?.start?.toISOString().slice(0, 16) || "",
      end: event?.end?.toISOString().slice(0, 16) || "",
      isShared: event?.isShared || false,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSave({
      ...event,
      ...data,
      start: new Date(data.start),
      end: new Date(data.end),
    });
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {event?.id ? "Edit Event" : "Create Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...form.register("title")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) => form.setValue("type", value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study">Study</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start">Start</Label>
            <Input
              id="start"
              type="datetime-local"
              {...form.register("start")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end">End</Label>
            <Input
              id="end"
              type="datetime-local"
              {...form.register("end")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isShared"
              checked={form.watch("isShared")}
              onCheckedChange={(checked) => form.setValue("isShared", checked)}
            />
            <Label htmlFor="isShared">Share with peers</Label>
          </div>

          <DialogFooter className="gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
