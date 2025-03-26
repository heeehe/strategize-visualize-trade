
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <h1 className="text-6xl font-bold mb-4 opacity-20">404</h1>
          <h2 className="text-2xl font-medium mb-2">Page not found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button className="px-8">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
