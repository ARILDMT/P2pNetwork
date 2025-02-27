import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Submission } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions/user"],
  });

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{user?.username}</h3>
              <p className="text-sm text-muted-foreground">{user?.bio || "No bio set"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions?.length === 0 ? (
              <p className="text-muted-foreground">No submissions yet</p>
            ) : (
              <ul className="space-y-4">
                {submissions?.map((submission) => (
                  <li key={submission.id} className="border-b pb-4">
                    <p className="font-medium">Assignment #{submission.assignmentId}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {submission.status}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
