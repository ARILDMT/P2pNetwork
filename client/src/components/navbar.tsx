import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { GraduationCap } from "lucide-react";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) return null;

  return (
    <nav className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Button
              variant="link"
              className="text-primary-foreground font-bold text-lg flex items-center gap-2"
              onClick={() => setLocation("/")}
            >
              <GraduationCap />
              P2P Learning
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant={location === "/" ? "secondary" : "link"}
                className="text-primary-foreground"
                onClick={() => setLocation("/")}
              >
                Assignments
              </Button>
              <Button
                variant={location === "/dashboard" ? "secondary" : "link"}
                className="text-primary-foreground"
                onClick={() => setLocation("/dashboard")}
              >
                Dashboard
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span>{user.username}</span>
            <Button
              variant="secondary"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
