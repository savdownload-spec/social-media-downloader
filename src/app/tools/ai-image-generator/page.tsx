import ToolPage, { generateMetadata as generateToolMetadata } from '../[slug]/page';

export const dynamic = 'force-dynamic';
const params = { slug: 'ai-image-generator' };

export async function generateMetadata() {
  return generateToolMetadata({ params });
}

export default function AIImageGeneratorPage() {
  return ToolPage({ params });
}
