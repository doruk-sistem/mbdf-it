import { Suspense } from "react";
import { AgreementsContent } from "@/components/agreements/agreements-content";
import { AgreementsSkeleton } from "@/components/agreements/agreements-skeleton";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

export default function AgreementsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Sözleşmeler</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sözleşmeler</h1>
        <p className="text-muted-foreground">
          MBDF sözleşmelerini yönetin ve imza süreçlerini takip edin
        </p>
      </div>

      <Suspense fallback={<AgreementsSkeleton />}>
        <AgreementsContent />
      </Suspense>
    </div>
  );
}