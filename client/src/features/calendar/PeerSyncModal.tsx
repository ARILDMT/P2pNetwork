import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { User } from "@shared/schema";
import type { SyncRequest } from "./types";
import { apiRequest } from "@/lib/queryClient";

type PeerSyncModalProps = {
  syncedPeers: User[];
  syncRequests: SyncRequest[];
  onClose: () => void;
};

export function PeerSyncModal({
  syncedPeers,
  syncRequests,
  onClose,
}: PeerSyncModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  // Search users mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("GET", `/api/users/search?q=${query}`);
      return res.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
    },
  });

  // Send sync request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", "/api/calendar/sync-requests", {
        toUserId: userId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sync request has been sent.",
      });
    },
  });

  // Handle sync request mutation
  const handleRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "accept" | "reject";
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/calendar/sync-requests/${requestId}`,
        { status: action }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sync request has been processed.",
      });
    },
  });

  // Remove sync mutation
  const removeSyncMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/calendar/sync/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Calendar sync has been removed.",
      });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sync Calendar with Peers</DialogTitle>
        </DialogHeader>

        {/* Search users */}
        <div className="flex gap-2">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => searchMutation.mutate(searchQuery)}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendRequestMutation.mutate(user.id)}
                        disabled={syncedPeers.some((p) => p.id === user.id)}
                      >
                        {syncedPeers.some((p) => p.id === user.id)
                          ? "Already synced"
                          : "Send request"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pending requests */}
        {syncRequests.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.fromUserId}</TableCell>
                    <TableCell>{request.status}</TableCell>
                    <TableCell>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRequestMutation.mutate({
                                requestId: request.id,
                                action: "accept",
                              })
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRequestMutation.mutate({
                                requestId: request.id,
                                action: "reject",
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Synced peers */}
        {syncedPeers.length > 0 && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncedPeers.map((peer) => (
                  <TableRow key={peer.id}>
                    <TableCell>{peer.username}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSyncMutation.mutate(peer.id)}
                      >
                        Remove sync
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
