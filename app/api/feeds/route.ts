import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const { feedUrl, selectedIds, customLabelValue } = await req.json();

    if (!feedUrl || !selectedIds || !Array.isArray(selectedIds)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let existingFeeds: any = await kv.get('all_feeds');
    if (!existingFeeds) existingFeeds = {};

    const isDuplicate = Object.values(existingFeeds).some((f: any) => f.customLabelValue === customLabelValue);
    if (isDuplicate) {
      return NextResponse.json({ error: `"${customLabelValue}" adına sahip bir etiket zaten var. Lütfen farklı bir isim seçin.` }, { status: 400 });
    }

    const id = uuidv4();
    existingFeeds[id] = {
      feedUrl,
      selectedIds,
      customLabelValue,
      createdAt: new Date().toISOString()
    };
    
    await kv.set('all_feeds', existingFeeds);

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    
    return NextResponse.json({
      success: true,
      feedId: id,
      liveUrl: `${protocol}://${host}/api/liveFeed?id=${id}`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    let existingFeeds: any = await kv.get('all_feeds');
    if (!existingFeeds) existingFeeds = {};

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');

    const list = Object.keys(existingFeeds).map(id => ({
      id,
      feedUrl: existingFeeds[id].feedUrl,
      selectedCount: existingFeeds[id].selectedIds ? existingFeeds[id].selectedIds.length : 0,
      customLabelValue: existingFeeds[id].customLabelValue,
      createdAt: existingFeeds[id].createdAt,
      liveUrl: `${protocol}://${host}/api/liveFeed?id=${id}`
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
