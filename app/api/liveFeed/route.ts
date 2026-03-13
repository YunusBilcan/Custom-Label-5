import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const escapeXML = (unsafe: string) => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return new NextResponse('No feed ID provided', { status: 400 });
    }

    let existingFeeds: any = await kv.get('all_feeds');
    
    if (typeof existingFeeds === 'string') {
        try { existingFeeds = JSON.parse(existingFeeds); } catch(e){}
    }
    
    const feedConfig = existingFeeds ? existingFeeds[id] : null;

    if (!feedConfig) {
      return new NextResponse('Feed not found', { status: 404 });
    }

    const { feedUrl, selectedIds, customLabelValue } = feedConfig;
    
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`HTTP error source feed: ${response.status}`);
    
    const xmlText = await response.text();
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
    
    const modifiedXml = xmlText.replace(itemRegex, (match) => {
        const idMatch = match.match(/<(?:g:)?id>(.*?)<\/(?:g:)?id>/);
        let itemId = idMatch ? idMatch[1].trim() : null;
        
        if (itemId) {
            itemId = itemId.replace(/^<!\[CDATA\[(.*?)]]>$/, '$1').trim();
        }
        
        if (itemId && selectedIds.includes(itemId)) {
            const outOfStockPattern = /<(?:g:)?availability>\s*(?:<!\[CDATA\[\s*)?out\s*of\s*stock(?:\s*]]>)?\s*<\/(?:g:)?availability>/i;
            const zeroQuantityPattern = /<(?:g:)?quantity>\s*(?:<!\[CDATA\[\s*)?0(?:\s*]]>)?\s*<\/(?:g:)?quantity>/i;
            const zeroStockPattern = /<(?:g:)?stock>\s*(?:<!\[CDATA\[\s*)?0(?:\s*]]>)?\s*<\/(?:g:)?stock>/i;
            
            if (outOfStockPattern.test(match) || zeroQuantityPattern.test(match) || zeroStockPattern.test(match)) {
                return '';
            }

            const customLabelSafe = escapeXML(customLabelValue);
            const customLabelTag = `<g:custom_label_0>${customLabelSafe}</g:custom_label_0>`;
            
            let newItem = match;
            if (/<g:custom_label_0>[\s\S]*?<\/g:custom_label_0>/.test(newItem)) {
                newItem = newItem.replace(/<g:custom_label_0>[\s\S]*?<\/g:custom_label_0>/, customLabelTag);
            } else {
                newItem = newItem.replace(/<\/item>/, `    ${customLabelTag}\n</item>`);
            }
            return newItem;
        }
        return '';
    });
    
    return new NextResponse(modifiedXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      }
    });

  } catch (error: any) {
    return new NextResponse(`Error processing feed: ${error.message}`, { status: 500 });
  }
}
