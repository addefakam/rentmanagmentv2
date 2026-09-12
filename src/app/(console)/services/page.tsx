"use client";

import { ModuleFrame, PageHead } from "@/components/platform/shell";
import { ServicesAdmin } from "@/components/platform/panels-services";

export default function Page() {
  return (
    <ModuleFrame
      route="/services"
      render={() => (
        <>
          <PageHead
            title="Service Catalog"
            subtitle="This tenant's own public services — name, documents, processing time, workflow, SLA, fee and visibility. Nothing is hardcoded; the catalog is data."
          />
          <ServicesAdmin />
        </>
      )}
    />
  );
}
