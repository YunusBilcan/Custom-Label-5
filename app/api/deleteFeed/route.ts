import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'No feed ID provided' }, { status: 400 });
    }

    let existingFeeds: any = await kv.get('all_feeds');
    if (!existingFeeds || !existingFeeds[id]) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    delete existingFeeds[id];
    await kv.set('all_feeds', existingFeeds);

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
