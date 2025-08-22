import { Suspense } from "react";
import { KKSContent } from "@/components/kks/kks-content";
import { KKSSkeleton } from "@/components/kks/kks-skeleton";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";

export default function KKSPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>KKS Gönderimler</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">KKS Gönderimler</h1>
        <p className="text-muted-foreground">
          KKS'ye gönderilen MBDF verilerini yönetin ve takip edin
        </p>
      </div>

      <Suspense fallback={<KKSSkeleton />}>
        <KKSContent />
      </Suspense>
    </div>
  );
}