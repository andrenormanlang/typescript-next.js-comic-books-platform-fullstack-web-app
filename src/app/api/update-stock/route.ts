import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { comicId, newStock } = await request.json();

    const { data, error } = await supabase
      .from('comics-sell')
      .update({ stock: newStock })
      .eq('id', comicId)
      .select();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
