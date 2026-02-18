import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
    const tag = request.nextUrl.searchParams.get('tag');
    const secret = request.nextUrl.searchParams.get('secret');

    // Simple protection: check if secret matches Service Role Key (reusing it for convenience in this context)
    // or a dedicated REVALIDATION_SECRET if you prefer.
    if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    if (!tag) {
        return NextResponse.json({ message: 'Missing tag param' }, { status: 400 });
    }

    // Next.js 16 requires a profile argument
    // @ts-ignore - Ignoring type check if it complains, but runtime seems to want 2 args based on admin.ts
    revalidateTag(tag, 'default');

    return NextResponse.json({ revalidated: true, now: Date.now() });
}
