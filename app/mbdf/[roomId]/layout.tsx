import { Suspense } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomLayoutProps {
  children: React.ReactNode;
  params: { roomId: string };
}

export default function RoomLayout({ children, params }: RoomLayoutProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Suspense fallback={<Skeleton className="h-6 w-48" />}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>MBDF Odası</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Suspense>

      {children}
    </div>
  );
}