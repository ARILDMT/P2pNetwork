import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { CalendarState, CalendarView, CalendarEvent } from "./types";
import { PeerSyncModal } from "./PeerSyncModal";
import { EventModal } from "./EventModal";
import { apiRequest } from "@/lib/queryClient";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const EVENT_COLORS = {
  study: "bg-blue-500",
  review: "bg-green-500",
  meeting: "bg-purple-500",
};

export function Calendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Fetch calendar data
  const { data: calendarState } = useQuery<CalendarState>({
    queryKey: ["/api/calendar"],
  });

  // Create/Update event mutation
  const eventMutation = useMutation({
    mutationFn: async (event: Partial<CalendarEvent>) => {
      const res = await apiRequest(
        event.id ? "PATCH" : "POST",
        `/api/calendar/events${event.id ? `/${event.id}` : ''}`,
        event
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event has been saved.",
      });
      setShowEventModal(false);
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event has been deleted.",
      });
    },
  });

  // Generate week view
  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate), i)
  );

  // Handle time slot click
  const handleTimeSlotClick = (hour: number, date: Date) => {
    setSelectedEvent({
      id: "",
      title: "",
      description: "",
      type: "study",
      start: new Date(date.setHours(hour)),
      end: new Date(date.setHours(hour + 1)),
      userId: user!.id,
      isShared: false,
    });
    setShowEventModal(true);
  };

  // Render event in grid
  const renderEvent = (event: CalendarEvent) => (
    <div
      key={event.id}
      className={`absolute w-full p-1 rounded ${EVENT_COLORS[event.type]} text-white text-sm cursor-pointer`}
      style={{
        top: `${(event.start.getHours() * 60 + event.start.getMinutes()) / 15}%`,
        height: `${(event.end.getHours() * 60 + event.end.getMinutes() - 
                   (event.start.getHours() * 60 + event.start.getMinutes())) / 15}%`,
      }}
      onClick={() => {
        setSelectedEvent(event);
        setShowEventModal(true);
      }}
    >
      {event.title}
      {event.sharedWith?.length > 0 && (
        <Users className="h-3 w-3 inline ml-1" />
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant={view === "week" ? "default" : "outline"}
            onClick={() => setView("week")}
          >
            Week
          </Button>
          <Button
            variant={view === "day" ? "default" : "outline"}
            onClick={() => setView("day")}
          >
            Day
          </Button>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowSyncModal(true)}
        >
          <Users className="h-4 w-4" />
          Sync with Peer
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-1 overflow-auto">
        {/* Time labels */}
        <div className="w-16 flex-shrink-0 bg-muted/5">
          {HOURS.map((hour) => (
            <div key={hour} className="h-20 border-b text-xs text-muted-foreground p-1">
              {format(new Date().setHours(hour), "ha")}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="flex-1 flex">
          {(view === "week" ? weekDays : [selectedDate]).map((date) => (
            <div key={date.toISOString()} className="flex-1 relative">
              {/* Day header */}
              <div className="h-10 border-b text-sm font-medium p-2 sticky top-0 bg-background">
                {format(date, "EEE MMM d")}
              </div>

              {/* Time slots */}
              <div className="relative">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-20 border-b border-r hover:bg-muted/5 cursor-pointer"
                    onClick={() => handleTimeSlotClick(hour, date)}
                  />
                ))}

                {/* Events */}
                {calendarState?.events
                  .filter((event) => isSameDay(event.start, date))
                  .map(renderEvent)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onSave={(event) => eventMutation.mutate(event)}
          onDelete={selectedEvent?.id ? 
            () => deleteEventMutation.mutate(selectedEvent.id) : 
            undefined
          }
        />
      )}

      {showSyncModal && (
        <PeerSyncModal
          syncedPeers={calendarState?.syncedPeers || []}
          syncRequests={calendarState?.syncRequests || []}
          onClose={() => setShowSyncModal(false)}
        />
      )}
    </div>
  );
}
