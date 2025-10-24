import { NextResponse } from "next/server";
import { TicketsOkSchema } from "@/lib/tickets/types";

export async function GET() {
  try {
    const data = [
      { id: 1, ticket_source: "web", site_id: 10, site_name: "Main" },
      { id: 2, ticket_source: "mobile", site_id: 12, site_name: "Branch" },
    ];
    const count = data.length;

    const parsed = TicketsOkSchema.parse({ data, count });
    return NextResponse.json(parsed, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: true, message: err?.message ?? "Unexpected error" },
      { status: 400 }
    );
  }
}
