import { NextResponse } from "next/server";

// Indices are static mock data for now — replaced with a real computation
// when the backend has enough history. The frontend imports from mockData
// for index definitions, so this endpoint simply returns empty.
export async function GET() {
  return NextResponse.json([]);
}
